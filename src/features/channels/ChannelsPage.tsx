import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, Smartphone, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BotPicker } from '@/components/common/BotPicker';
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
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/resources';
import type { Channel } from '@/lib/types';

const channelSchema = z.object({
  provider: z.string().min(1),
  phoneId: z.string().min(1),
  accessToken: z.string().min(1),
  businessAccountId: z.string().optional(),
  verifyToken: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(['connected', 'pending', 'error']),
  verifyToken: z.string().optional(),
  accessToken: z.string().optional(),
  businessAccountId: z.string().optional(),
});

const embeddedSchema = z.object({
  code: z.string().min(1),
  phoneId: z.string().min(1),
  verifyToken: z.string().min(1),
  redirectUri: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});

type ChannelValues = z.infer<typeof channelSchema>;
type UpdateValues = z.infer<typeof updateSchema>;
type EmbeddedValues = z.infer<typeof embeddedSchema>;

export function ChannelsPage() {
  const queryClient = useQueryClient();
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const [botId, setBotId] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const channelsQuery = useQuery({ queryKey: ['channels', botId], queryFn: () => api.channels(botId), enabled: Boolean(botId) });

  useEffect(() => {
    if (!botId && botsQuery.data?.[0]) setBotId(botsQuery.data[0].id);
  }, [botId, botsQuery.data]);

  const channelForm = useForm<ChannelValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: { provider: 'meta_cloud', phoneId: '', accessToken: '', businessAccountId: '', verifyToken: '' },
  });
  const updateForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    values: { status: selectedChannel?.status ?? 'pending', verifyToken: '', accessToken: '', businessAccountId: '' },
  });
  const embeddedForm = useForm<EmbeddedValues>({
    resolver: zodResolver(embeddedSchema),
    defaultValues: { code: '', phoneId: '', verifyToken: '', redirectUri: '' },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['channels', botId] });
    queryClient.invalidateQueries({ queryKey: ['bots'] });
  };

  const createChannel = useMutation({
    mutationFn: (values: ChannelValues) => api.createChannel(botId, values),
    onSuccess: () => {
      channelForm.reset({ provider: 'meta_cloud', phoneId: '', accessToken: '', businessAccountId: '', verifyToken: '' });
      invalidate();
    },
  });
  const updateChannel = useMutation({
    mutationFn: (values: UpdateValues) => api.updateChannel(botId, selectedChannel!.id, removeEmpty(values)),
    onSuccess: invalidate,
  });
  const deleteChannel = useMutation({
    mutationFn: (channelId: string) => api.deleteChannel(botId, channelId),
    onSuccess: () => {
      setSelectedChannel(null);
      invalidate();
    },
  });
  const embeddedSignup = useMutation({
    mutationFn: (values: EmbeddedValues) => api.embeddedSignup(botId, removeEmpty(values)),
    onSuccess: () => {
      embeddedForm.reset({ code: '', phoneId: '', verifyToken: '', redirectUri: '' });
      invalidate();
    },
  });

  const channels = channelsQuery.data ?? [];
  const columns = useMemo(
    () => [
      { key: 'phoneId', header: 'Phone number ID', render: (channel: Channel) => <button className="font-medium text-primary hover:underline" onClick={() => setSelectedChannel(channel)}>{channel.phoneId}</button> },
      { key: 'provider', header: 'Provider', render: (channel: Channel) => channel.provider },
      { key: 'status', header: 'Estado', render: (channel: Channel) => <StatusBadge status={channel.status} /> },
      { key: 'verify', header: 'Verify token', render: (channel: Channel) => <SecretField isSet={Boolean(channel.verifyToken)} label="token" /> },
      {
        key: 'actions',
        header: '',
        render: (channel: Channel) => (
          <ConfirmDialog
            title="Eliminar canal"
            description="El canal se elimina del agente. Las credenciales cifradas se descartan en el backend."
            confirmLabel="Eliminar"
            destructive
            onConfirm={() => deleteChannel.mutateAsync(channel.id)}
          >
            <Button size="sm" variant="outline" type="button"><Trash2 className="h-4 w-4" /> Eliminar</Button>
          </ConfirmDialog>
        ),
      },
    ],
    [deleteChannel],
  );

  return (
    <>
      <PageHeader title="Canales WhatsApp" description="Provisiona Meta Cloud API, rota tokens y verifica estado sin exponer credenciales completas." />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Canales" value={channels.length} icon={Smartphone} />
        <MetricCard title="Conectados" value={channels.filter((channel) => channel.status === 'connected').length} tone="success" />
        <MetricCard title="Pendientes/error" value={channels.filter((channel) => channel.status !== 'connected').length} tone={channels.some((channel) => channel.status !== 'connected') ? 'warning' : 'success'} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Agente</CardTitle></CardHeader>
          <CardContent><BotPicker value={botId} onChange={setBotId} /></CardContent>
        </Card>
        <div>
          <DataTable
            columns={columns}
            data={channels}
            getRowKey={(channel) => channel.id}
            empty={<EmptyState title="Sin canales" description="Configura phone number id, access token y verify token para conectar WhatsApp." />}
          />
          {channelsQuery.isError ? <div className="mt-4"><ErrorState error={channelsQuery.error} /></div> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Nuevo canal Meta</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={channelForm.handleSubmit((values) => createChannel.mutate(values))}>
              <Select {...channelForm.register('provider')}>
                <option value="meta_cloud">meta_cloud</option>
                <option value="embedded_signup">embedded_signup</option>
              </Select>
              <Input placeholder="phone_number_id" {...channelForm.register('phoneId')} />
              <Input placeholder="business account id" {...channelForm.register('businessAccountId')} />
              <Input type="password" autoComplete="off" placeholder="access token" {...channelForm.register('accessToken')} />
              <Input type="password" autoComplete="off" placeholder="verify token" {...channelForm.register('verifyToken')} />
              <Button disabled={!botId || createChannel.isPending} type="submit"><Plus className="h-4 w-4" /> Crear canal</Button>
            </form>
            {createChannel.isError ? <div className="mt-3"><ErrorState error={createChannel.error} /></div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rotacion / estado</CardTitle></CardHeader>
          <CardContent>
            {selectedChannel ? (
              <form className="space-y-3" onSubmit={updateForm.handleSubmit((values) => updateChannel.mutate(values))}>
                <p className="text-sm font-medium">{selectedChannel.phoneId}</p>
                <Select {...updateForm.register('status')}>
                  <option value="connected">connected</option>
                  <option value="pending">pending</option>
                  <option value="error">error</option>
                </Select>
                <Input type="password" autoComplete="off" placeholder="nuevo verify token" {...updateForm.register('verifyToken')} />
                <Input type="password" autoComplete="off" placeholder="nuevo access token" {...updateForm.register('accessToken')} />
                <Input placeholder="business account id" {...updateForm.register('businessAccountId')} />
                <Button disabled={updateChannel.isPending} type="submit"><Save className="h-4 w-4" /> Actualizar</Button>
              </form>
            ) : (
              <EmptyState title="Selecciona un canal" description="Elige una fila para rotar tokens o cambiar estado." />
            )}
            {updateChannel.isError ? <div className="mt-3"><ErrorState error={updateChannel.error} /></div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Embedded Signup</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={embeddedForm.handleSubmit((values) => embeddedSignup.mutate(values))}>
              <Input placeholder="Meta OAuth code" {...embeddedForm.register('code')} />
              <Input placeholder="phone_number_id" {...embeddedForm.register('phoneId')} />
              <Input type="password" autoComplete="off" placeholder="verify token" {...embeddedForm.register('verifyToken')} />
              <Input placeholder="redirect URI opcional" {...embeddedForm.register('redirectUri')} />
              <Button disabled={!botId || embeddedSignup.isPending} type="submit">Intercambiar code</Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">Si `META_APP_ID` no esta configurado, el backend responde 501.</p>
            {embeddedSignup.isError ? <div className="mt-3"><ErrorState error={embeddedSignup.error} /></div> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function removeEmpty<T extends Record<string, unknown>>(values: T) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== undefined && value !== null));
}
