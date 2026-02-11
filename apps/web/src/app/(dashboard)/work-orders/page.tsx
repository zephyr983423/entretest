'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { workOrdersApi, usersApi } from '@/lib/api-client';
import { WorkOrderStatus, Role } from '@repo/shared';
import { STATUS_LABELS_ZH, STATUS_COLORS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import type { WorkOrderListItem } from '@/components/work-order/types';

export default function WorkOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [newOrder, setNewOrder] = useState({
    orderNo: '',
    customerUserId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
  });

  const loadWorkOrders = async () => {
    try {
      const result = await workOrdersApi.list({
        status: (filterStatus && filterStatus !== 'ALL') ? filterStatus : undefined,
        q: searchQuery || undefined,
      });
      setWorkOrders(result.items);
    } catch (error: any) {
      showToast(error.message || '加载工单失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkOrders();
  }, [filterStatus, searchQuery]);

  // Load customers for OWNER create form
  useEffect(() => {
    if (user?.role === Role.OWNER && createOpen) {
      usersApi.list('CUSTOMER').then(setCustomers).catch(() => {});
    }
  }, [createOpen, user?.role]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data: Record<string, string | undefined> = {
        notes: newOrder.notes || undefined,
        customerName: newOrder.customerName || undefined,
        customerPhone: newOrder.customerPhone || undefined,
        customerAddress: newOrder.customerAddress || undefined,
        orderNo: newOrder.orderNo || undefined,
      };

      // OWNER/STAFF must provide customerUserId
      if (user?.role === Role.OWNER || user?.role === Role.STAFF) {
        data.customerUserId = newOrder.customerUserId;
      }

      await workOrdersApi.create(data);
      showToast('工单创建成功', 'success');
      setCreateOpen(false);
      setNewOrder({ orderNo: '', customerUserId: '', customerName: '', customerPhone: '', customerAddress: '', notes: '' });
      loadWorkOrders();
    } catch (error: any) {
      showToast(error.message || '创建工单失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  // All roles can create work orders
  const canCreate = !!user;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">工单列表</h1>
        {canCreate && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>新建工单</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建工单</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {(user?.role === Role.OWNER || user?.role === Role.STAFF) && (
                  <div className="space-y-2">
                    <Label>客户 *</Label>
                    <Select
                      value={newOrder.customerUserId}
                      onValueChange={(v) => setNewOrder({ ...newOrder, customerUserId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择客户" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>工单号（可选）</Label>
                  <Input
                    value={newOrder.orderNo}
                    onChange={(e) => setNewOrder({ ...newOrder, orderNo: e.target.value })}
                    placeholder="可选，自定义工单号"
                  />
                </div>
                <div className="space-y-2">
                  <Label>客户姓名</Label>
                  <Input
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>客户电话</Label>
                  <Input
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>客户地址</Label>
                  <Input
                    value={newOrder.customerAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, customerAddress: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Textarea
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || ((user?.role === Role.OWNER || user?.role === Role.STAFF) && !newOrder.customerUserId)}
                >
                  {creating ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="搜索工单号、客户名、快递单号..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            {Object.values(WorkOrderStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS_ZH[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  <div className="flex justify-between">
                    <span className="text-gray-500">客户：</span>
                    <span>{order.customerName || order.customer?.name || '-'}</span>
                  </div>
                  {order.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">电话：</span>
                      <span>{order.customerPhone}</span>
                    </div>
                  )}
                  {order.assignedTo && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">负责人：</span>
                      <span>{order.assignedTo.name}</span>
                    </div>
                  )}
                  {order.device && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">设备：</span>
                      <span>{order.device.brand} {order.device.model}</span>
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
