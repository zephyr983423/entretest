'use client';

import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { ToastProvider } from '@/components/ui/toast';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
