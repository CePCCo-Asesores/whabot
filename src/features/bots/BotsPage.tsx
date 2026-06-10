import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot as BotIcon, History, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingBlock } from '@/components/common/LoadingBlock';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { SecretField } from '@/components/common/SecretField';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/resources';
import type { Bot, BotCommand, CrisisConfig } from '@/lib/types';
import { compactJson, formatDate, parseJsonObject } from '@/lib/utils';

const botSchema = z.object({
  orgId: z.string().optional(),
  name: z.string().min(1),
  locale: z.string().min(2),
  status: z.enum(['draft', 'active', 'paused', 'credential_error']).optional(),
  onboardingMsg: z.string().optional(),
  historyWindow: z.coerce.number().int().min(1).max(50),
  llmProvider: z.enum(['', 'openai', 'anthropic', 'google', 'mistral']),
  llmModel: z.string().optional(),
  llmApiKey: z.string().optional(),
  safetyLevel: z.enum(['strict', 'standard', 'minimal']),
  identityJson: z.string().optional(),
  llmParamsJson: z.string().optional(),
});

const promptSchema = z.object({ systemPrompt: z.string().min(1) });
const brandingSchema = z.object({
  companyName: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  primaryColor: z.string().optional(),
  website: z.string().optional(),
  supportContact: z.string().optional(),
  privacyPolicyUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  termsUrl: z.string().url().optional().or(z.literal('').transform(() => undefined)),
});
const commandSchema = z.object({
  trigger: z.string().min(1),
  responseType: z.enum(['static', 'action']),
  payloadJson: z.string().min(2),
});
const crisisSchema = z.object({ configsJson: z.string().min(2) });

type BotValues = z.infer<typeof botSchema>;
type PromptValues = z.infer<typeof promptSchema>;
type BrandingValues = z.infer<typeof brandingSchema>;
type CommandValues = z.infer<typeof commandSchema>;
type CrisisValues = z.infer<typeof crisisSchema>;

