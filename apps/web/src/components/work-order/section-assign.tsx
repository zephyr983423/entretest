'use client';

import { useState, useEffect } from 'react';
import { Action } from '@repo/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { workOrdersApi, usersApi } from '@/lib/api-client';
import type { WorkOrderDetail } from './types';

interface SectionAssignProps {
  workOrder: WorkOrderDetail;
  onUpdated: (wo: WorkOrderDetail) => void;
}

export function SectionAssign({ workOrder, onUpdated }: SectionAssignProps) {
  const canAssign = workOrder.availableActions.includes(Action.ASSIGN);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStaff, setSelectedStaff] = useState(workOrder.assignedToUserId || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canAssign) {
      usersApi.list('STAFF').then(setStaffList).catch(() => {});
    }
  }, [canAssign]);

  const handleAssign = async () => {
    if (!selectedStaff) return;
    setLoading(true);
    try {
      const updated = await workOrdersApi.assign(workOrder.id, selectedStaff);
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  };

  // Show read-only if already assigned
  if (!canAssign && !workOrder.assignedTo) return null;

  return (
    <Card className={canAssign ? 'border-blue-200 bg-blue-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">分配员工</CardTitle>
      </CardHeader>
      <CardContent>
        {workOrder.assignedTo && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-500">当前负责人</span>
            <span>{workOrder.assignedTo.name}</span>
          </div>
        )}
        {canAssign && (
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1">
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAssign} disabled={loading || !selectedStaff}>
              {loading ? '分配中...' : '分配'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
