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

interface SectionRecordDeviceProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionRecordDevice({ workOrder, onUpdated }: SectionRecordDeviceProps) {
  const canRecord = workOrder.availableActions.includes(Action.RECORD_DEVICE);
  const [form, setForm] = useState({
    brand: '',
    model: '',
    imei: '',
    serialNo: '',
    conditionNotes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.brand.trim() || !form.model.trim()) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.recordDevice(workOrder.id, {
        brand: form.brand.trim(),
        model: form.model.trim(),
        imei: form.imei.trim() || undefined,
        serialNo: form.serialNo.trim() || undefined,
        conditionNotes: form.conditionNotes.trim() || undefined,
      });
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  const device = workOrder.device;
  if (!canRecord && !device) return null;

  return (
    <Card className={canRecord ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">设备信息</CardTitle>
      </CardHeader>
      <CardContent>
        {device && !canRecord && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">品牌</span>
              <span>{device.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">型号</span>
              <span>{device.model}</span>
            </div>
            {device.imei && (
              <div className="flex justify-between">
                <span className="text-gray-500">IMEI</span>
                <span>{device.imei}</span>
              </div>
            )}
            {device.serialNo && (
              <div className="flex justify-between">
                <span className="text-gray-500">序列号</span>
                <span>{device.serialNo}</span>
              </div>
            )}
            {device.conditionNotes && (
              <div>
                <span className="text-gray-500">外观状况</span>
                <p className="mt-1 text-sm">{device.conditionNotes}</p>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">标签码</span>
              <span className="font-mono">{device.labelCode}</span>
            </div>
          </div>
        )}
        {canRecord && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>品牌 *</Label>
                <Input
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  placeholder="如：Apple"
                />
              </div>
              <div className="space-y-1">
                <Label>型号 *</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="如：iPhone 15 Pro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>IMEI</Label>
                <Input
                  value={form.imei}
                  onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  placeholder="可选"
                />
              </div>
              <div className="space-y-1">
                <Label>序列号</Label>
                <Input
                  value={form.serialNo}
                  onChange={(e) => setForm({ ...form, serialNo: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>外观状况</Label>
              <Textarea
                value={form.conditionNotes}
                onChange={(e) => setForm({ ...form, conditionNotes: e.target.value })}
                placeholder="描述设备外观状况"
                rows={2}
              />
            </div>
            <Button onClick={handleSubmit} disabled={loading || !form.brand.trim() || !form.model.trim()}>
              {loading ? '保存中...' : '录入设备'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
