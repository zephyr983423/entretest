import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  WorkOrderStatus,
  Action,
  canTransition,
  canPerformAction,
  canEditField,
  getAvailableActions,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  VerifyActionInput,
  RecordDeviceInput,
  DiagnoseInput,
  RepairInput,
  StoreInInput,
  ShipInput,
  CloseAbnormalInput,
  ReopenInput,
  CustomerConfirmInput,
  ReportExternalDamageInput,
  WorkOrderQueryInput,
  InventoryTxnType,
} from '@repo/shared';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

@Injectable()
export class WorkOrdersService {
  constructor(private prisma: PrismaService) {}

  private async getWorkOrderWithAccess(id: string, user: CurrentUser) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        device: true,
        inspections: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        repairs: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        inventoryTxn: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { occurredAt: 'desc' },
        },
        attachments: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        events: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        confirmToken: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Access control
    if (user.role === Role.CUSTOMER && workOrder.customerUserId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return workOrder;
  }

  async findAll(user: CurrentUser, query: WorkOrderQueryInput) {
    const { status, q, page, pageSize } = query;

    const where: any = {};

    // Role-based filtering
    if (user.role === Role.CUSTOMER) {
      where.customerUserId = user.id;
    }
    // OWNER and STAFF see all

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { orderNo: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { inboundTrackingNo: { contains: q, mode: 'insensitive' } },
        { outboundTrackingNo: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true } },
          device: { select: { id: true, brand: true, model: true, labelCode: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string, user: CurrentUser) {
    const workOrder = await this.getWorkOrderWithAccess(id, user);

    const availableActions = getAvailableActions(
      workOrder.status as WorkOrderStatus,
      user.role as Role,
      workOrder,
      user.id,
    );

    return {
      ...workOrder,
      availableActions,
    };
  }

  async create(user: CurrentUser, input: CreateWorkOrderInput) {
    let customerUserId = input.customerUserId;

    // If customer creates, customerUserId is self
    if (user.role === Role.CUSTOMER) {
      customerUserId = user.id;
    }

    // OWNER/STAFF must specify customerUserId
    if (!customerUserId && (user.role === Role.OWNER || user.role === Role.STAFF)) {
      throw new BadRequestException('customerUserId is required');
    }

    // Verify customer exists and is a CUSTOMER
    const customer = await this.prisma.user.findUnique({
      where: { id: customerUserId },
    });

    if (!customer || customer.role !== Role.CUSTOMER) {
      throw new BadRequestException('Invalid customer user');
    }

    const workOrder = await this.prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          orderNo: input.orderNo,
          status: WorkOrderStatus.SUBMITTED,
          customerUserId: customerUserId!,
          customerName: input.customerName || customer.name,
          customerPhone: input.customerPhone,
          customerAddress: input.customerAddress,
          notes: input.notes,
        },
      });

      await tx.workOrderEvent.create({
        data: {
          workOrderId: wo.id,
          fromStatus: WorkOrderStatus.DRAFT,
          toStatus: WorkOrderStatus.SUBMITTED,
          action: Action.SUBMIT,
          actorUserId: user.id,
          actorRole: user.role,
          metadataJson: { createdBy: user.name },
        },
      });

      return wo;
    });

    return this.findOne(workOrder.id, user);
  }

  async update(id: string, user: CurrentUser, input: UpdateWorkOrderInput) {
    const workOrder = await this.getWorkOrderWithAccess(id, user);

    // Check which fields can be edited
    const updateData: any = {};
    const fieldsToUpdate = Object.keys(input) as (keyof UpdateWorkOrderInput)[];

    for (const field of fieldsToUpdate) {
      if (input[field] !== undefined) {
        if (!canEditField(workOrder.status as WorkOrderStatus, field, user.role as Role)) {
          throw new ForbiddenException(`Cannot edit field '${field}' in current status`);
        }
        updateData[field] = input[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.findOne(id, user);
    }

    await this.prisma.workOrder.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id, user);
  }

  async assign(id: string, user: CurrentUser, staffUserId: string) {
    if (user.role !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can assign work orders');
    }

    const workOrder = await this.prisma.workOrder.findUnique({ where: { id } });
    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    const staff = await this.prisma.user.findUnique({ where: { id: staffUserId } });
    if (!staff || staff.role !== Role.STAFF) {
      throw new BadRequestException('Invalid staff user');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: { assignedToUserId: staffUserId },
      });

      await tx.workOrderEvent.create({
        data: {
          workOrderId: id,
          fromStatus: workOrder.status,
          toStatus: workOrder.status,
          action: Action.ASSIGN,
          actorUserId: user.id,
          actorRole: user.role,
          metadataJson: { assignedTo: staff.name, assignedToId: staffUserId },
        },
      });
    });

    return this.findOne(id, user);
  }

  // Action: Verify
  async verify(id: string, user: CurrentUser, input: VerifyActionInput) {
    return this.executeAction(id, user, Action.VERIFY, async (tx, workOrder) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          inboundTrackingNo: input.inboundTrackingNo,
          status: WorkOrderStatus.OWNER_VERIFIED,
        },
      });
    });
  }

  // Action: Report External Damage
  async reportExternalDamage(id: string, user: CurrentUser, input: ReportExternalDamageInput) {
    return this.executeAction(id, user, Action.REPORT_EXTERNAL_DAMAGE, async (tx, workOrder) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED,
          notes: workOrder.notes
            ? `${workOrder.notes}\n\nExternal Damage: ${input.notes}`
            : `External Damage: ${input.notes}`,
        },
      });

      if (input.attachmentIds?.length) {
        await tx.attachment.updateMany({
          where: { id: { in: input.attachmentIds } },
          data: { workOrderId: id },
        });
      }
    });
  }

  // Action: Record Device
  async recordDevice(id: string, user: CurrentUser, input: RecordDeviceInput) {
    return this.executeAction(id, user, Action.RECORD_DEVICE, async (tx, workOrder) => {
      const labelCode = `LBL-${nanoid()}`;

      const device = await tx.device.create({
        data: {
          brand: input.brand,
          model: input.model,
          imei: input.imei,
          serialNo: input.serialNo,
          conditionNotes: input.conditionNotes,
          labelCode,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: {
          deviceId: device.id,
          status: WorkOrderStatus.DEVICE_INFO_RECORDED,
        },
      });
    });
  }

  // Action: Diagnose
  async diagnose(id: string, user: CurrentUser, input: DiagnoseInput) {
    return this.executeAction(id, user, Action.DIAGNOSE, async (tx, workOrder) => {
      await tx.inspection.create({
        data: {
          workOrderId: id,
          result: input.result,
          checklistJson: input.checklistJson,
          notes: input.notes,
          createdByUserId: user.id,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.DIAGNOSED },
      });
    });
  }

  // Action: Repair
  async repair(id: string, user: CurrentUser, input: RepairInput) {
    return this.executeAction(id, user, Action.REPAIR, async (tx, workOrder) => {
      await tx.repair.create({
        data: {
          workOrderId: id,
          actionsJson: input.actionsJson,
          cost: input.cost,
          result: input.result,
          notes: input.notes,
          createdByUserId: user.id,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.REPAIRING },
      });
    });
  }

  // Action: Store In
  async storeIn(id: string, user: CurrentUser, input: StoreInInput) {
    return this.executeAction(id, user, Action.STORE_IN, async (tx, workOrder) => {
      await tx.inventoryTxn.create({
        data: {
          workOrderId: id,
          type: InventoryTxnType.IN,
          location: input.location,
          notes: input.notes,
          createdByUserId: user.id,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.STORED_IN },
      });
    });
  }

  // Action: Ready to Ship
  async readyToShip(id: string, user: CurrentUser) {
    return this.executeAction(id, user, Action.READY_TO_SHIP, async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: { status: WorkOrderStatus.READY_TO_SHIP },
      });
    });
  }

  // Action: Ship
  async ship(id: string, user: CurrentUser, input: ShipInput) {
    return this.executeAction(id, user, Action.SHIP, async (tx, workOrder) => {
      await tx.inventoryTxn.create({
        data: {
          workOrderId: id,
          type: InventoryTxnType.OUT,
          notes: `Shipped with tracking: ${input.outboundTrackingNo}`,
          createdByUserId: user.id,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: {
          outboundTrackingNo: input.outboundTrackingNo,
          status: WorkOrderStatus.SHIPPED,
        },
      });
    });
  }

  // Action: Close Abnormal
  async closeAbnormal(id: string, user: CurrentUser, input: CloseAbnormalInput) {
    return this.executeAction(id, user, Action.CLOSE_ABNORMAL, async (tx, workOrder) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.CLOSED_ABNORMAL,
          notes: workOrder.notes
            ? `${workOrder.notes}\n\nClosed: ${input.notes}`
            : `Closed: ${input.notes}`,
        },
      });
    });
  }

  // Action: Reopen
  async reopen(id: string, user: CurrentUser, input: ReopenInput) {
    return this.executeAction(id, user, Action.REOPEN, async (tx, workOrder) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.REOPENED,
          notes: workOrder.notes
            ? `${workOrder.notes}\n\nReopened: ${input.reason}`
            : `Reopened: ${input.reason}`,
        },
      });
    });
  }

  // Action: Customer Confirm
  async customerConfirm(id: string, user: CurrentUser, input: CustomerConfirmInput) {
    const workOrder = await this.getWorkOrderWithAccess(id, user);

    // Determine target status based on input
    let targetAction = Action.CUSTOMER_CONFIRM;
    let targetStatus: WorkOrderStatus;

    if (!input.delivered || !input.satisfied) {
      targetAction = Action.REOPEN;
      targetStatus = WorkOrderStatus.REOPENED;
    } else if (workOrder.status === WorkOrderStatus.SHIPPED) {
      targetStatus = WorkOrderStatus.DELIVERED;
    } else {
      targetStatus = WorkOrderStatus.COMPLETED;
    }

    // Check if transition is valid
    const transition = canTransition(workOrder.status as WorkOrderStatus, targetAction);
    if (!transition.valid) {
      throw new BadRequestException(`Cannot perform ${targetAction} from status ${workOrder.status}`);
    }

    // Check permissions
    const permission = canPerformAction(
      targetAction,
      user.role as Role,
      workOrder,
      user.id,
    );
    if (!permission.allowed) {
      throw new ForbiddenException(permission.reason);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: {
          status: targetStatus,
          notes: workOrder.notes && input.reason
            ? `${workOrder.notes}\n\nCustomer feedback: ${input.reason}`
            : input.reason
              ? `Customer feedback: ${input.reason}`
              : workOrder.notes,
        },
      });

      await tx.workOrderEvent.create({
        data: {
          workOrderId: id,
          fromStatus: workOrder.status,
          toStatus: targetStatus,
          action: targetAction,
          actorUserId: user.id,
          actorRole: user.role,
          metadataJson: {
            delivered: input.delivered,
            satisfied: input.satisfied,
            reason: input.reason,
          },
        },
      });

      if (input.attachmentIds?.length) {
        await tx.attachment.updateMany({
          where: { id: { in: input.attachmentIds } },
          data: { workOrderId: id },
        });
      }
    });

    return this.findOne(id, user);
  }

  // Generic action executor with state machine validation
  private async executeAction(
    id: string,
    user: CurrentUser,
    action: Action,
    executor: (tx: any, workOrder: any) => Promise<void>,
  ) {
    const workOrder = await this.getWorkOrderWithAccess(id, user);

    // Check transition
    const transition = canTransition(workOrder.status as WorkOrderStatus, action);
    if (!transition.valid) {
      throw new BadRequestException(`Cannot perform ${action} from status ${workOrder.status}`);
    }

    // Check permissions
    const permission = canPerformAction(
      action,
      user.role as Role,
      workOrder,
      user.id,
    );
    if (!permission.allowed) {
      throw new ForbiddenException(permission.reason);
    }

    const fromStatus = workOrder.status;
    const toStatus = transition.toStatus!;

    await this.prisma.$transaction(async (tx) => {
      await executor(tx, workOrder);

      await tx.workOrderEvent.create({
        data: {
          workOrderId: id,
          fromStatus,
          toStatus,
          action,
          actorUserId: user.id,
          actorRole: user.role,
        },
      });
    });

    return this.findOne(id, user);
  }
}
