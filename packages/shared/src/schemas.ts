import { z } from 'zod';
import { Role, WorkOrderStatus, InspectionResult, RepairResult, AttachmentType, RepairType, Urgency, WarrantyStatus } from './enums';

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// User schemas
export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.nativeEnum(Role).refine((r) => r === Role.STAFF || r === Role.CUSTOMER, {
    message: 'Can only create STAFF or CUSTOMER users',
  }),
});

// Work order schemas
export const createWorkOrderSchema = z.object({
  orderNo: z.string().optional(),
  customerUserId: z.string().optional(), // Required for OWNER/STAFF, auto-set for CUSTOMER
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
  repairType: z.nativeEnum(RepairType).optional(),
  urgency: z.nativeEnum(Urgency).optional(),
  warrantyStatus: z.nativeEnum(WarrantyStatus).optional(),
});

export const updateWorkOrderSchema = z.object({
  orderNo: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
  repairType: z.nativeEnum(RepairType).optional(),
  urgency: z.nativeEnum(Urgency).optional(),
  warrantyStatus: z.nativeEnum(WarrantyStatus).optional(),
});

export const assignWorkOrderSchema = z.object({
  userId: z.string(),
});

// Action schemas
export const verifyActionSchema = z.object({
  inboundTrackingNo: z.string().min(1),
});

export const reportExternalDamageSchema = z.object({
  notes: z.string().min(1),
  attachmentIds: z.array(z.string()).optional(),
});

export const recordDeviceSchema = z.object({
  brand: z.string().min(1),
  model: z.string().min(1),
  imei: z.string().optional(),
  serialNo: z.string().optional(),
  conditionNotes: z.string().optional(),
});

export const diagnoseSchema = z.object({
  result: z.nativeEnum(InspectionResult),
  checklistJson: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export const repairSchema = z.object({
  actionsJson: z.array(z.string()).optional(),
  cost: z.number().nonnegative().optional(),
  result: z.nativeEnum(RepairResult),
  notes: z.string().optional(),
});

export const storeInSchema = z.object({
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const shipSchema = z.object({
  outboundTrackingNo: z.string().min(1),
});

export const closeAbnormalSchema = z.object({
  notes: z.string().min(1),
});

export const reopenSchema = z.object({
  reason: z.string().min(1),
});

export const customerConfirmSchema = z.object({
  delivered: z.boolean(),
  satisfied: z.boolean(),
  reason: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
});

// Public confirm
export const requestTokenSchema = z.object({
  workOrderId: z.string(),
});

export const publicConfirmSchema = z.object({
  delivered: z.boolean(),
  satisfied: z.boolean(),
  reason: z.string().optional(),
  attachmentIds: z.array(z.string()).optional(),
});

// Attachment
export const attachmentTypeSchema = z.nativeEnum(AttachmentType);

// Query schemas
export const workOrderQuerySchema = z.object({
  status: z.nativeEnum(WorkOrderStatus).optional(),
  repairType: z.nativeEnum(RepairType).optional(),
  urgency: z.nativeEnum(Urgency).optional(),
  warrantyStatus: z.nativeEnum(WarrantyStatus).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status', 'urgency', 'customerName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Batch ship schema
export const batchShipSchema = z.object({
  workOrderIds: z.array(z.string()).min(1),
  outboundTrackingNos: z.record(z.string(), z.string()),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof updateWorkOrderSchema>;
export type AssignWorkOrderInput = z.infer<typeof assignWorkOrderSchema>;
export type VerifyActionInput = z.infer<typeof verifyActionSchema>;
export type ReportExternalDamageInput = z.infer<typeof reportExternalDamageSchema>;
export type RecordDeviceInput = z.infer<typeof recordDeviceSchema>;
export type DiagnoseInput = z.infer<typeof diagnoseSchema>;
export type RepairInput = z.infer<typeof repairSchema>;
export type StoreInInput = z.infer<typeof storeInSchema>;
export type ShipInput = z.infer<typeof shipSchema>;
export type CloseAbnormalInput = z.infer<typeof closeAbnormalSchema>;
export type ReopenInput = z.infer<typeof reopenSchema>;
export type CustomerConfirmInput = z.infer<typeof customerConfirmSchema>;
export type RequestTokenInput = z.infer<typeof requestTokenSchema>;
export type PublicConfirmInput = z.infer<typeof publicConfirmSchema>;
export type WorkOrderQueryInput = z.infer<typeof workOrderQuerySchema>;
export type BatchShipInput = z.infer<typeof batchShipSchema>;
