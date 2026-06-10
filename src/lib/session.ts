import type { LoginResponse, RegisterResponse, Role, SessionUser } from './types';

const SESSION_KEY = 'chatbox.session.v1';

interface StoredSession {
  token: string;
  user: SessionUser;
  exp?: number;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  if (!payload) return {};
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  try {
    return JSON.parse(window.atob(padded));
  } catch {
    return {};
  }
}

function isExpired(exp?: number) {
  return exp ? Date.now() >= exp * 1000 : false;
}

export function buildStoredSession(response: LoginResponse | RegisterResponse, email?: string): StoredSession {
  const payload = decodeJwtPayload(response.token);
  const role = (response as LoginResponse).role ?? (payload.role as Role | undefined) ?? 'owner';
  const userId = response.userId ?? (payload.sub as string);
  const orgId = response.orgId ?? (payload.orgId as string);
  return {
    token: response.token,
    exp: typeof payload.exp === 'number' ? payload.exp : undefined,
    user: {
      userId,
      orgId,
      role,
      email,
      isSuperadmin: role === 'superadmin',
    },
  };
}

export function readSession(): StoredSession | null {
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session.token || !session.user || isExpired(session.exp)) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function writeSession(session: StoredSession) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY);
}
