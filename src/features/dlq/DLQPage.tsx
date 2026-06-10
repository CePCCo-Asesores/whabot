import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw, Trash2, TriangleAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/resources';
import type { DLQJob } from '@/lib/types';
import { compactJson, formatDate } from '@/lib/utils';

const purgeSchema = z.object({
  olderThanHours: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
});

type PurgeValues = z.infer<typeof purgeSchema>;

export function DLQPage() {
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({ queryKey: ['dlq'], queryFn: api.dlq, retry: false });
  const countQuery = useQuery({ queryKey: ['dlq-count'], queryFn: api.dlqCount, retry: false });
  const purgeForm = useForm<PurgeValues>({ resolver: zodResolver(purgeSchema), defaultValues: { olderThanHours: undefined } });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dlq'] });
    queryClient.invalidateQueries({ queryKey: ['dlq-count'] });
  };

  const retryJob = useMutation({ mutationFn: api.retryDLQ, onSuccess: invalidate });
  const discardJob = useMutation({ mutationFn: api.discardDLQ, onSuccess: invalidate });
  const purge = useMutation({ mutationFn: (values: PurgeValues) => api.purgeDLQ(values.olderThanHours), onSuccess: invalidate });

  const columns = useMemo(
    () => [
      { key: 'id', header: 'Job', render: (job: DLQJob) => <span className="font-mono text-xs">{job.id}</span> },
      { key: 'name', header: 'Nombre', render: (job: DLQJob) => job.name },
      { key: 'reason', header: 'Fallo', render: (job: DLQJob) => <span className="line-clamp-2 max-w-md">{job.failedReason ?? 'sin razon'}</span> },
      { key: 'attempts', header: 'Intentos', render: (job: DLQJob) => job.attemptsMade },
      { key: 'added', header: 'Agregado', render: (job: DLQJob) => formatDate(job.addedAt) },
      {
        key: 'actions',
        header: '',
        render: (job: DLQJob) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => retryJob.mutate(job.id)} type="button">
              <RefreshCcw className="h-4 w-4" /> Retry
            </Button>
            <ConfirmDialog
              title="Descartar job"
              description="El payload se elimina permanentemente de la DLQ."
              confirmLabel="Descartar"
              destructive
              onConfirm={() => discardJob.mutateAsync(job.id)}
            >
              <Button size="sm" variant="outline" type="button"><Trash2 className="h-4 w-4" /> Discard</Button>
            </ConfirmDialog>
          </div>
        ),
      },
    ],
    [discardJob, retryJob],
  );

  return (
    <>
      <PageHeader title="Dead-letter queue" description="Operaciones superadmin para inspeccionar, reintentar o descartar jobs fallidos." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="DLQ depth" value={countQuery.isError ? 'Sin permiso' : countQuery.data?.count ?? 0} icon={TriangleAlert} tone={(countQuery.data?.count ?? 0) > 0 ? 'danger' : 'success'} />
        <MetricCard title="Jobs listados" value={jobsQuery.data?.length ?? 0} />
        <MetricCard title="Permiso requerido" value="superadmin" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <DataTable
            columns={columns}
            data={jobsQuery.data ?? []}
            getRowKey={(job) => job.id}
            empty={<EmptyState title="DLQ vacia" description="No hay jobs esperando inspeccion manual." />}
          />
          {jobsQuery.isError ? <div className="mt-4"><ErrorState error={jobsQuery.error} /></div> : null}
        </div>

        <Card>
          <CardHeader><CardTitle>Payload sanitizado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(jobsQuery.data ?? []).slice(0, 3).map((job) => (
              <div key={job.id} className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium">{job.id}</p>
                <pre className="max-h-44 overflow-auto rounded bg-muted p-3 text-xs">{compactJson(job.data)}</pre>
              </div>
            ))}
            {jobsQuery.data?.length ? null : <EmptyState title="Sin payloads" />}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle>Purge</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row md:items-end" onSubmit={purgeForm.handleSubmit((values) => purge.mutate(values))}>
            <div className="md:w-64">
              <label className="field-label">Older than hours</label>
              <Input type="number" min={0} placeholder="vacio = todo" {...purgeForm.register('olderThanHours')} />
            </div>
            <ConfirmDialog
              title="Purgar DLQ"
              description="Esta accion elimina jobs fallidos. Revisa el filtro de antiguedad antes de continuar."
              confirmLabel="Purgar"
              destructive
              onConfirm={purgeForm.handleSubmit((values) => purge.mutateAsync(values))}
            >
              <Button type="button" variant="destructive"><Trash2 className="h-4 w-4" /> Purgar</Button>
            </ConfirmDialog>
          </form>
          {purge.data ? <p className="mt-3 text-sm text-muted-foreground">Removidos: {purge.data.removed}</p> : null}
          {purge.isError ? <div className="mt-3"><ErrorState error={purge.error} /></div> : null}
        </CardContent>
      </Card>
    </>
  );
}
