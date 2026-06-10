import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BotPicker } from '@/components/common/BotPicker';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import type { EndUser } from '@/lib/types';
import { compactJson, formatDate } from '@/lib/utils';

const rectifySchema = z.object({
  locale: z.string().min(2).max(10).optional(),
});

type RectifyValues = z.infer<typeof rectifySchema>;

export function CompliancePage() {
  const queryClient = useQueryClient();
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const [botId, setBotId] = useState('');
  const [pausedFilter, setPausedFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<EndUser | null>(null);
  const paused = pausedFilter === '' ? undefined : pausedFilter === 'true';
  const usersQuery = useQuery({ queryKey: ['users', botId, paused], queryFn: () => api.users(botId, paused), enabled: Boolean(botId) });
  const exportUser = useMutation({ mutationFn: (userId: string) => api.exportUser(botId, userId) });
  const form = useForm<RectifyValues>({ resolver: zodResolver(rectifySchema), values: { locale: selectedUser?.locale ?? '' } });

  useEffect(() => {
    if (!botId && botsQuery.data?.[0]) setBotId(botsQuery.data[0].id);
  }, [botId, botsQuery.data]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users', botId] });
  const rectify = useMutation({
    mutationFn: (values: RectifyValues) => api.rectifyUser(botId, selectedUser!.id, values),
    onSuccess: invalidate,
  });
  const erase = useMutation({
    mutationFn: (userId: string) => api.eraseUser(botId, userId),
    onSuccess: () => {
      setSelectedUser(null);
      exportUser.reset();
      invalidate();
    },
  });
  const patchUser = useMutation({
    mutationFn: ({ userId, paused }: { userId: string; paused: boolean }) => api.patchUser(botId, userId, paused),
    onSuccess: invalidate,
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const filteredUsers = useMemo(
    () => users.filter((user) => !search || user.id.toLowerCase().includes(search.toLowerCase()) || user.locale?.toLowerCase().includes(search.toLowerCase())),
    [search, users],
  );

  const columns = useMemo(
    () => [
      { key: 'id', header: 'Sujeto', render: (row: EndUser) => <button className="font-mono text-xs text-primary hover:underline" onClick={() => setSelectedUser(row)}>{row.id}</button> },
      { key: 'locale', header: 'Locale', render: (row: EndUser) => row.locale ?? 'n/a' },
      { key: 'paused', header: 'Estado', render: (row: EndUser) => <StatusBadge status={row.paused ? 'paused' : 'active'} /> },
      { key: 'createdAt', header: 'Alta', render: (row: EndUser) => formatDate(row.createdAt) },
      {
        key: 'actions',
        header: '',
        render: (row: EndUser) => (
          <Button size="sm" variant="outline" type="button" onClick={() => patchUser.mutate({ userId: row.id, paused: !row.paused })}>
            {row.paused ? 'Reactivar' : 'Pausar'}
          </Button>
        ),
      },
    ],
    [patchUser],
  );

  return (
    <>
      <PageHeader
        title="Compliance / ARCO"
        description="Acceso, rectificacion y supresion de datos personales por sujeto permitido. Cada accion usa endpoints auditados del backend."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Sujetos" value={users.length} icon={ShieldCheck} />
        <MetricCard title="Pausados" value={users.filter((user) => user.paused).length} />
        <MetricCard title="Operacion legal" value="Auditada" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Busqueda</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BotPicker value={botId} onChange={setBotId} />
            <div>
              <label className="field-label">Estado</label>
              <Select value={pausedFilter} onChange={(event) => setPausedFilter(event.target.value)}>
                <option value="">todos</option>
                <option value="false">activos</option>
                <option value="true">pausados</option>
              </Select>
            </div>
            <div>
              <label className="field-label">Identificador permitido</label>
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="user id o locale" />
              <p className="field-help">TODO API: no existe busqueda por telefono/email; el backend solo expone ids no PII.</p>
            </div>
          </CardContent>
        </Card>

        <DataTable
          columns={columns}
          data={filteredUsers}
          getRowKey={(row) => row.id}
          empty={<EmptyState title="Sin sujetos" description="No hay usuarios finales para los filtros actuales." />}
        />
      </div>
      {usersQuery.isError ? <div className="mt-4"><ErrorState error={usersQuery.error} /></div> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Acciones ARCO</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedUser ? (
              <>
                <div className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Sujeto seleccionado</p>
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{selectedUser.id}</p>
                </div>
                <form className="flex gap-2" onSubmit={form.handleSubmit((values) => rectify.mutate(values))}>
                  <Input placeholder="locale" {...form.register('locale')} />
                  <Button disabled={rectify.isPending} type="submit"><Save className="h-4 w-4" /> Rectificar</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => exportUser.mutate(selectedUser.id)}>
                    <Download className="h-4 w-4" /> Exportar datos
                  </Button>
                  <ConfirmDialog
                    title="Borrar datos personales"
                    description="Supresion ARCO irreversible. Esta accion elimina datos del sujeto y queda auditada."
                    confirmText={selectedUser.id}
                    confirmLabel="Borrar datos"
                    destructive
                    onConfirm={() => erase.mutateAsync(selectedUser.id)}
                  >
                    <Button type="button" variant="destructive"><Trash2 className="h-4 w-4" /> Borrar datos</Button>
                  </ConfirmDialog>
                </div>
                <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
                  Verifica identidad y fundamento legal antes de exportar, rectificar o borrar datos.
                </div>
              </>
            ) : (
              <EmptyState title="Selecciona un sujeto" />
            )}
            {rectify.isError ? <ErrorState error={rectify.error} /> : null}
            {erase.isError ? <ErrorState error={erase.error} /> : null}
            {patchUser.isError ? <ErrorState error={patchUser.error} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Export</CardTitle></CardHeader>
          <CardContent>
            {exportUser.isPending ? <p className="text-sm text-muted-foreground">Exportando...</p> : null}
            {exportUser.data ? (
              <pre className="max-h-[560px] overflow-auto rounded-md bg-muted p-4 text-xs">{compactJson(exportUser.data)}</pre>
            ) : (
              <EmptyState title="Sin export cargado" description="Exporta un sujeto para revisar el paquete ARCO." />
            )}
            {exportUser.isError ? <div className="mt-3"><ErrorState error={exportUser.error} /></div> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
