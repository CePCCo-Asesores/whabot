import { clearSession, readSession } from './session';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  details?: unknown;
  requestId?: string | null;

  constructor(message: string, status: number, details?: unknown, requestId?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.requestId = requestId;
  }
}

interface RequestOptions extends RequestInit {
  adminKey?: string;
  rawText?: boolean;
}

export function endpoint(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(options.headers);
  const body = options.body;

  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  if (options.adminKey) {
    headers.set('x-admin-key', options.adminKey);
  }

  const response = await fetch(endpoint(path), {
    ...options,
    headers,
  });

  const requestId = response.headers.get('X-Request-Id');
  if (response.status === 401) {
    clearSession();
    window.dispatchEvent(new CustomEvent('chatbox:session-expired'));
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    let details: unknown;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null);
      details = payload?.details;
      message = typeof payload?.error === 'string' ? payload.error : message;
    } else {
      const text = await response.text().catch(() => '');
      if (text) message = text.slice(0, 180);
    }
    throw new ApiError(message, response.status, details, requestId);
  }

  if (response.status === 204) return undefined as T;
  if (options.rawText) return (await response.text()) as T;
  return (await response.json()) as T;
}

export function queryString(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}
