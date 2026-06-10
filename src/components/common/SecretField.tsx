import { KeyRound } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function SecretField({ isSet, label = 'Secreto' }: { isSet?: boolean; label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border bg-muted/45 px-2.5 py-1.5 text-xs">
      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="font-medium">{label}</span>
      <StatusBadge status={Boolean(isSet)} />
    </div>
  );
}
