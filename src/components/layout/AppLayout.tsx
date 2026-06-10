import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bot,
  Building2,
  ChartSpline,
  ClipboardList,
  DatabaseZap,
  FileText,
  Gauge,
  KeyRound,
  LogOut,
  MessageSquareText,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import { useAuth } from '@/features/auth/AuthProvider';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Gauge },
  { to: '/organizations', label: 'Organizaciones', icon: Building2 },
  { to: '/bots', label: 'Agentes', icon: Bot },
  { to: '/channels', label: 'Canales WhatsApp', icon: Smartphone },
  { to: '/providers', label: 'Credenciales', icon: KeyRound },
  { to: '/knowledge', label: 'Knowledge', icon: DatabaseZap },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/conversations', label: 'Conversaciones', icon: MessageSquareText },
  { to: '/dlq', label: 'DLQ', icon: TriangleAlert },
  { to: '/audit', label: 'Auditoria', icon: ClipboardList },
  { to: '/compliance', label: 'ARCO', icon: ShieldCheck },
  { to: '/metrics', label: 'Metricas', icon: ChartSpline },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/organizations': 'Organizaciones',
  '/bots': 'Agentes',
  '/channels': 'Canales WhatsApp',
  '/providers': 'Credenciales / Providers',
  '/knowledge': 'Knowledge / RAG',
  '/templates': 'Templates',
  '/conversations': 'Conversaciones',
  '/dlq': 'Dead-letter queue',
  '/audit': 'Auditoria',
  '/compliance': 'Compliance / ARCO',
  '/metrics': 'Metricas',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { logout, user, selectedOrgId, setSelectedOrgId } = useAuth();
  const location = useLocation();
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: api.organizations });
  const healthQuery = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30_000 });

  const orgs = orgsQuery.data ?? [];
  const activeOrg = orgs.find((org) => org.id === selectedOrgId) ?? orgs[0];

  if (!selectedOrgId && activeOrg) {
    queueMicrotask(() => setSelectedOrgId(activeOrg.id));
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Chatbox</p>
            <p className="text-xs text-muted-foreground">Operations Console</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              end={item.to === '/'}
              to={item.to}
              className={({ isActive }) =>
                `flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Consola</span>
                <span>/</span>
                <span>{pageNames[location.pathname] ?? 'Modulo'}</span>
              </div>
              <p className="mt-1 text-sm font-medium">{activeOrg?.name ?? 'Sin organizacion seleccionada'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                {healthQuery.isError ? <StatusBadge status="degraded" /> : <StatusBadge status={healthQuery.data?.status ?? 'pending'} />}
                <span className="hidden text-muted-foreground sm:inline">
                  DB {healthQuery.data?.db ? 'ok' : '-'} / Redis {healthQuery.data?.redis ? 'ok' : '-'}
                </span>
              </div>
              <Select
                className="w-56"
                value={activeOrg?.id ?? ''}
                onChange={(event) => setSelectedOrgId(event.target.value || null)}
                disabled={orgsQuery.isLoading || !orgs.length}
                aria-label="Organizacion"
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
              <div className="hidden rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground md:block">
                {user?.email ?? user?.userId} · {user?.role}
              </div>
              <Button size="icon" variant="outline" onClick={logout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t px-3 py-2 lg:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                end={item.to === '/'}
                to={item.to}
                className={({ isActive }) =>
                  `inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium ${
                    isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main className="px-4 py-5 lg:px-6">
          {orgsQuery.isError ? <div className="mb-4"><ErrorState error={orgsQuery.error} /></div> : null}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
