import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, LockKeyhole, MessageSquareText, ShieldAlert, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/resources';
import { metricSeries, metricSum, parsePrometheus } from '@/lib/metrics';
import { formatDate, formatNumber } from '@/lib/utils';

export function MetricsPage() {
  const [adminKeyDraft, setAdminKeyDraft] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30_000 });
  const metricsQuery = useQuery({
    queryKey: ['metrics', adminKey],
    queryFn: () => api.metrics(adminKey),
    enabled: Boolean(adminKey),
    retry: false,
  });

  const metrics = useMemo(() => parsePrometheus(metricsQuery.data ?? ''), [metricsQuery.data]);
  const orgMessages = metricSeries(metrics, 'chatbox_org_messages_processed_total');
  const orgSafety = metricSeries(metrics, 'chatbox_org_safety_blocks_total');
  const llmErrors = metricSeries(metrics, 'chatbox_org_llm_errors_total');

  return (
    <>
      <PageHeader
        title="Metricas"
        description="Prometheus text exposition del backend. La admin key se mantiene solo en memoria de esta pestaña."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Health" value={<StatusBadge status={healthQuery.data?.status ?? 'pending'} />} icon={Activity} />
        <MetricCard title="Mensajes procesados" value={formatNumber(metricSum(metrics, 'chatbox_messages_processed_total'))} icon={MessageSquareText} />
        <MetricCard title="Safety blocks" value={formatNumber(metricSum(metrics, 'chatbox_safety_blocks_total'))} icon={ShieldAlert} />
        <MetricCard title="DLQ depth" value={formatNumber(metricSum(metrics, 'chatbox_dlq_depth'))} icon={TriangleAlert} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Acceso a /metrics</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>DB</span>
                <StatusBadge status={healthQuery.data?.db ? 'ok' : 'degraded'} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Redis</span>
                <StatusBadge status={healthQuery.data?.redis ? 'ok' : 'degraded'} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Ultimo check: {formatDate(healthQuery.data?.ts)}</p>
            </div>
            <div>
              <label className="field-label">Admin API key</label>
              <div className="flex gap-2">
                <Input type="password" autoComplete="off" value={adminKeyDraft} onChange={(event) => setAdminKeyDraft(event.target.value)} />
                <Button type="button" onClick={() => setAdminKey(adminKeyDraft)}>
                  <LockKeyhole className="h-4 w-4" /> Usar
                </Button>
              </div>
              <p className="field-help">No se persiste en localStorage/sessionStorage.</p>
            </div>
            {metricsQuery.isError ? <ErrorState error={metricsQuery.error} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mensajes por tenant</CardTitle></CardHeader>
          <CardContent className="h-80">
            {orgMessages.length ? <MetricBar data={orgMessages} /> : <EmptyState title="Sin serie" description="Carga /metrics con admin key o espera trafico por tenant." />}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Safety blocks por tenant</CardTitle></CardHeader>
          <CardContent className="h-80">
            {orgSafety.length ? <MetricBar data={orgSafety} /> : <EmptyState title="Sin safety blocks" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>LLM errors por tenant</CardTitle></CardHeader>
          <CardContent className="h-80">
            {llmErrors.length ? <MetricBar data={llmErrors} /> : <EmptyState title="Sin errores LLM" />}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle>Prometheus raw</CardTitle></CardHeader>
        <CardContent>
          {metricsQuery.data ? (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">{metricsQuery.data}</pre>
          ) : (
            <EmptyState title="Metricas no cargadas" description="Introduce admin key para consultar /metrics." />
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MetricBar({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
