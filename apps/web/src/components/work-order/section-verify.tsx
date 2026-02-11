'use client';

import { useState } from 'react';
import { Action } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionVerifyProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionVerify({ workOrder, onUpdated }: SectionVerifyProps) {
  const canVerify = workOrder.availableActions.includes(Action.VERIFY);
  const [inboundTrackingNo, setInboundTrackingNo] = useState(workOrder.inboundTrackingNo || '');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!inboundTrackingNo.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.verify(workOrder.id, inboundTrackingNo.trim());
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  // Show read-only if tracking no exists
  const hasData = !!workOrder.inboundTrackingNo;
  if (!canVerify && !hasData) return null;

  return (
    <Card className={canVerify ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">审核验收</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && !canVerify && (
          <div className="flex justify-between">
            <span className="text-gray-500">入库快递单号</span>
            <span>{workOrder.inboundTrackingNo}</span>
          </div>
        )}
        {canVerify && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>入库快递单号</Label>
              <Input
                value={inboundTrackingNo}
                onChange={(e) => setInboundTrackingNo(e.target.value)}
                placeholder="输入入库快递单号"
              />
            </div>
            <Button onClick={handleVerify} disabled={loading || !inboundTrackingNo.trim()}>
              {loading ? '审核中...' : '审核通过'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