export function BotsPage() {
  const queryClient = useQueryClient();
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const botQuery = useQuery({ queryKey: ['bot', selectedBotId], queryFn: () => api.bot(selectedBotId!), enabled: Boolean(selectedBotId) });
  const promptsQuery = useQuery({ queryKey: ['prompts', selectedBotId], queryFn: () => api.prompts(selectedBotId!), enabled: Boolean(selectedBotId) });
  const commandsQuery = useQuery({ queryKey: ['commands', selectedBotId], queryFn: () => api.commands(selectedBotId!), enabled: Boolean(selectedBotId) });
  const crisisQuery = useQuery({ queryKey: ['crisis-config', selectedBotId], queryFn: () => api.crisisConfig(selectedBotId!), enabled: Boolean(selectedBotId) });

  const bots = useMemo(() => botsQuery.data ?? [], [botsQuery.data]);
  const selectedBot = botQuery.data;

  useEffect(() => {
    if (!selectedBotId && bots[0]) setSelectedBotId(bots[0].id);
  }, [bots, selectedBotId]);

  const createForm = useForm<BotValues>({
    resolver: zodResolver(botSchema),
    defaultValues: {
      name: '',
      locale: 'es-MX',
      historyWindow: 5,
      llmProvider: '',
      safetyLevel: 'standard',
      identityJson: '{}',
      llmParamsJson: '{}',
    },
  });
  const editForm = useForm<BotValues>({
    resolver: zodResolver(botSchema),
    values: selectedBot
      ? toBotFormValues(selectedBot)
      : { name: '', locale: 'es-MX', historyWindow: 5, llmProvider: '', safetyLevel: 'standard', identityJson: '{}', llmParamsJson: '{}' },
  });
  const promptForm = useForm<PromptValues>({
    resolver: zodResolver(promptSchema),
    values: { systemPrompt: selectedBot?.systemPrompt ?? '' },
  });
  const brandingForm = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    values: selectedBot?.branding ?? {},
  });
  const commandForm = useForm<CommandValues>({
    resolver: zodResolver(commandSchema),
    defaultValues: { trigger: '', responseType: 'static', payloadJson: '{\n  "text": ""\n}' },
  });
  const crisisForm = useForm<CrisisValues>({
    resolver: zodResolver(crisisSchema),
    values: { configsJson: compactJson(crisisQuery.data?.length ? crisisQuery.data : [{ country: 'MX', lines: [], enabled: true }]) },
  });

  const invalidateBot = () => {
    queryClient.invalidateQueries({ queryKey: ['bots'] });
    queryClient.invalidateQueries({ queryKey: ['bot'] });
    queryClient.invalidateQueries({ queryKey: ['prompts'] });
    queryClient.invalidateQueries({ queryKey: ['commands'] });
    queryClient.invalidateQueries({ queryKey: ['crisis-config'] });
  };

  const createBot = useMutation({
    mutationFn: (values: BotValues) => api.createBot(toBotPayload(values, true)),
    onSuccess: (bot) => {
      invalidateBot();
      setSelectedBotId(bot.id);
      setCreateOpen(false);
      createForm.reset();
    },
  });
  const updateBot = useMutation({
    mutationFn: (values: BotValues) => api.updateBot(selectedBotId!, toBotPayload(values, false)),
    onSuccess: invalidateBot,
  });
  const deleteBot = useMutation({
    mutationFn: (id: string) => api.deleteBot(id),
    onSuccess: () => {
      setSelectedBotId(null);
      invalidateBot();
    },
  });
  const updatePrompt = useMutation({
    mutationFn: (values: PromptValues) => api.updatePrompt(selectedBotId!, values.systemPrompt),
    onSuccess: invalidateBot,
  });
  const rollbackPrompt = useMutation({
    mutationFn: (version: number) => api.rollbackPrompt(selectedBotId!, version),
    onSuccess: invalidateBot,
  });
  const updateBranding = useMutation({
    mutationFn: (values: BrandingValues) => api.updateBranding(selectedBotId!, values),
    onSuccess: invalidateBot,
  });
  const createCommand = useMutation({
    mutationFn: (values: CommandValues) =>
      api.createCommand(selectedBotId!, { trigger: values.trigger, responseType: values.responseType, payload: parseJsonObject(values.payloadJson) ?? {} }),
    onSuccess: () => {
      commandForm.reset({ trigger: '', responseType: 'static', payloadJson: '{\n  "text": ""\n}' });
      invalidateBot();
    },
  });
  const deleteCommand = useMutation({
    mutationFn: (cmdId: string) => api.deleteCommand(selectedBotId!, cmdId),
    onSuccess: invalidateBot,
  });
  const updateCrisis = useMutation({
    mutationFn: (values: CrisisValues) => api.updateCrisisConfig(selectedBotId!, JSON.parse(values.configsJson) as CrisisConfig[]),
    onSuccess: invalidateBot,
  });

  const botColumns = useMemo(
    () => [
      {
        key: 'name',
        header: 'Agente',
        render: (bot: Bot) => (
          <button className="text-left font-medium text-primary hover:underline" onClick={() => setSelectedBotId(bot.id)}>
            {bot.name}
          </button>
        ),
      },
      { key: 'status', header: 'Estado', render: (bot: Bot) => <StatusBadge status={bot.status} /> },
      { key: 'provider', header: 'Provider', render: (bot: Bot) => bot.llmProvider ?? 'sin definir' },
      { key: 'secret', header: 'LLM key', render: (bot: Bot) => <SecretField isSet={bot.llmApiKeySet} label="API key" /> },
      { key: 'updated', header: 'Actualizado', render: (bot: Bot) => formatDate(bot.updatedAt) },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Bots / Agentes"
        description="Configuracion operativa de agentes WhatsApp: LLM, safety, prompt versionado, branding, commands y crisis config."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" /> Crear agente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Nuevo agente</DialogTitle></DialogHeader>
              <BotForm form={createForm} onSubmit={(values) => createBot.mutate(values)} isSubmitting={createBot.isPending} />
              {createBot.isError ? <ErrorState error={createBot.error} /> : null}
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Agentes" value={bots.length} icon={BotIcon} />
        <MetricCard title="Activos" value={bots.filter((bot) => bot.status === 'active').length} />
        <MetricCard title="Credential error" value={bots.filter((bot) => bot.status === 'credential_error').length} tone={bots.some((bot) => bot.status === 'credential_error') ? 'danger' : 'success'} />
        <MetricCard title="Prompt versions" value={promptsQuery.data?.length ?? 0} icon={History} />
      </div>

      <div className="mt-5">
        <DataTable
          columns={botColumns}
          data={bots}
          getRowKey={(bot) => bot.id}
          empty={<EmptyState title="Sin agentes" description="Crea un agente para configurar canales, knowledge y credenciales BYO." />}
        />
        {botsQuery.isError ? <div className="mt-4"><ErrorState error={botsQuery.error} /></div> : null}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader><CardTitle>Configuracion del agente</CardTitle></CardHeader>
          <CardContent>
            {botQuery.isLoading && selectedBotId ? <LoadingBlock /> : null}
            {botQuery.isError ? <ErrorState error={botQuery.error} /> : null}
            {selectedBot ? (
              <form className="space-y-4" onSubmit={editForm.handleSubmit((values) => updateBot.mutate(values))}>
                <BotFormFields form={editForm} includeStatus />
                <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
                  TODO API: no existe campo `description`; no se inventa payload. Retention es politica de organizacion, no del bot.
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button disabled={updateBot.isPending} type="submit"><Save className="h-4 w-4" /> Guardar config</Button>
                  <ConfirmDialog
                    title="Eliminar agente"
                    description="Borra el agente y sus recursos asociados segun cascadas del backend."
                    confirmText={selectedBot.name}
                    confirmLabel="Eliminar"
                    destructive
                    onConfirm={() => deleteBot.mutateAsync(selectedBot.id)}
                  >
                    <Button type="button" variant="destructive"><Trash2 className="h-4 w-4" /> Eliminar</Button>
                  </ConfirmDialog>
                </div>
                {updateBot.isError ? <ErrorState error={updateBot.error} /> : null}
              </form>
            ) : (
              <EmptyState title="Selecciona un agente" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Prompt versionado</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {selectedBot ? (
              <>
                <form className="space-y-3" onSubmit={promptForm.handleSubmit((values) => updatePrompt.mutate(values))}>
                  <Textarea rows={8} {...promptForm.register('systemPrompt')} />
                  <Button disabled={updatePrompt.isPending} type="submit"><Save className="h-4 w-4" /> Publicar version</Button>
                </form>
                {updatePrompt.isError ? <ErrorState error={updatePrompt.error} /> : null}
                <div className="space-y-2">
                  {(promptsQuery.data ?? []).map((prompt) => (
                    <div key={prompt.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">Version {prompt.version}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(prompt.createdAt)}</p>
                        </div>
                        <Button size="sm" type="button" variant="outline" onClick={() => rollbackPrompt.mutate(prompt.version)}>
                          <RotateCcw className="h-4 w-4" /> Rollback
                        </Button>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{prompt.systemPrompt}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="Sin agente seleccionado" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Branding</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={brandingForm.handleSubmit((values) => updateBranding.mutate(values))}>
              <Input placeholder="Empresa" {...brandingForm.register('companyName')} />
              <Input placeholder="Logo URL" {...brandingForm.register('logoUrl')} />
              <Input placeholder="#0369a1" {...brandingForm.register('primaryColor')} />
              <Input placeholder="Website" {...brandingForm.register('website')} />
              <Input placeholder="Contacto soporte" {...brandingForm.register('supportContact')} />
              <Input placeholder="Privacy policy URL" {...brandingForm.register('privacyPolicyUrl')} />
              <Input placeholder="Terms URL" {...brandingForm.register('termsUrl')} />
              <Button disabled={!selectedBotId || updateBranding.isPending} type="submit"><Save className="h-4 w-4" /> Guardar branding</Button>
            </form>
            {updateBranding.isError ? <div className="mt-3"><ErrorState error={updateBranding.error} /></div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commands</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={commandForm.handleSubmit((values) => createCommand.mutate(values))}>
              <Input placeholder="/help" {...commandForm.register('trigger')} />
              <Select {...commandForm.register('responseType')}>
                <option value="static">static</option>
                <option value="action">action</option>
              </Select>
              <Textarea rows={5} {...commandForm.register('payloadJson')} />
              <Button disabled={!selectedBotId || createCommand.isPending} type="submit"><Plus className="h-4 w-4" /> Agregar</Button>
            </form>
            <CommandList commands={commandsQuery.data ?? []} onDelete={(cmdId) => deleteCommand.mutate(cmdId)} />
            {createCommand.isError ? <ErrorState error={createCommand.error} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Crisis config</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={crisisForm.handleSubmit((values) => updateCrisis.mutate(values))}>
              <Textarea rows={14} {...crisisForm.register('configsJson')} />
              <p className="field-help">Formato backend: {"{ configs: [{ country, lines, enabled }] }"}; aqui editas el arreglo interno.</p>
              <Button disabled={!selectedBotId || updateCrisis.isPending} type="submit"><Save className="h-4 w-4" /> Guardar crisis</Button>
            </form>
            {updateCrisis.isError ? <div className="mt-3"><ErrorState error={updateCrisis.error} /></div> : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function BotForm({ form, onSubmit, isSubmitting }: { form: ReturnType<typeof useForm<BotValues>>; onSubmit: (values: BotValues) => void; isSubmitting?: boolean }) {
  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <BotFormFields form={form} />
      <Button disabled={isSubmitting} type="submit"><Save className="h-4 w-4" /> Guardar</Button>
    </form>
  );
}

function BotFormFields({ form, includeStatus = false }: { form: ReturnType<typeof useForm<BotValues>>; includeStatus?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="field-label">Nombre</label>
        <Input {...form.register('name')} />
      </div>
      <div>
        <label className="field-label">Locale</label>
        <Input {...form.register('locale')} />
      </div>
      {includeStatus ? (
        <div>
          <label className="field-label">Estado</label>
          <Select {...form.register('status')}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="credential_error">credential_error</option>
          </Select>
        </div>
      ) : null}
      <div>
        <label className="field-label">Safety</label>
        <Select {...form.register('safetyLevel')}>
          <option value="strict">strict</option>
          <option value="standard">standard</option>
          <option value="minimal">minimal</option>
        </Select>
      </div>
      <div>
        <label className="field-label">Provider</label>
        <Select {...form.register('llmProvider')}>
          <option value="">sin definir</option>
          <option value="openai">openai</option>
          <option value="anthropic">anthropic</option>
          <option value="google">google</option>
          <option value="mistral">mistral</option>
        </Select>
      </div>
      <div>
        <label className="field-label">Modelo</label>
        <Input {...form.register('llmModel')} />
      </div>
      <div>
        <label className="field-label">History window</label>
        <Input type="number" min={1} max={50} {...form.register('historyWindow')} />
      </div>
      <div>
        <label className="field-label">Rotar LLM API key</label>
        <Input type="password" autoComplete="off" {...form.register('llmApiKey')} />
        <p className="field-help">Solo se envia si escribes un valor nuevo.</p>
      </div>
      <div className="md:col-span-2">
        <label className="field-label">Onboarding message</label>
        <Textarea rows={3} {...form.register('onboardingMsg')} />
      </div>
      <div>
        <label className="field-label">Identity JSON</label>
        <Textarea rows={8} {...form.register('identityJson')} />
      </div>
      <div>
        <label className="field-label">LLM params JSON</label>
        <Textarea rows={8} {...form.register('llmParamsJson')} />
      </div>
    </div>
  );
}

function CommandList({ commands, onDelete }: { commands: BotCommand[]; onDelete: (cmdId: string) => void }) {
  if (!commands.length) return <EmptyState title="Sin commands" description="Agrega disparadores para respuestas estaticas o acciones." />;
  return (
    <div className="space-y-2">
      {commands.map((command) => (
        <div key={command.id} className="rounded-md border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-medium">{command.trigger}</p>
              <p className="text-xs text-muted-foreground">{command.responseType}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onDelete(command.id)} type="button">Eliminar</Button>
          </div>
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">{compactJson(command.payload)}</pre>
        </div>
      ))}
    </div>
  );
}

function toBotFormValues(bot: Bot): BotValues {
  return {
    orgId: bot.orgId,
    name: bot.name,
    locale: bot.locale,
    status: bot.status,
    onboardingMsg: bot.onboardingMsg ?? '',
    historyWindow: bot.historyWindow,
    llmProvider: bot.llmProvider ?? '',
    llmModel: bot.llmModel ?? '',
    llmApiKey: '',
    safetyLevel: bot.safetyLevel,
    identityJson: compactJson(bot.identity ?? {}),
    llmParamsJson: compactJson(bot.llmParams ?? {}),
  };
}

function toBotPayload(values: BotValues, includeCreatePrompt: boolean) {
  const payload: Record<string, unknown> = {
    name: values.name,
    locale: values.locale,
    onboardingMsg: values.onboardingMsg || undefined,
    historyWindow: values.historyWindow,
    llmProvider: values.llmProvider || undefined,
    llmModel: values.llmModel || undefined,
    safetyLevel: values.safetyLevel,
    identity: values.identityJson ? parseJsonObject(values.identityJson) : undefined,
    llmParams: values.llmParamsJson ? parseJsonObject(values.llmParamsJson) : undefined,
  };
  if (values.status) payload.status = values.status;
  if (values.llmApiKey) payload.llmApiKey = values.llmApiKey;
  if (values.orgId) payload.orgId = values.orgId;
  if (includeCreatePrompt && 'systemPrompt' in values) payload.systemPrompt = (values as Record<string, unknown>).systemPrompt;
  return payload;
}
