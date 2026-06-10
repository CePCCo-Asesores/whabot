# Chatbox Console

Frontend profesional para administrar el backend multi-tenant de Chatbox. Esta app consume exclusivamente endpoints existentes del backend; donde la API no expone datos, la UI muestra estados vacios y TODOs explicitos.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Componentes estilo shadcn/ui locales
- TanStack Query
- React Router
- React Hook Form + Zod
- Recharts

## Instalacion

```bash
cd frontend
npm install
cp .env.example .env
```

## Variables de entorno

```bash
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://localhost:3000
```

En desarrollo, Vite proxy redirige `/api/*` a `http://localhost:3000/*`. Esto evita modificar CORS del backend, que hoy esta configurado como API privada sin browser CORS abierto.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
```

## Correr con backend local

Terminal 1:

```bash
cd ..
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run dev
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Abre `http://localhost:5173`.

## Seguridad frontend

- El JWT se guarda en `sessionStorage`, no en `localStorage`, y se limpia ante `401`.
- La `ADMIN_API_KEY` para `/metrics` se mantiene solo en memoria de la pestaña.
- API keys, access tokens y verify tokens se escriben al backend pero nunca se muestran completos.
- Los errores visibles se reducen al mensaje del backend o un texto seguro.
- Acciones destructivas usan confirmacion estricta cuando aplica.
- RBAC se respeta desde el backend: `403` se muestra como falta de permiso.

## OpenAPI client

No se genero cliente OpenAPI automatico porque el repo expone la spec como objeto TypeScript en `src/openapi.ts`, no como JSON persistido ni pipeline de generacion. Se implemento un cliente centralizado tipado en `src/lib/resources.ts`, mapeado uno a uno contra rutas reales.

## Endpoints usados

System:

- `GET /health`
- `GET /metrics`

Auth:

- `POST /auth/login`
- `POST /auth/register`

Organizations:

- `GET /admin/organizations`
- `POST /admin/organizations`
- `GET /admin/organizations/:id`
- `PUT /admin/organizations/:id`
- `DELETE /admin/organizations/:id`
- `GET /admin/organizations/:id/members`
- `POST /admin/organizations/:id/members`
- `PUT /admin/organizations/:id/members/:userId`
- `DELETE /admin/organizations/:id/members/:userId`
- `GET /admin/organizations/:id/audit-log`

Bots / agents:

- `GET /admin/bots`
- `POST /admin/bots`
- `GET /admin/bots/:id`
- `PUT /admin/bots/:id`
- `DELETE /admin/bots/:id`
- `POST /admin/bots/:id/prompt`
- `GET /admin/bots/:id/prompts`
- `POST /admin/bots/:id/rollback/:version`
- `GET /admin/bots/:id/branding`
- `PUT /admin/bots/:id/branding`
- `GET /admin/bots/:id/commands`
- `POST /admin/bots/:id/commands`
- `PUT /admin/bots/:id/commands/:cmdId`
- `DELETE /admin/bots/:id/commands/:cmdId`
- `GET /admin/bots/:id/crisis-config`
- `PUT /admin/bots/:id/crisis-config`

Channels:

- `GET /admin/bots/:botId/channels`
- `POST /admin/bots/:botId/channels`
- `PUT /admin/bots/:botId/channels/:channelId`
- `DELETE /admin/bots/:botId/channels/:channelId`
- `POST /admin/bots/:botId/channels/embedded-signup`

Providers / integrations:

- `GET /admin/bots/:botId/integrations`
- `POST /admin/bots/:botId/integrations`
- `PUT /admin/bots/:botId/integrations/:integrationId`
- `DELETE /admin/bots/:botId/integrations/:integrationId`

Knowledge:

- `GET /admin/bots/:botId/knowledge`
- `POST /admin/bots/:botId/knowledge`
- `PUT /admin/bots/:botId/knowledge/:itemId`
- `DELETE /admin/bots/:botId/knowledge/:itemId`
- `POST /admin/bots/:botId/knowledge/embed`

Users / ARCO / feedback:

- `GET /admin/bots/:botId/users`
- `PATCH /admin/bots/:botId/users/:userId`
- `GET /admin/bots/:botId/users/:userId/export`
- `PUT /admin/bots/:botId/users/:userId/rectify`
- `DELETE /admin/bots/:botId/users/:userId/data`
- `GET /admin/bots/:botId/crisis-events`
- `GET /admin/credential-errors`
- `GET /admin/bots/:botId/feedback`
- `GET /admin/bots/:botId/feedback/stats`

Proactive / DLQ / crypto:

- `POST /admin/bots/:botId/proactive`
- `GET /admin/dlq`
- `GET /admin/dlq/count`
- `POST /admin/dlq/:jobId/retry`
- `DELETE /admin/dlq/:jobId`
- `DELETE /admin/dlq`
- `POST /admin/crypto/reencrypt`
- `POST /admin/crypto/reencrypt-messages`

## Endpoints faltantes o ambiguos

- `GET /me`: perfil actual, email/rol actualizado y permisos efectivos.
- Refresh token o endpoint de renovacion de sesion.
- Conversaciones: listado de conversaciones, detalle, mensajes, provider usado, safety result y latencia por conversacion.
- Metricas JSON agregadas por fecha/org/bot; hoy solo existe Prometheus text en `/metrics`.
- Catalogo de WhatsApp templates aprobados por WABA.
- Upload de documentos para Knowledge/RAG; hoy solo existe CRUD textual.
- Busqueda ARCO por identificador externo permitido; hoy se listan IDs internos no PII.
- Campo `description` de bot/agente; no existe en Prisma/API.
- Estado/health de worker como endpoint JSON dedicado; se infiere por Redis/metrics.
