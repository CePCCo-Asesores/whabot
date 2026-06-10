import { Badge } from '@/components/ui/badge';

const statusTone: Record<string, React.ComponentProps<typeof Badge>['tone']> = {
  ok: 'success',
  connected: 'success',
  active: 'success',
  draft: 'neutral',
  pending: 'warning',
  paused: 'warning',
  degraded: 'warning',
  error: 'danger',
  credential_error: 'danger',
  disabled: 'neutral',
  inactive: 'neutral',
  strict: 'danger',
  standard: 'info',
  minimal: 'neutral',
};

export function StatusBadge({ status }: { status?: string | boolean | null }) {
  const value = typeof status === 'boolean' ? (status ? 'configurado' : 'pendiente') : status || 'desconocido';
  const tone = statusTone[String(value)] ?? (status === true ? 'success' : status === false ? 'warning' : 'default');
  return <Badge tone={tone}>{String(value).replace(/_/g, ' ')}</Badge>;
}
