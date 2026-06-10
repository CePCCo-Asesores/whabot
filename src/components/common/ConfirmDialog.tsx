import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  destructive?: boolean;
  onConfirm: () => unknown | Promise<unknown>;
  children: React.ReactNode;
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  confirmText,
  destructive = false,
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const disabled = Boolean(confirmText && typed !== confirmText);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
      setTyped('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={destructive ? 'h-5 w-5 text-destructive' : 'h-5 w-5 text-amber-600'} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmText ? (
          <div className="space-y-2">
            <label className="field-label" htmlFor="confirm-text">
              Escribe {confirmText} para continuar
            </label>
            <Input id="confirm-text" value={typed} onChange={(event) => setTyped(event.target.value)} />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={disabled || busy}
            onClick={handleConfirm}
          >
            {busy ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
