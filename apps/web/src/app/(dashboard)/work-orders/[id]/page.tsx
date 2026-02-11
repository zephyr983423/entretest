'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { workOrdersApi } from '@/lib/api-client';
import { STATUS_LABELS_ZH, STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { WorkOrderForm } from '@/components/work-order/work-order-form';
import type { WorkOrderDetail } from '@/components/work-order/types';

export default function WorkOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWorkOrder = async () => {
    try {
      const data = await workOrdersApi.get(params.id as string);
      setWorkOrder(data);
    } catch (error: any) {
      showToast(error.message || '加载工单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrder();
  }, [params.id]);

  const handleUpdated = (updated: WorkOrderDetail) => {
    setWorkOrder(updated);
    showToast('操作成功', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-red-500">工单不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
        <h1 className="text-2xl font-bold">
          {workOrder.orderNo || workOrder.id.slice(0, 8)}
        </h1>
        <Badge variant={STATUS_COLORS[workOrder.status] || 'default'}>
          {STATUS_LABELS_ZH[workOrder.status] || workOrder.status}
        </Badge>
      </div>

      <WorkOrderForm workOrder={workOrder} onUpdated={handleUpdated} />
    </div>
  );
}
