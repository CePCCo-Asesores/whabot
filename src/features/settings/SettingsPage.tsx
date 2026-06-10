import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, RefreshCcw, Save, Settings, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { SecretField } from '@/components/common/SecretField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import { useAuth } from '@/features/auth/AuthProvider';

const orgSettingsSchema = z.object({
  name: z.string().min(1),
  msgRetentionDays: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  sentryDsn: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

type OrgSettingsValues = z.infer<typeof orgSettingsSchema>;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, selectedOrgId } = useAuth();
  const [appearance, setAppearance] = useState('system');
  const orgQuery = useQuery({ queryKey: ['organization', selectedOrgId], queryFn: () => api.organization(selectedOrgId!), enabled: Boolean(selectedOrgId) });
  const form = useForm<OrgSettingsValues>({
    resolver: zodResolver(orgSettingsSchema),
    values: {
      name: orgQuery.data?.name ?? '',
      msgRetentionDays: orgQuery.data?.msgRetentionDays ?? undefined,
      sentryDsn: '',
    },
  });

  const updateOrg = useMutation({
    mutationFn: (values: OrgSettingsValues) => api.updateOrganization(selectedOrgId!, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
  const reencryptCredentials = useMutation({ mutationFn: api.reencryptCredentials });
  const reencryptMessages = useMutation({ mutationFn: () => api.reencryptMessages({ batchSize: 100 }) });

  return (
    <>
      <PageHeader title="Settings" description="Perfil local, seguridad, organizacion, webhooks y operaciones de mantenimiento expuestas por el backend." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Usuario" value={user?.email ?? user?.userId ?? 'n/a'} icon={Settings} detail={user?.role} />
        <MetricCard title="Organizacion" value={orgQuery.data?.name ?? 'n/a'} />
        <MetricCard title="Sentry tenant" value={<SecretField isSet={orgQuery.data?.hasSentryDsn} label="DSN" />} icon={ShieldCheck} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Usuario actual</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">User ID</p>
              <p className="mt-1 break-all font-mono text-xs">{user?.userId}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Org ID</p>
              <p className="mt-1 break-all font-mono text-xs">{user?.orgId}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs uppercase text-muted-foreground">Rol</p>
              <p className="mt-1">{user?.role}</p>
            </div>
            <EmptyState title="Perfil no editable" description="TODO API: falta endpoint `/me` o update de usuario actual." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Organizacion</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => updateOrg.mutate(values))}>
              <div>
                <label className="field-label">Nombre</label>
                <Input {...form.register('name')} />
              </div>
              <div>
                <label className="field-label">Retencion mensajes</label>
                <Input type="number" min={0} placeholder="sin limite" {...form.register('msgRetentionDays')} />
              </div>
              <div>
                <label className="field-label">Sentry DSN</label>
                <Input placeholder="https://..." {...form.register('sentryDsn')} />
                <p className="field-help">Valor write-only. En blanco no cambia el DSN; usa null via API para limpiar.</p>
              </div>
              <Button disabled={!selectedOrgId || updateOrg.isPending} type="submit"><Save className="h-4 w-4" /> Guardar</Button>
            </form>
            {updateOrg.isError ? <div className="mt-3"><ErrorState error={updateOrg.error} /></div> : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Seguridad</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Sesion</p>
              <p className="mt-1 text-muted-foreground">JWT en sessionStorage, no localStorage. Se limpia en 401.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Secretos</p>
              <p className="mt-1 text-muted-foreground">API keys y tokens se escriben al backend y no se muestran completos.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Webhooks</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border p-3">
              <p className="font-medium">Meta verify</p>
              <p className="mt-1 text-muted-foreground">GET /webhook con hub.verify_token.</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-medium">Inbound</p>
              <p className="mt-1 text-muted-foreground">POST /webhook valida HMAC y encola en BullMQ.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Apariencia</CardTitle></CardHeader>
          <CardContent>
            <label className="field-label">Tema</label>
            <Select value={appearance} onChange={(event) => setAppearance(event.target.value)}>
              <option value="system">system</option>
              <option value="light">light</option>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Preferencia local de UI; no se persiste como dato de negocio.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><CardTitle>Crypto maintenance</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ConfirmDialog
            title="Re-encriptar credenciales"
            description="Ejecuta POST /admin/crypto/reencrypt. Requiere superadmin."
            confirmLabel="Ejecutar"
            onConfirm={() => reencryptCredentials.mutateAsync()}
          >
            <Button type="button" variant="outline"><KeyRound className="h-4 w-4" /> Reencrypt credentials</Button>
          </ConfirmDialog>
          <ConfirmDialog
            title="Re-encriptar mensajes"
            description="Ejecuta un batch de POST /admin/crypto/reencrypt-messages con batchSize 100."
            confirmLabel="Ejecutar batch"
            onConfirm={() => reencryptMessages.mutateAsync()}
          >
            <Button type="button" variant="outline"><RefreshCcw className="h-4 w-4" /> Reencrypt messages batch</Button>
          </ConfirmDialog>
          {reencryptCredentials.data ? <p className="w-full text-sm text-muted-foreground">Credenciales: {JSON.stringify(reencryptCredentials.data)}</p> : null}
          {reencryptMessages.data ? <p className="w-full text-sm text-muted-foreground">Mensajes: {JSON.stringify(reencryptMessages.data)}</p> : null}
          {reencryptCredentials.isError ? <ErrorState error={reencryptCredentials.error} /> : null}
          {reencryptMessages.isError ? <ErrorState error={reencryptMessages.error} /> : null}
        </CardContent>
      </Card>
    </>
  );
}
