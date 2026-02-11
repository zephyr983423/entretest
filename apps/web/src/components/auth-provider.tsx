'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, getAuth, setAuth, clearAuth } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_PATHS = ['/login', '/confirm'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth();
    if (auth.user && auth.token) {
      setUser(auth.user);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/work-orders');
      }
    }
  }, [user, loading, pathname, router]);

  const login = (token: string, userData: User) => {
    setAuth(userData, token);
    setUser(userData);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
