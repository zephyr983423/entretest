'use client';

import { Role } from '@repo/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

const AUTH_KEY = 'auth';

export function getAuth(): AuthState {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }

  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) {
    return { user: null, token: null };
  }

  try {
    return JSON.parse(stored);
  } catch {
    return { user: null, token: null };
  }
}

export function setAuth(user: User, token: string): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  const auth = getAuth();
  return !!auth.token && !!auth.user;
}

export function getToken(): string | null {
  const auth = getAuth();
  return auth.token;
}
