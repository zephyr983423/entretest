'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';
import { Button } from './ui/button';
import { Role } from '@repo/shared';

const ROLE_LABELS: Record<string, string> = {
  OWNER: '管理员',
  STAFF: '员工',
  CUSTOMER: '客户',
};

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/work-orders" className="font-bold text-xl">
              维修管理系统
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/work-orders"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                工单列表
              </Link>
              {(user.role === Role.STAFF || user.role === Role.CUSTOMER) && (
                <Link
                  href="/my-work-orders"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  我的工单
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user.name} ({ROLE_LABELS[user.role] || user.role})
            </span>
            <Button variant="outline" size="sm" onClick={logout}>
              退出
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
