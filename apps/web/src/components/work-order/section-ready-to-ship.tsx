'use client';

import { useState } from 'react';
import { Action, WorkOrderStatus } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionReadyToShipProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionReadyToShip({ workOrder, onUpdated }: SectionReadyToShipProps) {
  const canReady = workOrder.availableActions.includes(Action.READY_TO_SHIP);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await workOrdersApi.readyToShip(workOrder.id);
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const isReady = [
    WorkOrderStatus.READY_TO_SHIP,
    WorkOrderStatus.SHIPPED,
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.COMPLETED,
  ].includes(workOrder.status);

  if (!canReady && !isReady) return null;

  return (
    <Card className={canReady ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">准备发货</CardTitle>
      </CardHeader>
      <CardContent>
        {isReady && !canReady && (
          <div className="text-sm text-green-600">已确认准备发货</div>
        )}
        {canReady && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">确认设备已准备好可以发货</p>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '确认中...' : '确认准备发货'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
