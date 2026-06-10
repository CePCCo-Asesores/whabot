import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseZap, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { BotPicker } from '@/components/common/BotPicker';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { MetricCard } from '@/components/common/MetricCard';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/resources';
import type { KnowledgeItem } from '@/lib/types';

const knowledgeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
  tagsText: z.string().optional(),
});

type KnowledgeValues = z.infer<typeof knowledgeSchema>;

export function KnowledgePage() {
  const queryClient = useQueryClient();
  const botsQuery = useQuery({ queryKey: ['bots'], queryFn: api.bots });
  const [botId, setBotId] = useState('');
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const knowledgeQuery = useQuery({ queryKey: ['knowledge', botId], queryFn: () => api.knowledge(botId), enabled: Boolean(botId) });

  useEffect(() => {
    if (!botId && botsQuery.data?.[0]) setBotId(botsQuery.data[0].id);
  }, [botId, botsQuery.data]);

  const createForm = useForm<KnowledgeValues>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: { title: '', content: '', tagsText: '' },
  });
  const editForm = useForm<KnowledgeValues>({
    resolver: zodResolver(knowledgeSchema),
    values: {
      title: selectedItem?.title ?? '',
      content: selectedItem?.content ?? '',
      tagsText: selectedItem?.tags?.join(', ') ?? '',
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['knowledge', botId] });
  const createKnowledge = useMutation({
    mutationFn: (values: KnowledgeValues) => api.createKnowledge(botId, toPayload(values)),
    onSuccess: () => {
      createForm.reset({ title: '', content: '', tagsText: '' });
      invalidate();
    },
  });
  const updateKnowledge = useMutation({
    mutationFn: (values: KnowledgeValues) => api.updateKnowledge(botId, selectedItem!.id, toPayload(values)),
    onSuccess: invalidate,
  });
  const deleteKnowledge = useMutation({
    mutationFn: (itemId: string) => api.deleteKnowledge(botId, itemId),
    onSuccess: () => {
      setSelectedItem(null);
      invalidate();
    },
  });
  const embedKnowledge = useMutation({
    mutationFn: () => api.embedKnowledge(botId),
    onSuccess: invalidate,
  });

  const items = knowledgeQuery.data ?? [];
  const embedded = items.filter((item) => item.hasEmbedding).length;
  const columns = useMemo(
    () => [
      { key: 'title', header: 'Documento', render: (item: KnowledgeItem) => <button className="font-medium text-primary hover:underline" onClick={() => setSelectedItem(item)}>{item.title}</button> },
      { key: 'embedding', header: 'Embedding', render: (item: KnowledgeItem) => <StatusBadge status={item.hasEmbedding} /> },
      { key: 'tags', header: 'Tags', render: (item: KnowledgeItem) => item.tags?.join(', ') || 'sin tags' },
      { key: 'content', header: 'Contenido', render: (item: KnowledgeItem) => <span className="line-clamp-2 max-w-lg text-muted-foreground">{item.content}</span> },
      {
        key: 'actions',
        header: '',
        render: (item: KnowledgeItem) => (
          <ConfirmDialog
            title="Eliminar knowledge item"
            description="El item y su embedding se eliminan del bot."
            confirmLabel="Eliminar"
            destructive
            onConfirm={() => deleteKnowledge.mutateAsync(item.id)}
          >
            <Button size="sm" variant="outline" type="button"><Trash2 className="h-4 w-4" /> Eliminar</Button>
          </ConfirmDialog>
        ),
      },
    ],
    [deleteKnowledge],
  );

  return (
    <>
      <PageHeader
        title="Knowledge / RAG"
        description="Base de conocimiento por agente. El backend soporta items textuales y reindexado; no expone upload de archivos."
        actions={
          <Button disabled={!botId || embedKnowledge.isPending} onClick={() => embedKnowledge.mutate()} type="button" variant="outline">
            <RefreshCcw className="h-4 w-4" /> Reindexar
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Items" value={items.length} icon={DatabaseZap} />
        <MetricCard title="Con embedding" value={`${embedded}/${items.length}`} />
        <MetricCard title="Pendientes" value={items.length - embedded} tone={items.length - embedded ? 'warning' : 'success'} />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader><CardTitle>Agente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <BotPicker value={botId} onChange={setBotId} />
            <div className="rounded-md border bg-amber-50 p-3 text-sm text-amber-800">
              TODO API: falta endpoint de upload de documentos. Se usa CRUD textual real.
            </div>
            {embedKnowledge.data ? (
              <div className="rounded-md border bg-emerald-50 p-3 text-sm text-emerald-800">
                Reindexado: {embedKnowledge.data.updated} actualizados, {embedKnowledge.data.failed} fallidos de {embedKnowledge.data.total}.
              </div>
            ) : null}
            {embedKnowledge.isError ? <ErrorState error={embedKnowledge.error} /> : null}
          </CardContent>
        </Card>

        <DataTable
          columns={columns}
          data={items}
          getRowKey={(item) => item.id}
          empty={<EmptyState title="Knowledge vacio" description="Agrega contenido textual para que el bot lo recupere durante la conversacion." />}
        />
      </div>

      {knowledgeQuery.isError ? <div className="mt-4"><ErrorState error={knowledgeQuery.error} /></div> : null}

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Crear item</CardTitle></CardHeader>
          <CardContent>
            <KnowledgeForm form={createForm} onSubmit={(values) => createKnowledge.mutate(values)} isSubmitting={createKnowledge.isPending} />
            {createKnowledge.isError ? <div className="mt-3"><ErrorState error={createKnowledge.error} /></div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Editar item</CardTitle></CardHeader>
          <CardContent>
            {selectedItem ? (
              <>
                <KnowledgeForm form={editForm} onSubmit={(values) => updateKnowledge.mutate(values)} isSubmitting={updateKnowledge.isPending} />
                {updateKnowledge.isError ? <div className="mt-3"><ErrorState error={updateKnowledge.error} /></div> : null}
              </>
            ) : (
              <EmptyState title="Selecciona un item" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KnowledgeForm({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: ReturnType<typeof useForm<KnowledgeValues>>;
  onSubmit: (values: KnowledgeValues) => void;
  isSubmitting?: boolean;
}) {
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input placeholder="Titulo" {...form.register('title')} />
      <Input placeholder="tags separados por coma" {...form.register('tagsText')} />
      <Textarea rows={12} placeholder="Contenido" {...form.register('content')} />
      <Button disabled={isSubmitting} type="submit"><Save className="h-4 w-4" /> Guardar</Button>
    </form>
  );
}

function toPayload(values: KnowledgeValues) {
  return {
    title: values.title,
    content: values.content,
    tags: values.tagsText?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [],
  };
}
