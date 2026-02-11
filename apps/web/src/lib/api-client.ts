'use client';

import { getAuth, clearAuth } from './auth';
import type { WorkOrderDetail, WorkOrderListItem, PaginatedResponse, UserBrief } from '@/components/work-order/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data: T | null;
  error: {
    statusCode: number;
    message: string;
    errors?: unknown;
  } | null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  includeAuth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const auth = getAuth();
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('未授权，请重新登录');
  }

  const json: ApiResponse<T> = await response.json();

  if (json.error) {
    throw new Error(json.error.message);
  }

  return json.data!;
}

function get<T>(path: string, includeAuth = true): Promise<T> {
  return request<T>(path, { method: 'GET' }, includeAuth);
}

function post<T>(path: string, body?: unknown, includeAuth = true): Promise<T> {
  return request<T>(
    path,
    { method: 'POST', body: body ? JSON.stringify(body) : undefined },
    includeAuth,
  );
}

function patch<T>(path: string, body: unknown, includeAuth = true): Promise<T> {
  return request<T>(
    path,
    { method: 'PATCH', body: JSON.stringify(body) },
    includeAuth,
  );
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    post<{ accessToken: string; user: UserBrief & { role: string } }>(
      '/auth/login',
      { email, password },
      false,
    ),
};

// Users
export const usersApi = {
  list: (role?: string) =>
    get<Array<{ id: string; email: string; name: string; role: string }>>(
      `/users${role ? `?role=${role}` : ''}`,
    ),
};

// Work Orders
export const workOrdersApi = {
  list: (params?: { status?: string; q?: string; page?: number; pageSize?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    const query = searchParams.toString();
    return get<PaginatedResponse<WorkOrderListItem>>(
      `/work-orders${query ? `?${query}` : ''}`,
    );
  },
  get: (id: string) => get<WorkOrderDetail>(`/work-orders/${id}`),
  create: (data: {
    orderNo?: string;
    customerUserId?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
  }) => post<WorkOrderDetail>('/work-orders', data),
  update: (id: string, data: {
    orderNo?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    notes?: string;
  }) => patch<WorkOrderDetail>(`/work-orders/${id}`, data),
  assign: (id: string, userId: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/assign`, { userId }),

  // Actions
  verify: (id: string, inboundTrackingNo: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/verify`, { inboundTrackingNo }),
  reportExternalDamage: (id: string, data: { notes: string; attachmentIds?: string[] }) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/report-external-damage`, data),
  recordDevice: (id: string, data: {
    brand: string;
    model: string;
    imei?: string;
    serialNo?: string;
    conditionNotes?: string;
  }) => post<WorkOrderDetail>(`/work-orders/${id}/actions/record-device`, data),
  diagnose: (id: string, data: {
    result: string;
    checklistJson?: Record<string, unknown>;
    notes?: string;
  }) => post<WorkOrderDetail>(`/work-orders/${id}/actions/diagnose`, data),
  repair: (id: string, data: {
    actionsJson?: string[];
    cost?: number;
    result: string;
    notes?: string;
  }) => post<WorkOrderDetail>(`/work-orders/${id}/actions/repair`, data),
  storeIn: (id: string, data: { location?: string; notes?: string }) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/store-in`, data),
  readyToShip: (id: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/ready-to-ship`, {}),
  ship: (id: string, outboundTrackingNo: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/ship`, { outboundTrackingNo }),
  closeAbnormal: (id: string, notes: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/close-abnormal`, { notes }),
  reopen: (id: string, reason: string) =>
    post<WorkOrderDetail>(`/work-orders/${id}/actions/reopen`, { reason }),
  customerConfirm: (id: string, data: {
    delivered: boolean;
    satisfied: boolean;
    reason?: string;
    attachmentIds?: string[];
  }) => post<WorkOrderDetail>(`/work-orders/${id}/actions/customer-confirm`, data),
};

// Public Confirm
export const publicConfirmApi = {
  requestToken: (workOrderId: string) =>
    post<{ token: string; url: string; expiresAt: string }>(
      '/public/confirm/request-token',
      { workOrderId },
    ),
  getByToken: (token: string) =>
    get<unknown>(`/public/confirm/${token}`, false),
  confirm: (token: string, data: {
    delivered: boolean;
    satisfied: boolean;
    reason?: string;
    attachmentIds?: string[];
  }) => post<unknown>(`/public/confirm/${token}`, data, false),
};

// Attachments
export const attachmentsApi = {
  upload: async (workOrderId: string, file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workOrderId', workOrderId);
    formData.append('type', type);

    const auth = getAuth();
    const headers: Record<string, string> = {};
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`;
    }

    const response = await fetch(`${API_URL}/attachments/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const json = await response.json();
    if (json.error) throw new Error(json.error.message);
    return json.data;
  },
};
