'use client';

import { useState } from 'react';
import { Action } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionShipProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionShip({ workOrder, onUpdated }: SectionShipProps) {
  const canShip = workOrder.availableActions.includes(Action.SHIP);
  const [trackingNo, setTrackingNo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!trackingNo.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.ship(workOrder.id, trackingNo.trim());
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const hasData = !!workOrder.outboundTrackingNo;
  if (!canShip && !hasData) return null;

  return (
    <Card className={canShip ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">发货</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && !canShip && (
          <div className="flex justify-between">
            <span className="text-gray-500">出库快递单号</span>
            <span>{workOrder.outboundTrackingNo}</span>
          </div>
        )}
        {canShip && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>出库快递单号 *</Label>
              <Input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="输入快递单号"
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading || !trackingNo.trim()}>
              {loading ? '发货中...' : '确认发货'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
