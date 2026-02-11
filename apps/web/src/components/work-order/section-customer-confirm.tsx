'use client';

import { useState } from 'react';
import { Action, WorkOrderStatus } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionCustomerConfirmProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionCustomerConfirm({ workOrder, onUpdated }: SectionCustomerConfirmProps) {
  const canConfirm = workOrder.availableActions.includes(Action.CUSTOMER_CONFIRM);
  const [form, setForm] = useState({
    delivered: 'true',
    satisfied: 'true',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await workOrdersApi.customerConfirm(workOrder.id, {
        delivered: form.delivered === 'true',
        satisfied: form.satisfied === 'true',
        reason: form.reason.trim() || undefined,
      });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = [WorkOrderStatus.DELIVERED, WorkOrderStatus.COMPLETED].includes(workOrder.status);
  if (!canConfirm && !isCompleted) return null;

  return (
    <Card className={canConfirm ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">客户确认</CardTitle>
      </CardHeader>
      <CardContent>
        {isCompleted && !canConfirm && (
          <div className="text-sm text-green-600">客户已确认</div>
        )}
        {canConfirm && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>是否已收到</Label>
              <Select value={form.delivered} onValueChange={(v) => setForm({ ...form, delivered: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>是否满意</Label>
              <Select value={form.satisfied} onValueChange={(v) => setForm({ ...form, satisfied: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">满意</SelectItem>
                  <SelectItem value="false">不满意</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>原因/反馈</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="可选，填写反馈或原因"
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '提交中...' : '提交确认'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
