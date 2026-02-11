'use client';

import { useState } from 'react';
import { Action, WorkOrderStatus } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionExternalDamageProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionExternalDamage({ workOrder, onUpdated }: SectionExternalDamageProps) {
  const canReport = workOrder.availableActions.includes(Action.REPORT_EXTERNAL_DAMAGE);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReport = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.reportExternalDamage(workOrder.id, { notes: notes.trim() });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const hasBeenReported = workOrder.status === WorkOrderStatus.EXTERNAL_DAMAGE_REPORTED;
  if (!canReport && !hasBeenReported) return null;

  return (
    <Card className={canReport ? 'border-orange-200 bg-orange-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">外损报告</CardTitle>
      </CardHeader>
      <CardContent>
        {hasBeenReported && !canReport && (
          <div className="text-sm text-orange-700">已报告外部损坏</div>
        )}
        {canReport && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>损坏说明</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="描述外部损坏情况"
                rows={3}
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleReport}
              disabled={loading || !notes.trim()}
            >
              {loading ? '提交中...' : '报告外损'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
