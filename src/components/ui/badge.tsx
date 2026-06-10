import * as React from 'react';
import { cn } from '@/lib/utils';

const tones = {
  default: 'border-border bg-secondary text-secondary-foreground',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700',
};

export function Badge({
  tone = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tones[tone], className)}
      {...props}
    />
  );
}
