'use client';

import { useState } from 'react';
import { Action, WorkOrderStatus } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionCloseAbnormalProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionCloseAbnormal({ workOrder, onUpdated }: SectionCloseAbnormalProps) {
  const canClose = workOrder.availableActions.includes(Action.CLOSE_ABNORMAL);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.closeAbnormal(workOrder.id, notes.trim());
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const isClosed = workOrder.status === WorkOrderStatus.CLOSED_ABNORMAL;
  if (!canClose && !isClosed) return null;

  return (
    <Card className={canClose ? 'border-red-200 bg-red-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">异常关闭</CardTitle>
      </CardHeader>
      <CardContent>
        {isClosed && !canClose && (
          <div className="text-sm text-red-600">工单已异常关闭</div>
        )}
        {canClose && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>关闭原因 *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请说明异常关闭的原因"
                rows={2}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={loading || !notes.trim()}
            >
              {loading ? '关闭中...' : '异常关闭'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
