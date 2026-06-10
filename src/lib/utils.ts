import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | number | Date | null) {
  if (!value) return 'Sin fecha';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha invalida';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatNumber(value?: number | null) {
  return new Intl.NumberFormat('es-MX').format(value ?? 0);
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function maskSecret(value?: string | null) {
  if (!value) return 'No configurado';
  const last4 = value.slice(-4);
  return `•••• ${last4}`;
}

export function compactJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

export function parseJsonObject(value: string) {
  if (!value.trim()) return undefined;
  const parsed = JSON.parse(value);
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Debe ser un objeto JSON');
  }
  return parsed as Record<string, unknown>;
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'No se pudo completar la operacion';
}
