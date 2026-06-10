import { Card, CardContent } from '@/components/ui/card';
import { formatDate, compactJson } from '@/lib/utils';
import type { AuditLogEntry } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function AuditEventCard({ event }: { event: AuditLogEntry }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{event.action}</p>
            <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
          </div>
          <StatusBadge status={event.actorRole ?? 'system'} />
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <span>Actor: {event.actorId ?? 'sistema'}</span>
          <span>Target: {event.targetType}</span>
          <span>ID: {event.targetId ?? 'n/a'}</span>
        </div>
        {event.metadata ? (
          <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
            {compactJson(event.metadata)}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
