import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    default: 'bg-sky-50 text-sky-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">{title}</p>
          <div className="mt-2 text-2xl font-semibold">{value}</div>
          {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-md p-2', toneClass)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
