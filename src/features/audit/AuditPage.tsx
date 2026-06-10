import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Filter } from 'lucide-react';
import { AuditEventCard } from '@/components/common/AuditEventCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import { useAuth } from '@/features/auth/AuthProvider';

export function AuditPage() {
  const { selectedOrgId, setSelectedOrgId } = useAuth();
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [target, setTarget] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: api.organizations });
  const activeOrgId = selectedOrgId ?? orgsQuery.data?.[0]?.id;
  const auditQuery = useQuery({ queryKey: ['audit-log', activeOrgId], queryFn: () => api.auditLog(activeOrgId!, { limit: 200 }), enabled: Boolean(activeOrgId) });

  const entries = useMemo(() => auditQuery.data ?? [], [auditQuery.data]);
  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    return entries.filter((entry) => {
      if (actor && !`${entry.actorId ?? ''} ${entry.actorRole ?? ''}`.toLowerCase().includes(actor.toLowerCase())) return false;
      if (action && !entry.action.toLowerCase().includes(action.toLowerCase())) return false;
      if (target && !`${entry.targetType} ${entry.targetId ?? ''}`.toLowerCase().includes(target.toLowerCase())) return false;
      if (from && new Date(entry.createdAt) < from) return false;
      return true;
    });
  }, [action, actor, dateFrom, entries, target]);

  return (
    <>
      <PageHeader title="Auditoria" description="Eventos auditables por organizacion. El backend limita paginacion por `limit` y `before`; filtros avanzados se aplican en cliente." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Eventos cargados" value={entries.length} icon={ClipboardList} />
        <MetricCard title="Filtrados" value={filtered.length} icon={Filter} />
        <MetricCard title="Organizacion" value={orgsQuery.data?.find((org) => org.id === activeOrgId)?.name ?? 'n/a'} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="field-label">Organizacion</label>
              <Select value={activeOrgId ?? ''} onChange={(event) => setSelectedOrgId(event.target.value)}>
                {(orgsQuery.data ?? []).map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="field-label">Actor</label>
              <Input value={actor} onChange={(event) => setActor(event.target.value)} placeholder="actorId o rol" />
            </div>
            <div>
              <label className="field-label">Accion</label>
              <Input value={action} onChange={(event) => setAction(event.target.value)} placeholder="bot.update_credentials" />
            </div>
            <div>
              <label className="field-label">Target</label>
              <Input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="bot, org_user, id..." />
            </div>
            <div>
              <label className="field-label">Desde</label>
              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </div>
            <Button type="button" variant="outline" onClick={() => { setActor(''); setAction(''); setTarget(''); setDateFrom(''); }}>
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {auditQuery.isError ? <ErrorState error={auditQuery.error} /> : null}
          {filtered.length ? (
            filtered.map((event) => <AuditEventCard key={event.id} event={event} />)
          ) : (
            <EmptyState title="Sin eventos" description="No hay eventos para la organizacion/filtros actuales o falta permiso owner/superadmin." />
          )}
        </div>
      </div>
    </>
  );
}
