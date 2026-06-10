import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { SecretField } from '@/components/common/SecretField';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import type { Organization } from '@/lib/types';
import { formatDate, formatNumber, formatPercent } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthProvider';

const orgSchema = z.object({
  name: z.string().min(1),
  plan: z.enum(['free', 'pro', 'enterprise']),
  msgQuota: z.coerce.number().int().min(0),
  msgRetentionDays: z.coerce.number().int().min(0).optional().or(z.literal('').transform(() => undefined)),
  sentryDsn: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

const memberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['owner', 'admin', 'editor']),
});

type OrgValues = z.infer<typeof orgSchema>;
type MemberValues = z.infer<typeof memberSchema>;

export function OrganizationsPage() {
  const queryClient = useQueryClient();
  const { selectedOrgId, setSelectedOrgId, user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const orgsQuery = useQuery({ queryKey: ['organizations'], queryFn: api.organizations });
  const activeOrgId = selectedOrgId ?? orgsQuery.data?.[0]?.id;
  const orgQuery = useQuery({
    queryKey: ['organization', activeOrgId],
    queryFn: () => api.organization(activeOrgId!),
    enabled: Boolean(activeOrgId),
  });
  const membersQuery = useQuery({
    queryKey: ['members', activeOrgId],
    queryFn: () => api.members(activeOrgId!),
    enabled: Boolean(activeOrgId),
  });

  const createForm = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: '', plan: 'free', msgQuota: 1000, sentryDsn: '' },
  });
  const updateForm = useForm<OrgValues>({
    resolver: zodResolver(orgSchema),
    values: {
      name: orgQuery.data?.name ?? '',
      plan: orgQuery.data?.plan ?? 'free',
      msgQuota: orgQuery.data?.msgQuota ?? 1000,
      msgRetentionDays: orgQuery.data?.msgRetentionDays ?? undefined,
      sentryDsn: '',
    },
  });
  const memberForm = useForm<MemberValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { email: '', password: '', role: 'editor' },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['organizations'] });
    queryClient.invalidateQueries({ queryKey: ['organization'] });
    queryClient.invalidateQueries({ queryKey: ['members'] });
  };

  const createOrg = useMutation({
    mutationFn: api.createOrganization,
    onSuccess: (org) => {
      invalidate();
      setSelectedOrgId(org.id);
      setCreateOpen(false);
      createForm.reset({ name: '', plan: 'free', msgQuota: 1000, sentryDsn: '' });
    },
  });
  const updateOrg = useMutation({
    mutationFn: (values: OrgValues) => api.updateOrganization(activeOrgId!, values),
    onSuccess: invalidate,
  });
  const deleteOrg = useMutation({
    mutationFn: (id: string) => api.deleteOrganization(id),
    onSuccess: () => {
      invalidate();
      setSelectedOrgId(null);
    },
  });
  const inviteMember = useMutation({
    mutationFn: (values: MemberValues) => api.inviteMember(activeOrgId!, values),
    onSuccess: () => {
      invalidate();
      memberForm.reset({ email: '', password: '', role: 'editor' });
    },
  });
  const removeMember = useMutation({
    mutationFn: (userId: string) => api.removeMember(activeOrgId!, userId),
    onSuccess: invalidate,
  });

  const orgs = orgsQuery.data ?? [];
  const activeOrg = orgQuery.data;
  const usage = activeOrg && activeOrg.msgQuota > 0 ? activeOrg.msgUsed / activeOrg.msgQuota : 0;
  const quotaStatus = activeOrg?.msgQuota === 0 ? 'Ilimitado' : formatPercent(usage);

  const orgColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Organizacion',
        render: (org: Organization) => (
          <button className="text-left font-medium text-primary hover:underline" onClick={() => setSelectedOrgId(org.id)}>
            {org.name}
          </button>
        ),
      },
      { key: 'plan', header: 'Plan', render: (org: Organization) => <StatusBadge status={org.plan} /> },
      {
        key: 'usage',
        header: 'Uso',
        render: (org: Organization) => (
          <span>{formatNumber(org.msgUsed)} / {org.msgQuota === 0 ? 'ilimitado' : formatNumber(org.msgQuota)}</span>
        ),
      },
      { key: 'sentry', header: 'Sentry', render: (org: Organization) => <SecretField isSet={org.hasSentryDsn} label="DSN" /> },
      { key: 'createdAt', header: 'Creada', render: (org: Organization) => formatDate(org.createdAt) },
    ],
    [setSelectedOrgId],
  );

  return (
    <>
      <PageHeader
        title="Organizaciones"
        description="Tenants, cuotas, retencion, Sentry por tenant y miembros. Plan/cuota dependen del RBAC del backend."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Crear
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva organizacion</DialogTitle>
              </DialogHeader>
              <OrgForm form={createForm} onSubmit={(values) => createOrg.mutate(values)} isSubmitting={createOrg.isPending} />
              {createOrg.isError ? <ErrorState error={createOrg.error} /> : null}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Tenants" value={formatNumber(orgs.length)} icon={Building2} />
        <MetricCard title="Uso seleccionado" value={quotaStatus} detail={activeOrg ? `${formatNumber(activeOrg.msgUsed)} mensajes` : 'Sin seleccion'} />
        <MetricCard title="Miembros" value={formatNumber(membersQuery.data?.length ?? 0)} detail={user?.role ?? 'rol desconocido'} />
      </div>

      <div className="mt-5">
        {orgsQuery.isError ? (
          <ErrorState error={orgsQuery.error} onRetry={() => orgsQuery.refetch()} />
        ) : (
          <DataTable
            columns={orgColumns}
            data={orgs}
            getRowKey={(org) => org.id}
            empty={<EmptyState title="Sin organizaciones" description="Registra una organizacion desde login o usa superadmin para crear tenants." />}
          />
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Configuracion de organizacion</CardTitle>
          </CardHeader>
          <CardContent>
            {orgQuery.isError ? <ErrorState error={orgQuery.error} /> : null}
            {activeOrg ? (
              <form className="space-y-4" onSubmit={updateForm.handleSubmit((values) => updateOrg.mutate(values))}>
                <OrgFormFields form={updateForm} />
                <div className="flex flex-wrap justify-between gap-2">
                  <Button disabled={updateOrg.isPending} type="submit">
                    <Save className="h-4 w-4" /> Guardar
                  </Button>
                  <ConfirmDialog
                    title="Eliminar organizacion"
                    description="Esta accion depende de permiso superadmin y borra el tenant en el backend."
                    confirmText={activeOrg.name}
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => deleteOrg.mutateAsync(activeOrg.id)}
                  >
                    <Button type="button" variant="destructive">
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </ConfirmDialog>
                </div>
                {updateOrg.isError ? <ErrorState error={updateOrg.error} /> : null}
                {deleteOrg.isError ? <ErrorState error={deleteOrg.error} /> : null}
              </form>
            ) : (
              <EmptyState title="Selecciona una organizacion" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Miembros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_130px_auto]" onSubmit={memberForm.handleSubmit((values) => inviteMember.mutate(values))}>
              <Input placeholder="email@empresa.com" {...memberForm.register('email')} />
              <Input type="password" placeholder="password temporal" {...memberForm.register('password')} />
              <Select {...memberForm.register('role')}>
                <option value="editor">editor</option>
                <option value="admin">admin</option>
                <option value="owner">owner</option>
              </Select>
              <Button disabled={!activeOrgId || inviteMember.isPending} type="submit">
                <UserPlus className="h-4 w-4" /> Invitar
              </Button>
            </form>
            {inviteMember.isError ? <ErrorState error={inviteMember.error} /> : null}
            <DataTable
              columns={[
                { key: 'email', header: 'Email', render: (member) => member.email },
                { key: 'role', header: 'Rol', render: (member) => <StatusBadge status={member.role} /> },
                { key: 'created', header: 'Alta', render: (member) => formatDate(member.createdAt) },
                {
                  key: 'actions',
                  header: '',
                  render: (member) => (
                    <ConfirmDialog
                      title="Remover miembro"
                      description={`Remover ${member.email} de la organizacion.`}
                      confirmLabel="Remover"
                      destructive
                      onConfirm={() => removeMember.mutateAsync(member.id)}
                    >
                      <Button size="sm" type="button" variant="outline">Remover</Button>
                    </ConfirmDialog>
                  ),
                },
              ]}
              data={membersQuery.data ?? []}
              getRowKey={(member) => member.id}
              empty={<EmptyState title="Sin miembros visibles" description="La API no devolvio miembros o falta permiso." />}
            />
            {membersQuery.isError ? <ErrorState error={membersQuery.error} /> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function OrgForm({ form, onSubmit, isSubmitting }: { form: ReturnType<typeof useForm<OrgValues>>; onSubmit: (values: OrgValues) => void; isSubmitting?: boolean }) {
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <OrgFormFields form={form} />
      <Button disabled={isSubmitting} type="submit">
        <Save className="h-4 w-4" /> Guardar
      </Button>
    </form>
  );
}

function OrgFormFields({ form }: { form: ReturnType<typeof useForm<OrgValues>> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="field-label">Nombre</label>
        <Input {...form.register('name')} />
        <p className="field-help">{form.formState.errors.name?.message}</p>
      </div>
      <div>
        <label className="field-label">Plan</label>
        <Select {...form.register('plan')}>
          <option value="free">free</option>
          <option value="pro">pro</option>
          <option value="enterprise">enterprise</option>
        </Select>
      </div>
      <div>
        <label className="field-label">Cuota mensual</label>
        <Input type="number" min={0} {...form.register('msgQuota')} />
        <p className="field-help">0 significa ilimitado.</p>
      </div>
      <div>
        <label className="field-label">Retencion de mensajes</label>
        <Input type="number" min={0} placeholder="sin limite" {...form.register('msgRetentionDays')} />
      </div>
      <div className="md:col-span-2">
        <label className="field-label">Sentry DSN</label>
        <Input placeholder="https://..." {...form.register('sentryDsn')} />
        <p className="field-help">Se envia al backend para cifrado. La consola no muestra el valor guardado.</p>
      </div>
    </div>
  );
}
