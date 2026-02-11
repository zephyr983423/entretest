import { WorkOrderStatus, Action, Role, InspectionResult, RepairResult, InventoryTxnType, AttachmentType } from '@repo/shared';

export interface UserBrief {
  id: string;
  name: string;
  email?: string;
}

export interface DeviceDetail {
  id: string;
  brand: string;
  model: string;
  imei?: string | null;
  serialNo?: string | null;
  conditionNotes?: string | null;
  labelCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionDetail {
  id: string;
  workOrderId: string;
  result: InspectionResult;
  checklistJson?: Record<string, unknown> | null;
  notes?: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface RepairDetail {
  id: string;
  workOrderId: string;
  actionsJson?: string[] | null;
  cost?: string | number | null; // Decimal comes as string from Prisma
  result: RepairResult;
  notes?: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface InventoryTxnDetail {
  id: string;
  workOrderId: string;
  type: InventoryTxnType;
  location?: string | null;
  occurredAt: string;
  notes?: string | null;
  createdBy: { id: string; name: string };
}

export interface AttachmentDetail {
  id: string;
  workOrderId: string;
  type: AttachmentType;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface WorkOrderEvent {
  id: string;
  workOrderId: string;
  fromStatus: WorkOrderStatus;
  toStatus: WorkOrderStatus;
  action: string;
  actorUserId?: string | null;
  actorRole?: Role | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
}

export interface WorkOrderDetail {
  id: string;
  orderNo?: string | null;
  status: WorkOrderStatus;
  customerUserId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  inboundTrackingNo?: string | null;
  outboundTrackingNo?: string | null;
  assignedToUserId?: string | null;
  deviceId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: UserBrief;
  assignedTo?: UserBrief | null;
  device?: DeviceDetail | null;
  inspections: InspectionDetail[];
  repairs: RepairDetail[];
  inventoryTxn: InventoryTxnDetail[];
  attachments: AttachmentDetail[];
  events: WorkOrderEvent[];
  availableActions: Action[];
}

// List item (from findAll) has fewer includes
export interface WorkOrderListItem {
  id: string;
  orderNo?: string | null;
  status: WorkOrderStatus;
  customerUserId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  inboundTrackingNo?: string | null;
  outboundTrackingNo?: string | null;
  assignedToUserId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: UserBrief;
  assignedTo?: { id: string; name: string } | null;
  device?: { id: string; brand: string; model: string; labelCode: string } | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
