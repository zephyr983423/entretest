import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  Role,
  WorkOrderStatus,
  Action,
  PublicConfirmInput,
} from '@repo/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class PublicConfirmService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async requestToken(workOrderId: string, userId: string, userRole: Role) {
    if (userRole !== Role.OWNER) {
      throw new ForbiddenException('Only OWNER can generate confirmation tokens');
    }

    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    // Check if work order is in appropriate status
    if (workOrder.status !== WorkOrderStatus.SHIPPED) {
      throw new BadRequestException('Work order must be in SHIPPED status to generate token');
    }

    // Delete existing token if any
    await this.prisma.publicConfirmToken.deleteMany({
      where: { workOrderId },
    });

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const confirmToken = await this.prisma.publicConfirmToken.create({
      data: {
        workOrderId,
        token,
        expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const url = `${frontendUrl}/confirm/${token}`;

    return {
      token: confirmToken.token,
      url,
      expiresAt: confirmToken.expiresAt,
    };
  }

  async confirm(token: string, input: PublicConfirmInput) {
    const confirmToken = await this.prisma.publicConfirmToken.findUnique({
      where: { token },
      include: {
        workOrder: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!confirmToken) {
      throw new NotFoundException('Invalid or expired token');
    }

    if (confirmToken.expiresAt < new Date()) {
      throw new ForbiddenException('Token has expired');
    }

    if (confirmToken.usedAt) {
      throw new BadRequestException('Token has already been used');
    }

    const workOrder = confirmToken.workOrder;

    // Determine target status
    let targetStatus: WorkOrderStatus;
    let action: Action;

    if (!input.delivered || !input.satisfied) {
      targetStatus = WorkOrderStatus.REOPENED;
      action = Action.REOPEN;
    } else if (workOrder.status === WorkOrderStatus.SHIPPED) {
      targetStatus = WorkOrderStatus.DELIVERED;
      action = Action.CUSTOMER_CONFIRM;
    } else {
      targetStatus = WorkOrderStatus.COMPLETED;
      action = Action.CUSTOMER_CONFIRM;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id: workOrder.id },
        data: {
          status: targetStatus,
          notes: workOrder.notes && input.reason
            ? `${workOrder.notes}\n\nCustomer feedback (via token): ${input.reason}`
            : input.reason
              ? `Customer feedback (via token): ${input.reason}`
              : workOrder.notes,
        },
      });

      await tx.workOrderEvent.create({
        data: {
          workOrderId: workOrder.id,
          fromStatus: workOrder.status,
          toStatus: targetStatus,
          action,
          actorUserId: workOrder.customerUserId,
          actorRole: Role.CUSTOMER,
          metadataJson: {
            delivered: input.delivered,
            satisfied: input.satisfied,
            reason: input.reason,
            viaToken: true,
          },
        },
      });

      await tx.publicConfirmToken.update({
        where: { id: confirmToken.id },
        data: { usedAt: new Date() },
      });

      if (input.attachmentIds?.length) {
        await tx.attachment.updateMany({
          where: { id: { in: input.attachmentIds } },
          data: { workOrderId: workOrder.id },
        });
      }
    });

    return {
      success: true,
      status: targetStatus,
      message: input.satisfied
        ? 'Thank you for confirming delivery!'
        : 'We have recorded your feedback and will process accordingly.',
    };
  }

  async getWorkOrderByToken(token: string) {
    const confirmToken = await this.prisma.publicConfirmToken.findUnique({
      where: { token },
      include: {
        workOrder: {
          include: {
            device: true,
            attachments: true,
          },
        },
      },
    });

    if (!confirmToken) {
      throw new NotFoundException('Invalid or expired token');
    }

    if (confirmToken.expiresAt < new Date()) {
      throw new ForbiddenException('Token has expired');
    }

    return {
      workOrder: {
        id: confirmToken.workOrder.id,
        orderNo: confirmToken.workOrder.orderNo,
        status: confirmToken.workOrder.status,
        outboundTrackingNo: confirmToken.workOrder.outboundTrackingNo,
        device: confirmToken.workOrder.device,
        attachments: confirmToken.workOrder.attachments,
      },
      tokenUsed: !!confirmToken.usedAt,
    };
  }
}
