import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileText, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BotPicker } from '@/components/common/BotPicker';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/resources';

const proactiveSchema = z.object({
  to: z.string().min(8),
  templateName: z.string().min(1),
  languageCode: z.string().min(2),
  channelId: z.string().optional(),
  componentsJson: z.string().optional(),
});

type ProactiveValues = z.infer<typeof proactiveSchema>;

export function TemplatesPage() {
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const [botId, setBotId] = useState('');
  const channelsQuery = useQuery({ queryKey: ['channels', botId], queryFn: () => api.channels(botId), enabled: Boolean(botId) });
  const form = useForm<ProactiveValues>({
    resolver: zodResolver(proactiveSchema),
    defaultValues: { to: '', templateName: '', languageCode: 'es_MX', channelId: '', componentsJson: '[]' },
  });

  useEffect(() => {
    if (!botId && botsQuery.data?.[0]) setBotId(botsQuery.data[0].id);
  }, [botId, botsQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (values: ProactiveValues) =>
      api.sendProactive(botId, {
        to: values.to,
        templateName: values.templateName,
        languageCode: values.languageCode,
        channelId: values.channelId || undefined,
        components: values.componentsJson?.trim() ? JSON.parse(values.componentsJson) : [],
      }),
  });

  const connectedChannels = (channelsQuery.data ?? []).filter((channel) => channel.status === 'connected');

  return (
    <>
      <PageHeader
        title="Templates / Mensajes proactivos"
        description="Envio de templates aprobados por Meta. No se expone envio libre fuera de la ventana de 24 horas."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Canales conectados" value={connectedChannels.length} icon={FileText} />
        <MetricCard title="Catalogo templates" value="No expuesto" detail="TODO API: endpoint de lista/aprobacion" />
        <MetricCard title="Rate limit backend" value="20/min" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Contexto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BotPicker value={botId} onChange={setBotId} />
            <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
              WhatsApp exige template aprobado para mensajes proactivos fuera de la ventana de 24 horas.
            </div>
            <EmptyState title="Catalogo no disponible" description="TODO API: falta endpoint para listar templates aprobados por WABA." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Enviar template</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => sendMutation.mutate(values))}>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Destino E.164</label>
                  <Input placeholder="+521234567890" {...form.register('to')} />
                </div>
                <div>
                  <label className="field-label">Template</label>
                  <Input placeholder="appointment_reminder" {...form.register('templateName')} />
                </div>
                <div>
                  <label className="field-label">Idioma</label>
                  <Input placeholder="es_MX" {...form.register('languageCode')} />
                </div>
                <div>
                  <label className="field-label">Canal</label>
                  <Select {...form.register('channelId')}>
                    <option value="">Primer canal conectado</option>
                    {connectedChannels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.phoneId} · {channel.provider}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <label className="field-label">Components JSON</label>
                <Textarea rows={8} {...form.register('componentsJson')} />
              </div>
              <Button disabled={!botId || sendMutation.isPending} type="submit"><Send className="h-4 w-4" /> Enviar template</Button>
            </form>
            {sendMutation.isSuccess ? (
              <div className="mt-4 rounded-md border bg-emerald-50 p-3 text-sm text-emerald-800">
                Enviado a {sendMutation.data.to}: {sendMutation.data.templateName} <StatusBadge status={sendMutation.data.sent} />
              </div>
            ) : null}
            {sendMutation.isError ? <div className="mt-4"><ErrorState error={sendMutation.error} /></div> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
