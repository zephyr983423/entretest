'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublicWorkOrder {
  id: string;
  orderNo?: string;
  status: string;
  customerName?: string;
  device?: {
    brand: string;
    model: string;
  };
  repairs?: Array<{
    result: string;
    cost?: string | number;
    notes?: string;
  }>;
}

const REPAIR_RESULT_LABELS: Record<string, string> = {
  FIXED: '已修复',
  UNFIXED: '未修复',
  NA: '不适用',
};

export default function PublicConfirmPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [workOrder, setWorkOrder] = useState<PublicWorkOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [delivered, setDelivered] = useState('true');
  const [satisfied, setSatisfied] = useState('true');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const fetchWorkOrder = async () => {
      try {
        const response = await fetch(`${API_URL}/public/confirm/${token}`);
        const json = await response.json();
        if (json.error) {
          throw new Error(json.error.message || '链接无效或已过期');
        }
        setWorkOrder(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkOrder();
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const response = await fetch(`${API_URL}/public/confirm/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delivered: delivered === 'true',
          satisfied: satisfied === 'true',
          reason: reason.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message || '确认失败');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">加载中...</CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-500">错误</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-500">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-green-500">确认成功</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-gray-500">
            感谢您的确认！
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workOrder) return null;

  const latestRepair = workOrder.repairs?.[0];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>工单确认</CardTitle>
          <CardDescription>请确认您的维修工单</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">工单号：</span>
              <span className="font-medium">{workOrder.orderNo || workOrder.id.slice(0, 8)}</span>
            </div>
            {workOrder.customerName && (
              <div className="flex justify-between">
                <span className="text-gray-500">客户：</span>
                <span>{workOrder.customerName}</span>
              </div>
            )}
            {workOrder.device && (
              <div className="flex justify-between">
                <span className="text-gray-500">设备：</span>
                <span>{workOrder.device.brand} {workOrder.device.model}</span>
              </div>
            )}
            {latestRepair && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">维修结果：</span>
                  <span>{REPAIR_RESULT_LABELS[latestRepair.result] || latestRepair.result}</span>
                </div>
                {latestRepair.cost != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">维修费用：</span>
                    <span className="font-medium">¥{latestRepair.cost}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>是否已收到</Label>
              <Select value={delivered} onValueChange={setDelivered}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">是</SelectItem>
                  <SelectItem value="false">否</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>是否满意</Label>
              <Select value={satisfied} onValueChange={setSatisfied}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">满意</SelectItem>
                  <SelectItem value="false">不满意</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>原因/反馈（可选）</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="如有问题请说明"
                rows={2}
              />
            </div>
          </div>

          <Button className="w-full" onClick={handleConfirm} disabled={confirming}>
            {confirming ? '确认中...' : '提交确认'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
