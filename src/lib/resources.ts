import { apiRequest, queryString } from './api';
import type {
  AuditLogEntry,
  Bot,
  BotBranding,
  BotCommand,
  Channel,
  CrisisConfig,
  CrisisEvent,
  DLQJob,
  EndUser,
  Feedback,
  FeedbackStats,
  HealthResponse,
  Integration,
  KnowledgeItem,
  LoginResponse,
  OrgMember,
  Organization,
  PromptVersion,
  RegisterResponse,
} from './types';

export const api = {
  health: () => apiRequest<HealthResponse>('/health'),
  metrics: (adminKey: string) => apiRequest<string>('/metrics', { rawText: true, adminKey }),

  login: (body: { email: string; password: string }) =>
    apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body: { email: string; password: string; orgName: string }) =>
    apiRequest<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  organizations: () => apiRequest<Organization[]>('/admin/organizations'),
  organization: (id: string) => apiRequest<Organization>(`/admin/organizations/${id}`),
  createOrganization: (body: Partial<Organization> & { sentryDsn?: string }) =>
    apiRequest<Organization>('/admin/organizations', { method: 'POST', body: JSON.stringify(body) }),
  updateOrganization: (id: string, body: Partial<Organization> & { sentryDsn?: string | null }) =>
    apiRequest<Organization>(`/admin/organizations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteOrganization: (id: string) => apiRequest<void>(`/admin/organizations/${id}`, { method: 'DELETE' }),
  members: (orgId: string) => apiRequest<OrgMember[]>(`/admin/organizations/${orgId}/members`),
  inviteMember: (orgId: string, body: { email: string; password: string; role?: string }) =>
    apiRequest<OrgMember>(`/admin/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (orgId: string, userId: string, body: { role: string }) =>
    apiRequest<OrgMember>(`/admin/organizations/${orgId}/members/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeMember: (orgId: string, userId: string) =>
    apiRequest<void>(`/admin/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  auditLog: (orgId: string, params: { limit?: number; before?: string } = {}) =>
    apiRequest<AuditLogEntry[]>(`/admin/organizations/${orgId}/audit-log${queryString(params)}`),

  bots: () => apiRequest<Bot[]>('/admin/bots'),
  bot: (id: string) => apiRequest<Bot>(`/admin/bots/${id}`),
  createBot: (body: Record<string, unknown>) =>
    apiRequest<Bot>('/admin/bots', { method: 'POST', body: JSON.stringify(body) }),
  updateBot: (id: string, body: Record<string, unknown>) =>
    apiRequest<Bot>(`/admin/bots/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBot: (id: string) => apiRequest<void>(`/admin/bots/${id}`, { method: 'DELETE' }),
  updatePrompt: (id: string, systemPrompt: string) =>
    apiRequest<{ version: number }>(`/admin/bots/${id}/prompt`, { method: 'POST', body: JSON.stringify({ systemPrompt }) }),
  prompts: (id: string) => apiRequest<PromptVersion[]>(`/admin/bots/${id}/prompts`),
  rollbackPrompt: (id: string, version: number) =>
    apiRequest<{ rolledBackTo: string; newVersion: number }>(`/admin/bots/${id}/rollback/${version}`, { method: 'POST' }),
  branding: (id: string) => apiRequest<BotBranding>(`/admin/bots/${id}/branding`),
  updateBranding: (id: string, body: BotBranding) =>
    apiRequest<BotBranding>(`/admin/bots/${id}/branding`, { method: 'PUT', body: JSON.stringify(body) }),
  commands: (id: string) => apiRequest<BotCommand[]>(`/admin/bots/${id}/commands`),
  createCommand: (id: string, body: Record<string, unknown>) =>
    apiRequest<BotCommand>(`/admin/bots/${id}/commands`, { method: 'POST', body: JSON.stringify(body) }),
  updateCommand: (id: string, cmdId: string, body: Record<string, unknown>) =>
    apiRequest<BotCommand>(`/admin/bots/${id}/commands/${cmdId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCommand: (id: string, cmdId: string) =>
    apiRequest<void>(`/admin/bots/${id}/commands/${cmdId}`, { method: 'DELETE' }),
  crisisConfig: (id: string) => apiRequest<CrisisConfig[]>(`/admin/bots/${id}/crisis-config`),
  updateCrisisConfig: (id: string, configs: CrisisConfig[]) =>
    apiRequest<{ count: number }>(`/admin/bots/${id}/crisis-config`, { method: 'PUT', body: JSON.stringify({ configs }) }),

  channels: (botId: string) => apiRequest<Channel[]>(`/admin/bots/${botId}/channels`),
  createChannel: (botId: string, body: Record<string, unknown>) =>
    apiRequest<Channel>(`/admin/bots/${botId}/channels`, { method: 'POST', body: JSON.stringify(body) }),
  updateChannel: (botId: string, channelId: string, body: Record<string, unknown>) =>
    apiRequest<Channel>(`/admin/bots/${botId}/channels/${channelId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteChannel: (botId: string, channelId: string) =>
    apiRequest<void>(`/admin/bots/${botId}/channels/${channelId}`, { method: 'DELETE' }),
  embeddedSignup: (botId: string, body: Record<string, unknown>) =>
    apiRequest<Channel>(`/admin/bots/${botId}/channels/embedded-signup`, { method: 'POST', body: JSON.stringify(body) }),

  integrations: (botId: string) => apiRequest<Integration[]>(`/admin/bots/${botId}/integrations`),
  createIntegration: (botId: string, body: Record<string, unknown>) =>
    apiRequest<Integration>(`/admin/bots/${botId}/integrations`, { method: 'POST', body: JSON.stringify(body) }),
  updateIntegration: (botId: string, integrationId: string, body: Record<string, unknown>) =>
    apiRequest<Integration>(`/admin/bots/${botId}/integrations/${integrationId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteIntegration: (botId: string, integrationId: string) =>
    apiRequest<void>(`/admin/bots/${botId}/integrations/${integrationId}`, { method: 'DELETE' }),

  knowledge: (botId: string) => apiRequest<KnowledgeItem[]>(`/admin/bots/${botId}/knowledge`),
  createKnowledge: (botId: string, body: Record<string, unknown>) =>
    apiRequest<KnowledgeItem>(`/admin/bots/${botId}/knowledge`, { method: 'POST', body: JSON.stringify(body) }),
  updateKnowledge: (botId: string, itemId: string, body: Record<string, unknown>) =>
    apiRequest<KnowledgeItem>(`/admin/bots/${botId}/knowledge/${itemId}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteKnowledge: (botId: string, itemId: string) =>
    apiRequest<void>(`/admin/bots/${botId}/knowledge/${itemId}`, { method: 'DELETE' }),
  embedKnowledge: (botId: string) =>
    apiRequest<{ updated: number; failed: number; total: number }>(`/admin/bots/${botId}/knowledge/embed`, { method: 'POST' }),

  users: (botId: string, paused?: boolean) =>
    apiRequest<EndUser[]>(`/admin/bots/${botId}/users${queryString({ paused })}`),
  patchUser: (botId: string, userId: string, paused: boolean) =>
    apiRequest<{ id: string; paused: boolean }>(`/admin/bots/${botId}/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ paused }) }),
  exportUser: (botId: string, userId: string) =>
    apiRequest<Record<string, unknown>>(`/admin/bots/${botId}/users/${userId}/export`),
  rectifyUser: (botId: string, userId: string, body: { locale?: string }) =>
    apiRequest<{ id: string; locale?: string }>(`/admin/bots/${botId}/users/${userId}/rectify`, { method: 'PUT', body: JSON.stringify(body) }),
  eraseUser: (botId: string, userId: string) =>
    apiRequest<{ deleted: boolean; userId: string }>(`/admin/bots/${botId}/users/${userId}/data`, { method: 'DELETE' }),
  crisisEvents: (botId: string, limit = 50) =>
    apiRequest<CrisisEvent[]>(`/admin/bots/${botId}/crisis-events${queryString({ limit })}`),
  credentialErrors: () => apiRequest<Array<Pick<Bot, 'id' | 'name' | 'orgId' | 'status' | 'llmProvider' | 'llmModel' | 'updatedAt'>>>('/admin/credential-errors'),

  feedback: (botId: string, limit = 100) =>
    apiRequest<Feedback[]>(`/admin/bots/${botId}/feedback${queryString({ limit })}`),
  feedbackStats: (botId: string) => apiRequest<FeedbackStats>(`/admin/bots/${botId}/feedback/stats`),

  sendProactive: (botId: string, body: Record<string, unknown>) =>
    apiRequest<{ sent: boolean; to: string; templateName: string }>(`/admin/bots/${botId}/proactive`, { method: 'POST', body: JSON.stringify(body) }),

  dlq: () => apiRequest<DLQJob[]>('/admin/dlq'),
  dlqCount: () => apiRequest<{ count: number }>('/admin/dlq/count'),
  retryDLQ: (jobId: string) => apiRequest<{ requeued: boolean; jobId: string }>(`/admin/dlq/${jobId}/retry`, { method: 'POST' }),
  discardDLQ: (jobId: string) => apiRequest<void>(`/admin/dlq/${jobId}`, { method: 'DELETE' }),
  purgeDLQ: (olderThanHours?: number) =>
    apiRequest<{ removed: number; olderThanHours: number | null }>(`/admin/dlq${queryString({ olderThanHours })}`, { method: 'DELETE' }),

  reencryptCredentials: () =>
    apiRequest<{ currentKid: number; reencrypted: number; skipped: number; failed: number }>('/admin/crypto/reencrypt', { method: 'POST' }),
  reencryptMessages: (body: { cursor?: string; batchSize?: number }) =>
    apiRequest<{ currentKid: number; reencrypted: number; skipped: number; failed: number; nextCursor: string | null; done: boolean }>(
      '/admin/crypto/reencrypt-messages',
      { method: 'POST', body: JSON.stringify(body) },
    ),
};
