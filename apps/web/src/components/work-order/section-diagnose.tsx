'use client';

import { useState } from 'react';
import { Action, InspectionResult } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  NORMAL: '正常',
  ABNORMAL: '异常',
};

interface SectionDiagnoseProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionDiagnose({ workOrder, onUpdated }: SectionDiagnoseProps) {
  const canDiagnose = workOrder.availableActions.includes(Action.DIAGNOSE);
  const [form, setForm] = useState({
    result: InspectionResult.NORMAL as string,
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const updated = await workOrdersApi.diagnose(workOrder.id, {
        result: form.result,
        notes: form.notes.trim() || undefined,
      });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const inspections = workOrder.inspections;
  const hasData = inspections.length > 0;
  if (!canDiagnose && !hasData) return null;

  return (
    <Card className={canDiagnose ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">诊断结果</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData && (
          <div className="space-y-3 mb-3">
            {inspections.map((insp) => (
              <div key={insp.id} className="rounded border p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">结果</span>
                  <Badge variant={insp.result === InspectionResult.NORMAL ? 'success' : 'warning'}>
                    {RESULT_LABELS[insp.result] || insp.result}
                  </Badge>
                </div>
                {insp.notes && (
                  <div>
                    <span className="text-gray-500">备注：</span>
                    <span>{insp.notes}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {insp.createdBy.name} · {new Date(insp.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
        {canDiagnose && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>诊断结果 *</Label>
              <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={InspectionResult.NORMAL}>正常</SelectItem>
                  <SelectItem value={InspectionResult.ABNORMAL}>异常</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>备注</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="诊断发现和备注"
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? '提交中...' : '完成诊断'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
