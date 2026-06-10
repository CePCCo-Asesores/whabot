export type Role = 'owner' | 'admin' | 'editor' | 'superadmin';
export type OrgPlan = 'free' | 'pro' | 'enterprise';
export type BotStatus = 'draft' | 'active' | 'paused' | 'credential_error';
export type SafetyLevel = 'strict' | 'standard' | 'minimal';
export type ChannelStatus = 'connected' | 'pending' | 'error';

export interface SessionUser {
  userId: string;
  orgId: string;
  role: Role;
  email?: string;
  isSuperadmin?: boolean;
}

export interface LoginResponse {
  token: string;
  orgId: string;
  userId: string;
  role?: Role;
  expiresIn?: string;
}

export interface RegisterResponse {
  token: string;
  orgId: string;
  userId: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  db: boolean;
  redis: boolean;
  ts: number;
}

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
  msgQuota: number;
  msgUsed: number;
  currentPeriodStart: string;
  msgRetentionDays?: number | null;
  createdAt: string;
  hasSentryDsn: boolean;
  bots?: Array<Pick<Bot, 'id' | 'name' | 'status' | 'createdAt'>>;
}

export interface OrgMember {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface BotBranding {
  id?: string;
  botId?: string;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
  website?: string;
  supportContact?: string;
  privacyPolicyUrl?: string;
  termsUrl?: string;
}

export interface BotCommand {
  id: string;
  botId: string;
  trigger: string;
  responseType: 'static' | 'action';
  payload: Record<string, unknown>;
}

export interface CrisisConfig {
  id?: string;
  botId?: string;
  country: string;
  lines: Array<{ name: string; phone: string; hours?: string }>;
  enabled?: boolean;
}

export interface PromptVersion {
  id: string;
  botId: string;
  version: number;
  systemPrompt: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface Bot {
  id: string;
  orgId: string;
  name: string;
  status: BotStatus;
  locale: string;
  systemPrompt?: string | null;
  identity?: Record<string, unknown> | null;
  onboardingMsg?: string | null;
  historyWindow: number;
  llmProvider?: 'openai' | 'anthropic' | 'google' | 'mistral' | null;
  llmModel?: string | null;
  llmApiKeySet: boolean;
  llmParams?: Record<string, unknown> | null;
  safetyLevel: SafetyLevel;
  webhookRateLimit?: number | null;
  createdAt: string;
  updatedAt: string;
  branding?: BotBranding | null;
  commands?: BotCommand[];
  crisisConfig?: CrisisConfig[];
  channels?: Channel[];
  knowledge?: KnowledgeItem[];
  promptVersions?: PromptVersion[];
}

export interface Channel {
  id: string;
  botId: string;
  provider: string;
  phoneId: string;
  verifyToken?: string;
  status: ChannelStatus;
}

export interface Integration {
  id: string;
  botId: string;
  kind: string;
  provider: string;
  status: 'active' | 'inactive' | 'disabled';
}

export interface KnowledgeItem {
  id: string;
  botId: string;
  title: string;
  content: string;
  tags: string[];
  hasEmbedding: boolean;
}

export interface EndUser {
  id: string;
  botId: string;
  locale?: string | null;
  paused: boolean;
  consentDeclined?: boolean;
  createdAt: string;
}

export interface CrisisEvent {
  id: string;
  botId: string;
  detectedAt: string;
  category: string;
  actionTaken: string;
}

export interface Feedback {
  id: string;
  messageId: string;
  rating: number;
  createdAt: string;
}

export interface FeedbackStats {
  count: number;
  average: number | null;
  distribution: Record<string, number>;
}

export interface DLQJob {
  id: string;
  name: string;
  data: {
    phoneId?: string;
    waMessageId?: string;
    messageType?: string;
    timestamp?: number;
  };
  failedReason?: string;
  attemptsMade: number;
  addedAt: string;
}

export interface AuditLogEntry {
  id: string;
  orgId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
}

export interface PromMetric {
  name: string;
  labels: Record<string, string>;
  value: number;
}
