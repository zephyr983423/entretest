'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { workOrdersApi } from '@/lib/api-client';
import {
  REPAIR_TYPE_LABELS_ZH,
  URGENCY_LABELS_ZH,
  WARRANTY_LABELS_ZH,
  URGENCY_COLORS,
} from '@/lib/constants';
import type { WorkOrderDetail } from './types';

interface SectionBasicInfoProps {
  workOrder: WorkOrderDetail;
  editableFields: string[];
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionBasicInfo({ workOrder, editableFields, onUpdated }: SectionBasicInfoProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    orderNo: workOrder.orderNo || '',
    customerName: workOrder.customerName || '',
    customerPhone: workOrder.customerPhone || '',
    customerAddress: workOrder.customerAddress || '',
    notes: workOrder.notes || '',
    repairType: workOrder.repairType || '',
    urgency: workOrder.urgency || '',
    warrantyStatus: workOrder.warrantyStatus || '',
  });

  const canEdit = editableFields.length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, string | undefined> = {};
      for (const field of editableFields) {
        if (field in form) {
          const val = form[field as keyof typeof form];
          data[field] = val || undefined;
        }
      }
      const updated = await workOrdersApi.update(workOrder.id, data);
      onUpdated(updated);
      setEditing(false);
    } catch {
      // error handled by caller via toast
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label: string, field: keyof typeof form, multiline = false) => {
    const isEditable = editing && editableFields.includes(field);
    const value = form[field];

    if (isEditable) {
      return (
        <div className="space-y-1">
          <Label className="text-sm text-gray-500">{label}</Label>
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              rows={2}
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}</span>
        <span>{value || '-'}</span>
      </div>
    );
  };

  const renderSelectField = (
    label: string,
    field: 'repairType' | 'urgency' | 'warrantyStatus',
    options: Record<string, string>,
    colorMap?: Record<string, string>,
  ) => {
    const isEditable = editing && editableFields.includes(field);
    const value = form[field];
    const displayLabel = value ? options[value] : '-';

    if (isEditable) {
      return (
        <div className="space-y-1">
          <Label className="text-sm text-gray-500">{label}</Label>
          <Select value={value || '_NONE_'} onValueChange={(v) => setForm({ ...form, [field]: v === '_NONE_' ? '' : v })}>
            <SelectTrigger>
              <SelectValue placeholder={`选择${label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_NONE_">未设置</SelectItem>
              {Object.entries(options).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    const colorClass = colorMap && value ? colorMap[value] : '';
    return (
      <div className="flex justify-between">
        <span className="text-gray-500">{label}</span>
        <span className={colorClass}>{displayLabel}</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">基本信息</CardTitle>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            编辑
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              取消
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {renderField('工单号', 'orderNo')}
        <div className="flex justify-between">
          <span className="text-gray-500">客户</span>
          <span>{workOrder.customer?.name || '-'} ({workOrder.customer?.email || '-'})</span>
        </div>
        {renderField('客户姓名', 'customerName')}
        {renderField('客户电话', 'customerPhone')}
        {renderField('客户地址', 'customerAddress')}
        {renderSelectField('维修类型', 'repairType', REPAIR_TYPE_LABELS_ZH)}
        {renderSelectField('紧急程度', 'urgency', URGENCY_LABELS_ZH, URGENCY_COLORS)}
        {renderSelectField('保修状态', 'warrantyStatus', WARRANTY_LABELS_ZH)}
        {renderField('备注', 'notes', true)}
        <div className="flex justify-between">
          <span className="text-gray-500">创建时间</span>
          <span>{new Date(workOrder.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">更新时间</span>
          <span>{new Date(workOrder.updatedAt).toLocaleString('zh-CN')}</span>
        </div>
      </CardContent>
    </Card>
  );
}
