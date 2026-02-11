'use client';

import { useState } from 'react';
import { Action, RepairResult } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { workOrdersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

const RESULT_LABELS: Record<string, string> = {
  FIXED: '已修复',
  UNFIXED: '未修复',
  NA: '不适用',
};

const RESULT_COLORS: Record<string, 'success' | 'destructive' | 'secondary'> = {
  FIXED: 'success',
  UNFIXED: 'destructive',
  NA: 'secondary',
};

interface SectionRepairProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionRepair({ workOrder, onUpdated }: SectionRepairProps) {
  const canRepair = workOrder.availableActions.includes(Action.REPAIR);
  const [form, setForm] = useState({
    result: RepairResult.FIXED as string,
    notes: '',
    cost: '',
    actionsText: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await workOrdersApi.repair(workOrder.id, {
        result: form.result,
        notes: form.notes.trim() || undefined,
        cost: form.cost ? parseFloat(form.cost) : undefined,
        actionsJson: form.actionsText.trim()
          ? form.actionsText.split('\n').filter(Boolean)
          : undefined,
      });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const repairs = workOrder.repairs;
  const hasData = repairs.length > 0;
  if (!canRepair && !hasData) return null;

  return (
    <Card className={canRepair ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">维修记录</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && (
          <div className="space-y-3 mb-3">
            {repairs.map((r) => (
              <div key={r.id} className="rounded border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">结果</span>
                  <Badge variant={RESULT_COLORS[r.result] || 'default'}>
                    {RESULT_LABELS[r.result] || r.result}
                  </Badge>
                </div>
                {r.cost != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">费用</span>
                    <span>¥{r.cost}</span>
                  </div>
                )}
                {r.actionsJson && Array.isArray(r.actionsJson) && (
                  <div>
                    <span className="text-gray-500">操作：</span>
                    <span>{(r.actionsJson as string[]).join('、')}</span>
                  </div>
                )}
                {r.notes && (
                  <div>
                    <span className="text-gray-500">备注：</span>
                    <span>{r.notes}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {r.createdBy.name} · {new Date(r.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
        {canRepair && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>维修结果 *</Label>
              <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RepairResult.FIXED}>已修复</SelectItem>
                  <SelectItem value={RepairResult.UNFIXED}>未修复</SelectItem>
                  <SelectItem value={RepairResult.NA}>不适用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>费用</Label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="如：299"
              />
            </div>
            <div className="space-y-1">
              <Label>维修操作（每行一项）</Label>
              <Textarea
                value={form.actionsText}
                onChange={(e) => setForm({ ...form, actionsText: e.target.value })}
                placeholder="更换屏幕&#10;清洁主板"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="维修备注"
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '提交中...' : '完成维修'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
