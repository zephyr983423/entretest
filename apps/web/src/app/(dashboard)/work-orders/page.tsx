'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { workOrdersApi, usersApi } from '@/lib/api-client';
import { WorkOrderStatus, Role, RepairType, Urgency, WarrantyStatus } from '@repo/shared';
import {
  STATUS_LABELS_ZH,
  STATUS_COLORS,
  REPAIR_TYPE_LABELS_ZH,
  URGENCY_LABELS_ZH,
  WARRANTY_LABELS_ZH,
  URGENCY_COLORS,
} from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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

type SortField = 'createdAt' | 'updatedAt' | 'status' | 'urgency' | 'customerName';

export default function WorkOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workOrders, setWorkOrders] = useState<WorkOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRepairType, setFilterRepairType] = useState<string>('');
  const [filterUrgency, setFilterUrgency] = useState<string>('');
  const [filterWarranty, setFilterWarranty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch ship dialog
  const [batchShipOpen, setBatchShipOpen] = useState(false);
  const [trackingNos, setTrackingNos] = useState<Record<string, string>>({});
  const [batchShipping, setBatchShipping] = useState(false);

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

  const loadWorkOrders = useCallback(async () => {
    try {
      setLoading(true);
      const result = await workOrdersApi.list({
        status: filterStatus && filterStatus !== 'ALL' ? filterStatus : undefined,
        repairType: filterRepairType && filterRepairType !== 'ALL' ? filterRepairType : undefined,
        urgency: filterUrgency && filterUrgency !== 'ALL' ? filterUrgency : undefined,
        warrantyStatus: filterWarranty && filterWarranty !== 'ALL' ? filterWarranty : undefined,
        q: searchQuery || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
      setWorkOrders(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
      setSelectedIds(new Set());
    } catch (error: any) {
      showToast(error.message || '加载工单失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterRepairType, filterUrgency, filterWarranty, searchQuery, page, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterRepairType, filterUrgency, filterWarranty, searchQuery, pageSize]);

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

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleInlineUrgency = async (orderId: string, newUrgency: string) => {
    try {
      await workOrdersApi.update(orderId, { urgency: newUrgency } as any);
      setWorkOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, urgency: newUrgency as Urgency } : o),
      );
    } catch (error: any) {
      showToast(error.message || '更新紧急程度失败', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === workOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(workOrders.map((o) => o.id)));
    }
  };

  const readyToShipSelected = workOrders.filter(
    (o) => selectedIds.has(o.id) && o.status === WorkOrderStatus.READY_TO_SHIP,
  );

  const openBatchShip = () => {
    const initTracking: Record<string, string> = {};
    readyToShipSelected.forEach((o) => { initTracking[o.id] = ''; });
    setTrackingNos(initTracking);
    setBatchShipOpen(true);
  };

  const handleBatchShip = async () => {
    const ids = readyToShipSelected.map((o) => o.id);
    if (ids.some((id) => !trackingNos[id]?.trim())) {
      showToast('请为所有工单填写快递单号', 'error');
      return;
    }
    setBatchShipping(true);
    try {
      const trimmedNos: Record<string, string> = {};
      ids.forEach((id) => { trimmedNos[id] = trackingNos[id].trim(); });
      const result = await workOrdersApi.batchShip({ workOrderIds: ids, outboundTrackingNos: trimmedNos });
      const successCount = result.results.filter((r) => r.success).length;
      const failCount = result.results.filter((r) => !r.success).length;
      showToast(`批量发货完成：${successCount}成功，${failCount}失败`, successCount > 0 ? 'success' : 'error');
      setBatchShipOpen(false);
      loadWorkOrders();
    } catch (error: any) {
      showToast(error.message || '批量发货失败', 'error');
    } finally {
      setBatchShipping(false);
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const navigateToDetail = (id: string) => router.push(`/work-orders/${id}`);

  const isOwner = user?.role === Role.OWNER;

  // Terminal statuses where urgency cannot be changed
  const urgencyReadonly = new Set<string>([
    WorkOrderStatus.DELIVERED,
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.CLOSED_ABNORMAL,
  ]);

  if (loading && workOrders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  const createDialog = user ? (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogTrigger asChild>
        <Button>新建工单</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建工单</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {(user.role === Role.OWNER || user.role === Role.STAFF) && (
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
          <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
          <Button
            onClick={handleCreate}
            disabled={creating || ((user.role === Role.OWNER || user.role === Role.STAFF) && !newOrder.customerUserId)}
          >
            {creating ? '创建中...' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  // OWNER: Table View
  if (isOwner) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">工单管理</h1>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && readyToShipSelected.length > 0 && (
              <Button variant="default" onClick={openBatchShip}>
                批量发货 ({readyToShipSelected.length})
              </Button>
            )}
            {selectedIds.size > 0 && (
              <span className="text-sm text-gray-500">已选 {selectedIds.size} 项</span>
            )}
            {createDialog}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="搜索工单号、客户名、快递单号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus || 'ALL'} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              {Object.values(WorkOrderStatus).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS_ZH[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRepairType || 'ALL'} onValueChange={setFilterRepairType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="维修类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部类型</SelectItem>
              {Object.values(RepairType).map((t) => (
                <SelectItem key={t} value={t}>{REPAIR_TYPE_LABELS_ZH[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterUrgency || 'ALL'} onValueChange={setFilterUrgency}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="紧急程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {Object.values(Urgency).map((u) => (
                <SelectItem key={u} value={u}>{URGENCY_LABELS_ZH[u]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterWarranty || 'ALL'} onValueChange={setFilterWarranty}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="保修状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              {Object.values(WarrantyStatus).map((w) => (
                <SelectItem key={w} value={w}>{WARRANTY_LABELS_ZH[w]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={workOrders.length > 0 && selectedIds.size === workOrders.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>工单号</TableHead>
                <TableHead>
                  <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('status')}>
                    状态<SortIndicator field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('customerName')}>
                    客户<SortIndicator field="customerName" />
                  </button>
                </TableHead>
                <TableHead>电话</TableHead>
                <TableHead>维修类型</TableHead>
                <TableHead>
                  <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('urgency')}>
                    紧急程度<SortIndicator field="urgency" />
                  </button>
                </TableHead>
                <TableHead>保修状态</TableHead>
                <TableHead>设备</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>
                  <button className="flex items-center hover:text-gray-900" onClick={() => handleSort('createdAt')}>
                    创建时间<SortIndicator field="createdAt" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                    暂无工单
                  </TableCell>
                </TableRow>
              ) : (
                workOrders.map((order) => {
                  const goDetail = () => navigateToDetail(order.id);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      data-state={selectedIds.has(order.id) ? 'selected' : undefined}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        <span className="text-blue-600 hover:underline font-medium">
                          {order.orderNo || order.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        <Badge variant={STATUS_COLORS[order.status] || 'default'}>
                          {STATUS_LABELS_ZH[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.customerName || order.customer?.name || '-'}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.customerPhone || '-'}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.repairType ? REPAIR_TYPE_LABELS_ZH[order.repairType] : '-'}
                      </TableCell>
                      {/* Inline editable urgency */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {urgencyReadonly.has(order.status) ? (
                          <span className={order.urgency ? URGENCY_COLORS[order.urgency] : ''} onClick={goDetail}>
                            {order.urgency ? URGENCY_LABELS_ZH[order.urgency] : '-'}
                          </span>
                        ) : (
                          <Select
                            value={order.urgency || 'NORMAL'}
                            onValueChange={(v) => handleInlineUrgency(order.id, v)}
                          >
                            <SelectTrigger className="h-7 w-[88px] text-xs border-gray-200 bg-white hover:bg-gray-50 px-2 gap-1">
                              <SelectValue>
                                <span className={order.urgency ? URGENCY_COLORS[order.urgency] : 'text-gray-500'}>
                                  {order.urgency ? URGENCY_LABELS_ZH[order.urgency] : '普通'}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(Urgency).map((u) => (
                                <SelectItem key={u} value={u}>
                                  <span className={URGENCY_COLORS[u]}>{URGENCY_LABELS_ZH[u]}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.warrantyStatus ? WARRANTY_LABELS_ZH[order.warrantyStatus] : '-'}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.device ? `${order.device.brand} ${order.device.model}` : '-'}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {order.assignedTo?.name || '-'}
                      </TableCell>
                      <TableCell onClick={goDetail}>
                        {new Date(order.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 {total} 条，第 {page}/{totalPages} 页
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10条/页</SelectItem>
                <SelectItem value="20">20条/页</SelectItem>
                <SelectItem value="50">50条/页</SelectItem>
                <SelectItem value="100">100条/页</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              上一页
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              下一页
            </Button>
          </div>
        </div>

        {/* Batch Ship Dialog */}
        <Dialog open={batchShipOpen} onOpenChange={setBatchShipOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>批量发货</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-500">
                为以下 {readyToShipSelected.length} 个待发货工单填写快递单号：
              </p>
              {readyToShipSelected.map((order) => (
                <div key={order.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-32 shrink-0">
                    {order.orderNo || order.id.slice(0, 8)}
                  </span>
                  <Input
                    placeholder="快递单号"
                    value={trackingNos[order.id] || ''}
                    onChange={(e) => setTrackingNos({ ...trackingNos, [order.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBatchShipOpen(false)}>取消</Button>
              <Button onClick={handleBatchShip} disabled={batchShipping}>
                {batchShipping ? '发货中...' : '确认发货'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // STAFF/CUSTOMER: Card View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">工单列表</h1>
        {createDialog}
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="搜索工单号、客户名、快递单号..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterStatus || 'ALL'} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部状态</SelectItem>
            {Object.values(WorkOrderStatus).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS_ZH[s]}</SelectItem>
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
              onClick={() => navigateToDetail(order.id)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            上一页
          </Button>
          <span className="text-sm text-gray-500">第 {page}/{totalPages} 页</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
