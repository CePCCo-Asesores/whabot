export function LoadingBlock({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-4 grid gap-3">
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
