'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { workOrdersApi } from '@/lib/api-client';
import { STATUS_LABELS_ZH, STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import type { WorkOrderListItem } from '@/components/work-order/types';

export default function MyWorkOrdersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWorkOrders = async () => {
      try {
        const result = await workOrdersApi.list();
        setWorkOrders(result.items);
      } catch (error: any) {
        showToast(error.message || '加载工单失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadWorkOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">我的工单</h1>

      {workOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">暂无工单</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workOrders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/work-orders/${order.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {order.orderNo || order.id.slice(0, 8)}
                  </CardTitle>
                  <Badge variant={STATUS_COLORS[order.status] || 'default'}>
                    {STATUS_LABELS_ZH[order.status] || order.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {order.device && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">设备：</span>
                      <span>
                        {order.device.brand} {order.device.model}
                      </span>
                    </div>
                  )}
                  {order.customerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">客户：</span>
                      <span>{order.customerName}</span>
                    </div>
                  )}
                  {order.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">负责人：</span>
                      <span>{order.assignedTo.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">创建时间：</span>
                    <span>{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
