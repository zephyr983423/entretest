import { Role, WorkOrderStatus, Action } from './enums';

// Define allowed transitions: fromStatus -> action -> toStatus
export const allowedTransitions: Record<WorkOrderStatus, Partial<Record<Action, WorkOrderStatus>>> = {
  [WorkOrderStatus.DRAFT]: {
    [Action.SUBMIT]: WorkOrderStatus.SUBMITTED,
  },
  [WorkOrderStatus.SUBMITTED]: {
    [Action.VERIFY]: WorkOrderStatus.OWNER_VERIFIED,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.OWNER_VERIFIED]: {
    [Action.REPORT_EXTERNAL_DAMAGE]: WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED,
    [Action.RECORD_DEVICE]: WorkOrderStatus.DEVICE_INFO_RECORDED,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: {
    [Action.SHIP]: WorkOrderStatus.SHIPPED, // Ship back without processing
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: {
    [Action.DIAGNOSE]: WorkOrderStatus.DIAGNOSED,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.DIAGNOSED]: {
    [Action.REPAIR]: WorkOrderStatus.REPAIRING,
    [Action.STORE_IN]: WorkOrderStatus.STORED_IN, // If normal, store directly
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.REPAIRING]: {
    [Action.STORE_IN]: WorkOrderStatus.STORED_IN,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.STORED_IN]: {
    [Action.READY_TO_SHIP]: WorkOrderStatus.READY_TO_SHIP,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.READY_TO_SHIP]: {
    [Action.SHIP]: WorkOrderStatus.SHIPPED,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.SHIPPED]: {
    [Action.CUSTOMER_CONFIRM]: WorkOrderStatus.DELIVERED,
    [Action.REOPEN]: WorkOrderStatus.REOPENED,
  },
  [WorkOrderStatus.DELIVERED]: {
    [Action.CUSTOMER_CONFIRM]: WorkOrderStatus.COMPLETED, // Satisfied confirmation
    [Action.REOPEN]: WorkOrderStatus.REOPENED,
  },
  [WorkOrderStatus.COMPLETED]: {},
  [WorkOrderStatus.REOPENED]: {
    [Action.VERIFY]: WorkOrderStatus.OWNER_VERIFIED,
    [Action.CLOSE_ABNORMAL]: WorkOrderStatus.CLOSED_ABNORMAL,
  },
  [WorkOrderStatus.CLOSED_ABNORMAL]: {},
};

// Action permission configuration
export interface ActionPermission {
  roles: Role[];
  requireAssignment?: boolean;
}

export const actionPermissions: Record<Action, ActionPermission> = {
  [Action.SUBMIT]: { roles: [Role.OWNER, Role.STAFF, Role.CUSTOMER] },
  [Action.VERIFY]: { roles: [Role.OWNER, Role.STAFF] },
  [Action.REPORT_EXTERNAL_DAMAGE]: { roles: [Role.OWNER, Role.STAFF] },
  [Action.RECORD_DEVICE]: { roles: [Role.STAFF] },
  [Action.DIAGNOSE]: { roles: [Role.STAFF] },
  [Action.REPAIR]: { roles: [Role.STAFF] },
  [Action.STORE_IN]: { roles: [Role.STAFF] },
  [Action.READY_TO_SHIP]: { roles: [Role.OWNER] },
  [Action.SHIP]: { roles: [Role.OWNER] },
  [Action.CUSTOMER_CONFIRM]: { roles: [Role.CUSTOMER, Role.OWNER] },
  [Action.REOPEN]: { roles: [Role.CUSTOMER, Role.OWNER] },
  [Action.CLOSE_ABNORMAL]: { roles: [Role.OWNER] },
  [Action.ASSIGN]: { roles: [Role.OWNER] },
};

// Editable fields by status
export interface EditableFields {
  allowed: string[];
  roles?: Role[];
}

export const editableFieldsByStatus: Record<WorkOrderStatus, EditableFields> = {
  [WorkOrderStatus.DRAFT]: {
    allowed: ['orderNo', 'customerName', 'customerPhone', 'customerAddress', 'notes'],
    roles: [Role.OWNER, Role.CUSTOMER, Role.STAFF],
  },
  [WorkOrderStatus.SUBMITTED]: {
    allowed: ['orderNo', 'customerName', 'customerPhone', 'customerAddress', 'notes'],
    roles: [Role.OWNER, Role.CUSTOMER],
  },
  [WorkOrderStatus.OWNER_VERIFIED]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.DEVICE_INFO_RECORDED]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.DIAGNOSED]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.REPAIRING]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.STORED_IN]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.READY_TO_SHIP]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.SHIPPED]: {
    allowed: ['orderNo'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.DELIVERED]: {
    allowed: [],
    roles: [],
  },
  [WorkOrderStatus.COMPLETED]: {
    allowed: [],
    roles: [],
  },
  [WorkOrderStatus.REOPENED]: {
    allowed: ['orderNo', 'notes'],
    roles: [Role.OWNER],
  },
  [WorkOrderStatus.CLOSED_ABNORMAL]: {
    allowed: [],
    roles: [],
  },
};

// Validate transition
export function canTransition(
  fromStatus: WorkOrderStatus,
  action: Action,
): { valid: boolean; toStatus?: WorkOrderStatus } {
  const transitions = allowedTransitions[fromStatus];
  if (!transitions || !(action in transitions)) {
    return { valid: false };
  }
  return { valid: true, toStatus: transitions[action] };
}

// Validate action permission
export function canPerformAction(
  action: Action,
  userRole: Role,
  workOrder: { assignedToUserId?: string | null; customerUserId: string },
  userId: string,
): { allowed: boolean; reason?: string } {
  const permission = actionPermissions[action];

  if (!permission) {
    return { allowed: false, reason: 'Unknown action' };
  }

  if (!permission.roles.includes(userRole)) {
    return { allowed: false, reason: 'Role not permitted for this action' };
  }

  // Check if customer owns the work order
  if (userRole === Role.CUSTOMER && workOrder.customerUserId !== userId) {
    return { allowed: false, reason: 'Customer can only operate on their own work orders' };
  }

  // Check assignment for STAFF
  if (permission.requireAssignment && userRole === Role.STAFF) {
    if (workOrder.assignedToUserId !== userId) {
      return { allowed: false, reason: 'Staff can only operate on assigned work orders' };
    }
  }

  return { allowed: true };
}

// Check if field is editable
export function canEditField(
  status: WorkOrderStatus,
  field: string,
  userRole: Role,
): boolean {
  const config = editableFieldsByStatus[status];
  if (!config) return false;
  if (!config.allowed.includes(field)) return false;
  if (config.roles && !config.roles.includes(userRole)) return false;
  return true;
}

// Get available actions for a status and role
export function getAvailableActions(
  status: WorkOrderStatus,
  userRole: Role,
  workOrder: { assignedToUserId?: string | null; customerUserId: string },
  userId: string,
): Action[] {
  const transitions = allowedTransitions[status];
  if (!transitions) return [];

  const actions: Action[] = [];
  for (const action of Object.keys(transitions) as Action[]) {
    const { allowed } = canPerformAction(action, userRole, workOrder, userId);
    if (allowed) {
      actions.push(action);
    }
  }
  return actions;
}
