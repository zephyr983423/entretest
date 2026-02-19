export enum Role {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  OWNER_VERIFIED = 'OWNER_VERIFIED',
  EXTERNAL_DAMAGE_REPORTED = 'EXTERNAL_DAMAGE_REPORTED',
  DEVICE_INFO_RECORDED = 'DEVICE_INFO_RECORDED',
  DIAGNOSED = 'DIAGNOSED',
  REPAIRING = 'REPAIRING',
  STORED_IN = 'STORED_IN',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  REOPENED = 'REOPENED',
  CLOSED_ABNORMAL = 'CLOSED_ABNORMAL',
}

export enum Action {
  SUBMIT = 'SUBMIT',
  VERIFY = 'VERIFY',
  REPORT_EXTERNAL_DAMAGE = 'REPORT_EXTERNAL_DAMAGE',
  RECORD_DEVICE = 'RECORD_DEVICE',
  DIAGNOSE = 'DIAGNOSE',
  REPAIR = 'REPAIR',
  STORE_IN = 'STORE_IN',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIP = 'SHIP',
  CUSTOMER_CONFIRM = 'CUSTOMER_CONFIRM',
  REOPEN = 'REOPEN',
  CLOSE_ABNORMAL = 'CLOSE_ABNORMAL',
  ASSIGN = 'ASSIGN',
}

export enum InspectionResult {
  NORMAL = 'NORMAL',
  ABNORMAL = 'ABNORMAL',
}

export enum RepairResult {
  FIXED = 'FIXED',
  UNFIXED = 'UNFIXED',
  NA = 'NA',
}

export enum InventoryTxnType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum AttachmentType {
  PACKAGE_PHOTO = 'PACKAGE_PHOTO',
  DEVICE_PHOTO = 'DEVICE_PHOTO',
  LABEL_PHOTO = 'LABEL_PHOTO',
  DELIVERY_PROOF = 'DELIVERY_PROOF',
  OTHER = 'OTHER',
}

export enum RepairType {
  SCREEN = 'SCREEN',
  BATTERY = 'BATTERY',
  MOTHERBOARD = 'MOTHERBOARD',
  WATER_DAMAGE = 'WATER_DAMAGE',
  CHARGING_PORT = 'CHARGING_PORT',
  CAMERA = 'CAMERA',
  SPEAKER = 'SPEAKER',
  SOFTWARE = 'SOFTWARE',
  OTHER = 'OTHER',
}

export enum Urgency {
  NORMAL = 'NORMAL',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum WarrantyStatus {
  IN_WARRANTY = 'IN_WARRANTY',
  OUT_OF_WARRANTY = 'OUT_OF_WARRANTY',
  EXTENDED = 'EXTENDED',
}

export const REPAIR_TYPE_LABELS: Record<RepairType, string> = {
  [RepairType.SCREEN]: 'Screen',
  [RepairType.BATTERY]: 'Battery',
  [RepairType.MOTHERBOARD]: 'Motherboard',
  [RepairType.WATER_DAMAGE]: 'Water Damage',
  [RepairType.CHARGING_PORT]: 'Charging Port',
  [RepairType.CAMERA]: 'Camera',
  [RepairType.SPEAKER]: 'Speaker',
  [RepairType.SOFTWARE]: 'Software',
  [RepairType.OTHER]: 'Other',
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  [Urgency.NORMAL]: 'Normal',
  [Urgency.URGENT]: 'Urgent',
  [Urgency.CRITICAL]: 'Critical',
};

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  [WarrantyStatus.IN_WARRANTY]: 'In Warranty',
  [WarrantyStatus.OUT_OF_WARRANTY]: 'Out of Warranty',
  [WarrantyStatus.EXTENDED]: 'Extended',
};

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.DRAFT]: 'Draft',
  [WorkOrderStatus.SUBMITTED]: 'Submitted',
  [WorkOrderStatus.OWNER_VERIFIED]: 'Verified',
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: 'External Damage Reported',
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: 'Device Info Recorded',
  [WorkOrderStatus.DIAGNOSED]: 'Diagnosed',
  [WorkOrderStatus.REPAIRING]: 'Repairing',
  [WorkOrderStatus.STORED_IN]: 'Stored In',
  [WorkOrderStatus.READY_TO_SHIP]: 'Ready to Ship',
  [WorkOrderStatus.SHIPPED]: 'Shipped',
  [WorkOrderStatus.DELIVERED]: 'Delivered',
  [WorkOrderStatus.COMPLETED]: 'Completed',
  [WorkOrderStatus.REOPENED]: 'Reopened',
  [WorkOrderStatus.CLOSED_ABNORMAL]: 'Closed (Abnormal)',
};

export const ACTION_LABELS: Record<Action, string> = {
  [Action.SUBMIT]: 'Submit',
  [Action.VERIFY]: 'Verify',
  [Action.REPORT_EXTERNAL_DAMAGE]: 'Report External Damage',
  [Action.RECORD_DEVICE]: 'Record Device Info',
  [Action.DIAGNOSE]: 'Diagnose',
  [Action.REPAIR]: 'Complete Repair',
  [Action.STORE_IN]: 'Store In',
  [Action.READY_TO_SHIP]: 'Ready to Ship',
  [Action.SHIP]: 'Ship Out',
  [Action.CUSTOMER_CONFIRM]: 'Customer Confirm',
  [Action.REOPEN]: 'Reopen',
  [Action.CLOSE_ABNORMAL]: 'Close as Abnormal',
  [Action.ASSIGN]: 'Assign Staff',
};
