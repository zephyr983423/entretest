import { WorkOrderStatus, Action } from '@repo/shared';

export const STATUS_LABELS_ZH: Record<WorkOrderStatus, string> = {
  [WorkOrderStatus.DRAFT]: '草稿',
  [WorkOrderStatus.SUBMITTED]: '已提交',
  [WorkOrderStatus.OWNER_VERIFIED]: '已审核',
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: '外损已报告',
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: '设备已录入',
  [WorkOrderStatus.DIAGNOSED]: '已诊断',
  [WorkOrderStatus.REPAIRING]: '维修中',
  [WorkOrderStatus.STORED_IN]: '已入库',
  [WorkOrderStatus.READY_TO_SHIP]: '待发货',
  [WorkOrderStatus.SHIPPED]: '已发货',
  [WorkOrderStatus.DELIVERED]: '已签收',
  [WorkOrderStatus.COMPLETED]: '已完成',
  [WorkOrderStatus.REOPENED]: '已重开',
  [WorkOrderStatus.CLOSED_ABNORMAL]: '异常关闭',
};

export const ACTION_LABELS_ZH: Record<Action, string> = {
  [Action.SUBMIT]: '提交',
  [Action.VERIFY]: '审核',
  [Action.REPORT_EXTERNAL_DAMAGE]: '报告外损',
  [Action.RECORD_DEVICE]: '录入设备',
  [Action.DIAGNOSE]: '诊断',
  [Action.REPAIR]: '维修',
  [Action.STORE_IN]: '入库',
  [Action.READY_TO_SHIP]: '准备发货',
  [Action.SHIP]: '发货',
  [Action.CUSTOMER_CONFIRM]: '客户确认',
  [Action.REOPEN]: '重新打开',
  [Action.CLOSE_ABNORMAL]: '异常关闭',
  [Action.ASSIGN]: '分配员工',
};

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

export const STATUS_COLORS: Record<WorkOrderStatus, BadgeVariant> = {
  [WorkOrderStatus.DRAFT]: 'secondary',
  [WorkOrderStatus.SUBMITTED]: 'warning',
  [WorkOrderStatus.OWNER_VERIFIED]: 'info',
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: 'destructive',
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: 'info',
  [WorkOrderStatus.DIAGNOSED]: 'info',
  [WorkOrderStatus.REPAIRING]: 'info',
  [WorkOrderStatus.STORED_IN]: 'info',
  [WorkOrderStatus.READY_TO_SHIP]: 'warning',
  [WorkOrderStatus.SHIPPED]: 'info',
  [WorkOrderStatus.DELIVERED]: 'success',
  [WorkOrderStatus.COMPLETED]: 'success',
  [WorkOrderStatus.REOPENED]: 'warning',
  [WorkOrderStatus.CLOSED_ABNORMAL]: 'destructive',
};

// Main-path statuses for the progress bar (10 steps)
export const PROGRESS_STEPS: { status: WorkOrderStatus; label: string }[] = [
  { status: WorkOrderStatus.SUBMITTED, label: '已提交' },
  { status: WorkOrderStatus.OWNER_VERIFIED, label: '已审核' },
  { status: WorkOrderStatus.DEVICE_INFO_RECORDED, label: '设备录入' },
  { status: WorkOrderStatus.DIAGNOSED, label: '已诊断' },
  { status: WorkOrderStatus.REPAIRING, label: '维修中' },
  { status: WorkOrderStatus.STORED_IN, label: '已入库' },
  { status: WorkOrderStatus.READY_TO_SHIP, label: '待发货' },
  { status: WorkOrderStatus.SHIPPED, label: '已发货' },
  { status: WorkOrderStatus.DELIVERED, label: '已签收' },
  { status: WorkOrderStatus.COMPLETED, label: '已完成' },
];

// Map each status to its progress index (for the progress bar)
export const STATUS_PROGRESS_INDEX: Record<WorkOrderStatus, number> = {
  [WorkOrderStatus.DRAFT]: -1,
  [WorkOrderStatus.SUBMITTED]: 0,
  [WorkOrderStatus.OWNER_VERIFIED]: 1,
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: 1, // branched from OWNER_VERIFIED
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: 2,
  [WorkOrderStatus.DIAGNOSED]: 3,
  [WorkOrderStatus.REPAIRING]: 4,
  [WorkOrderStatus.STORED_IN]: 5,
  [WorkOrderStatus.READY_TO_SHIP]: 6,
  [WorkOrderStatus.SHIPPED]: 7,
  [WorkOrderStatus.DELIVERED]: 8,
  [WorkOrderStatus.COMPLETED]: 9,
  [WorkOrderStatus.REOPENED]: 0, // back to beginning
  [WorkOrderStatus.CLOSED_ABNORMAL]: -1,
};
