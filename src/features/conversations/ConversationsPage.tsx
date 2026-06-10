import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquareText, ShieldAlert, Star, Users } from 'lucide-react';
import { BotPicker } from '@/components/common/BotPicker';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import type { CrisisEvent, EndUser, Feedback } from '@/lib/types';
import { formatDate } from '@/lib/utils';

export function ConversationsPage() {
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const [botId, setBotId] = useState('');
  const [pausedFilter, setPausedFilter] = useState<string>('');
  const paused = pausedFilter === '' ? undefined : pausedFilter === 'true';
  const usersQuery = useQuery({ queryKey: ['users', botId, paused], queryFn: () => api.users(botId, paused), enabled: Boolean(botId) });
  const crisisQuery = useQuery({ queryKey: ['crisis-events', botId], queryFn: () => api.crisisEvents(botId, 50), enabled: Boolean(botId) });
  const feedbackQuery = useQuery({ queryKey: ['feedback', botId], queryFn: () => api.feedback(botId, 100), enabled: Boolean(botId) });
  const feedbackStatsQuery = useQuery({ queryKey: ['feedback-stats', botId], queryFn: () => api.feedbackStats(botId), enabled: Boolean(botId) });

  useEffect(() => {
    if (!botId && botsQuery.data?.[0]) setBotId(botsQuery.data[0].id);
  }, [botId, botsQuery.data]);

  const userColumns = useMemo(
    () => [
      { key: 'id', header: 'Usuario final', render: (row: EndUser) => <span className="font-mono text-xs">{row.id}</span> },
      { key: 'locale', header: 'Locale', render: (row: EndUser) => row.locale ?? 'n/a' },
      { key: 'paused', header: 'Estado', render: (row: EndUser) => <StatusBadge status={row.paused ? 'paused' : 'active'} /> },
      { key: 'createdAt', header: 'Creado', render: (row: EndUser) => formatDate(row.createdAt) },
    ],
    [],
  );
  const crisisColumns = useMemo(
    () => [
      { key: 'category', header: 'Categoria', render: (row: CrisisEvent) => row.category },
      { key: 'action', header: 'Accion', render: (row: CrisisEvent) => row.actionTaken },
      { key: 'date', header: 'Fecha', render: (row: CrisisEvent) => formatDate(row.detectedAt) },
    ],
    [],
  );
  const feedbackColumns = useMemo(
    () => [
      { key: 'rating', header: 'Rating', render: (row: Feedback) => `${row.rating}/5` },
      { key: 'message', header: 'Message ID', render: (row: Feedback) => <span className="font-mono text-xs">{row.messageId}</span> },
      { key: 'date', header: 'Fecha', render: (row: Feedback) => formatDate(row.createdAt) },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Conversaciones"
        description="El API actual expone usuarios finales, feedback y eventos de crisis; no expone listado de conversaciones ni mensajes operativos."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Usuarios finales" value={usersQuery.data?.length ?? 0} icon={Users} />
        <MetricCard title="Feedback" value={feedbackStatsQuery.data?.count ?? 0} icon={Star} detail={feedbackStatsQuery.data?.average ? `Promedio ${feedbackStatsQuery.data.average}` : 'Sin promedio'} />
        <MetricCard title="Crisis events" value={crisisQuery.data?.length ?? 0} icon={ShieldAlert} tone={(crisisQuery.data?.length ?? 0) > 0 ? 'warning' : 'success'} />
        <MetricCard title="Mensajes" value="TODO API" icon={MessageSquareText} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BotPicker value={botId} onChange={setBotId} />
            <div>
              <label className="field-label">Estado usuario</label>
              <Select value={pausedFilter} onChange={(event) => setPausedFilter(event.target.value)}>
                <option value="">todos</option>
                <option value="false">activos</option>
                <option value="true">pausados</option>
              </Select>
            </div>
            <EmptyState
              title="Detalle de conversacion no disponible"
              description="TODO API: falta endpoint para conversaciones, mensajes por conversacion, provider usado y safety result. No se usa export ARCO como sustituto operativo."
            />
          </CardContent>
        </Card>

        <DataTable
          columns={userColumns}
          data={usersQuery.data ?? []}
          getRowKey={(row) => row.id}
          empty={<EmptyState title="Sin usuarios finales" description="Todavia no hay sujetos conversacionales para este agente." />}
        />
      </div>

      {usersQuery.isError ? <div className="mt-4"><ErrorState error={usersQuery.error} /></div> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Crisis events</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={crisisColumns}
              data={crisisQuery.data ?? []}
              getRowKey={(row) => row.id}
              empty={<EmptyState title="Sin eventos de crisis" />}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Feedback</CardTitle></CardHeader>
          <CardContent>
            <DataTable
              columns={feedbackColumns}
              data={feedbackQuery.data ?? []}
              getRowKey={(row) => row.id}
              empty={<EmptyState title="Sin feedback" />}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
