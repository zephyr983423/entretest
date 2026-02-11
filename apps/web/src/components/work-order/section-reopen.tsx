'use client';

import { useState } from 'react';
import { Action, WorkOrderStatus } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionReopenProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionReopen({ workOrder, onUpdated }: SectionReopenProps) {
  const canReopen = workOrder.availableActions.includes(Action.REOPEN);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.reopen(workOrder.id, reason.trim());
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const isReopened = workOrder.status === WorkOrderStatus.REOPENED;
  if (!canReopen && !isReopened) return null;

  return (
    <Card className={canReopen ? 'border-yellow-200 bg-yellow-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">重新打开</CardTitle>
      </CardHeader>
      <CardContent>
        {isReopened && !canReopen && (
          <div className="text-sm text-yellow-700">工单已被重新打开</div>
        )}
        {canReopen && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>重开原因 *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请说明重新打开的原因"
                rows={2}
              />
            </div>
            <Button variant="outline" onClick={handleSubmit} disabled={loading || !reason.trim()}>
              {loading ? '提交中...' : '重新打开'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
