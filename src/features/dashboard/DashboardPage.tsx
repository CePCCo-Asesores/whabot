import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Bot, Building2, Database, MessageSquareText, ShieldAlert, Smartphone, TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/resources';
import { formatNumber, formatPercent } from '@/lib/utils';

const COLORS = ['#0369a1', '#0f766e', '#b45309', '#b91c1c', '#475569'];

export function DashboardPage() {
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: api.organizations });
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30_000 });
  const credentialErrorsQuery = useQuery({ queryKey: ['credential-errors'], queryFn: api.credentialErrors });
  const dlqCountQuery = useQuery({ queryKey: ['dlq-count'], queryFn: api.dlqCount, retry: false });

  const orgs = useMemo(() => orgsQuery.data ?? [], [orgsQuery.data]);
  const bots = useMemo(() => botsQuery.data ?? [], [botsQuery.data]);
  const credentialErrors = credentialErrorsQuery.data ?? [];
  const totalChannels = bots.reduce((sum, bot) => sum + (bot.channels?.length ?? 0), 0);
  const totalQuota = orgs.reduce((sum, org) => sum + org.msgQuota, 0);
  const totalUsed = orgs.reduce((sum, org) => sum + org.msgUsed, 0);

  const usageData = useMemo(
    () =>
      orgs.map((org) => ({
        name: org.name,
        used: org.msgUsed,
        quota: org.msgQuota,
      })),
    [orgs],
  );

  const statusData = useMemo(() => {
    const counts = bots.reduce<Record<string, number>>((acc, bot) => {
      acc[bot.status] = (acc[bot.status] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [bots]);

  return (
    <>
      <PageHeader
        title="Dashboard operativo"
        description="Vista de salud, capacidad, credenciales y superficie configurada. Los paneles de conversaciones y series temporales se activan cuando exista endpoint dedicado."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Organizaciones" value={formatNumber(orgs.length)} icon={Building2} />
        <MetricCard title="Agentes" value={formatNumber(bots.length)} icon={Bot} detail={`${formatNumber(totalChannels)} canales asociados`} />
        <MetricCard
          title="Uso mensual"
          value={totalQuota ? formatPercent(totalUsed / totalQuota) : 'Ilimitado'}
          icon={MessageSquareText}
          detail={`${formatNumber(totalUsed)} mensajes usados`}
          tone={totalQuota && totalUsed / totalQuota > 0.85 ? 'warning' : 'default'}
        />
        <MetricCard
          title="DLQ"
          value={dlqCountQuery.isError ? 'Sin permiso' : formatNumber(dlqCountQuery.data?.count ?? 0)}
          icon={TriangleAlert}
          tone={(dlqCountQuery.data?.count ?? 0) > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Uso por organizacion</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {usageData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="used" name="Usados" fill="#0369a1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quota" name="Cuota" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sin organizaciones" description="El API aun no devolvio organizaciones para graficar uso." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de agentes</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {statusData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={3}>
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sin agentes" description="Crea un agente para ver distribucion por estado." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthQuery.isError ? (
              <ErrorState error={healthQuery.error} onRetry={() => healthQuery.refetch()} />
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2 text-sm"><Database className="h-4 w-4" /> PostgreSQL</span>
                  <StatusBadge status={healthQuery.data?.db ? 'ok' : 'degraded'} />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2 text-sm"><Database className="h-4 w-4" /> Redis / BullMQ</span>
                  <StatusBadge status={healthQuery.data?.redis ? 'ok' : 'degraded'} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credenciales en error</CardTitle>
          </CardHeader>
          <CardContent>
            {credentialErrors.length ? (
              <div className="space-y-2">
                {credentialErrors.map((bot) => (
                  <div key={bot.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{bot.name}</p>
                      <StatusBadge status={bot.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {bot.llmProvider ?? 'provider sin definir'} · {bot.llmModel ?? 'modelo sin definir'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Sin errores de credenciales" description="No hay agentes en estado credential_error." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos no expuestos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <EmptyState
              title="Conversaciones recientes no disponibles"
              description="TODO API: falta endpoint para listar conversaciones y mensajes recientes sin export ARCO."
            />
            <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
              <div className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Safety blocks y latencia por fecha viven en Prometheus text; se ven en Metricas con admin key.</span>
              </div>
            </div>
            <div className="rounded-md border bg-sky-50 p-3 text-sm text-sky-800">
              <div className="flex gap-2">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Templates de WhatsApp no tienen endpoint de catalogo; se opera envio validado en Templates.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {orgsQuery.isError || botsQuery.isError ? (
        <div className="mt-4">
          <ErrorState error={orgsQuery.error ?? botsQuery.error ?? new Error('Error de dashboard')} />
        </div>
      ) : null}
    </>
  );
}
