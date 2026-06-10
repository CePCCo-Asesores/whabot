/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/resources';
import { buildStoredSession, clearSession, readSession, writeSession } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

interface AuthContextValue {
  token: string | null;
  user: SessionUser | null;
  selectedOrgId: string | null;
  setSelectedOrgId: (orgId: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, orgName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  const initial = typeof window !== 'undefined' ? readSession() : null;
  const [token, setToken] = useState(initial?.token ?? null);
  const [user, setUser] = useState<SessionUser | null>(initial?.user ?? null);
  const [selectedOrgId, setSelectedOrgIdState] = useState<string | null>(initial?.user.orgId ?? null);

  useEffect(() => {
    function expire() {
      setToken(null);
      setUser(null);
      setSelectedOrgIdState(null);
      queryClient.clear();
    }
    window.addEventListener('chatbox:session-expired', expire);
    return () => window.removeEventListener('chatbox:session-expired', expire);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => {
    const applySession = (session: ReturnType<typeof readSession>) => {
      setToken(session?.token ?? null);
      setUser(session?.user ?? null);
      setSelectedOrgIdState(session?.user.orgId ?? null);
    };

    return {
      token,
      user,
      selectedOrgId,
      setSelectedOrgId: setSelectedOrgIdState,
      login: async (email: string, password: string) => {
        const response = await api.login({ email, password });
        const session = buildStoredSession(response, email);
        writeSession(session);
        applySession(session);
        queryClient.invalidateQueries();
      },
      register: async (email: string, password: string, orgName: string) => {
        const response = await api.register({ email, password, orgName });
        const session = buildStoredSession(response, email);
        writeSession(session);
        applySession(session);
        queryClient.invalidateQueries();
      },
      logout: () => {
        clearSession();
        applySession(null);
        queryClient.clear();
      },
    };
  }, [queryClient, selectedOrgId, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
