import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeErrorMessage } from '@/lib/utils';

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold">No se pudo cargar esta seccion</p>
          <p className="mt-1 break-words">{safeErrorMessage(error)}</p>
          {onRetry ? (
            <Button className="mt-3" type="button" variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
