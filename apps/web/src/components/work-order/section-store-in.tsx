'use client';

import { useState } from 'react';
import { Action } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionStoreInProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionStoreIn({ workOrder, onUpdated }: SectionStoreInProps) {
  const canStoreIn = workOrder.availableActions.includes(Action.STORE_IN);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await workOrdersApi.storeIn(workOrder.id, {
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const inTxns = workOrder.inventoryTxn.filter((t) => t.type === 'IN');
  const hasData = inTxns.length > 0;
  if (!canStoreIn && !hasData) return null;

  return (
    <Card className={canStoreIn ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">入库</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && (
          <div className="space-y-2 mb-3">
            {inTxns.map((txn) => (
              <div key={txn.id} className="rounded border p-2 text-sm space-y-1">
                {txn.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">位置</span>
                    <span>{txn.location}</span>
                  </div>
                )}
                {txn.notes && (
                  <div>
                    <span className="text-gray-500">备注：</span>
                    <span>{txn.notes}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {txn.createdBy.name} · {new Date(txn.occurredAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
        {canStoreIn && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>存放位置</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="如：A-01"
              />
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="入库备注"
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '入库中...' : '确认入库'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
