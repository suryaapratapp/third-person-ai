# Third Person AI Monorepo

## Architecture

- Frontend: **Vite + React + Tailwind** at repository root (`src/`)
- API backend: **Fastify + Prisma (PostgreSQL)** at `apps/api`
- Worker: **BullMQ + Redis** at `apps/worker`

The frontend calls the API via `src/api/client.js`, which reads `VITE_API_URL` from `src/config/runtime.ts`.

## Deployment Model

- Frontend deploy target: **Vercel** (SPA rewrite via `vercel.json`)
- API deploy target: any Node host (Render/Fly/Railway/VM/container)
- Worker deploy target: separate Node process (same env as API + Redis)

## Local Development

### Frontend

```bash
npm install
npm run dev
```

### API

```bash
npm --prefix apps/api install
npm --prefix apps/api run setup
npm --prefix apps/api run dev
```

### Worker

```bash
npm --prefix apps/worker install
npm --prefix apps/worker run start
```

## Production Setup

Node runtime requirement: **20.19+** or **22.12+**.

### Frontend (Vercel)

Build settings:

- Framework preset: **Vite**
- Root directory: repo root
- Build command: `npm run build`
- Output directory: `dist`

Required env vars in Vercel project:

| Env var | Required | Purpose | Example |
|---|---|---|---|
| `VITE_API_URL` | Yes | Public API base URL used by frontend | `https://api.thethirdperson.ai` |
| `VITE_AI_MODE` | Recommended | Demo/live mode flag for UI behavior | `demo` |
| `VITE_ADMIN_EMAILS` | Optional | Comma-separated emails allowed to see `/admin` in UI | `admin@thethirdperson.ai` |

Important:

- After changing env vars, **redeploy** frontend.
- SPA direct routes are handled by `vercel.json` rewrite.

### API (Fastify)

Required env vars in API host:

| Env var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes (or both JWT_ACCESS/REFRESH) | JWT signing secret fallback |
| `HOST` | Recommended | Bind host (`0.0.0.0` in production) |
| `PORT` | Platform-provided | API port |
| `CORS_ORIGIN` | Yes | Comma-separated allowlist of frontend origins |
| `LOG_LEVEL` | Recommended | Fastify log level |
| `ADMIN_EMAILS` or `ADMIN_IDS` | Recommended for admin panel | Admin authorization allowlist |
| `COMMIT_SHA` | Optional | Commit shown in `/health` |

Additional API env vars are documented in `apps/api/.env.example`.

Production commands:

```bash
npm --prefix apps/api run db:generate
npm --prefix apps/api run db:migrate:deploy
npm --prefix apps/api run build
npm --prefix apps/api run start
```

### Worker

Worker env vars are in `apps/worker/src/utils/env.ts` and depend on:

- `REDIS_URL`
- `DATABASE_URL`
- `ANALYSIS_MODE`
- queue names and analysis tuning vars

## Health & Observability

- `GET /health` returns: `status`, `commit`, `env`, `db`, `analysisMode`
- `GET /ready` checks DB readiness (`200` ready, `503` not ready)
- All responses include `x-request-id`
- Unhandled errors are logged with request id and returned as safe error payloads

## Admin CRUD

Frontend route: `/admin` (protected + admin-gated)

Backend admin APIs (admin auth required):

- `GET /admin/users` (search + pagination)
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/upload-sessions` (search + pagination)
- `PATCH /admin/upload-sessions/:id`
- `DELETE /admin/upload-sessions/:id`

## Production Guards

Run from repo root:

```bash
npm run prod:check
```

This runs:

1. localhost leak scan (`scripts/scan-localhost.mjs`)
2. frontend build
3. build asset integrity check (`scripts/verify-build.mjs`)
4. API TypeScript build

## Smoke Test Checklist

After deploy:

1. Open `/auth/register` directly (no 404; SPA rewrite works).
2. Sign in and navigate app routes (`/chat-analysis`, `/analyses`, `/vibe-check`).
3. Confirm frontend network calls go to `VITE_API_URL` (no localhost).
4. Check API CORS preflight from frontend origin succeeds.
5. Hit API `/health` and `/ready`.
6. Run admin checks with an allowlisted admin account at `/admin`.
7. Verify DB migrations are applied with `prisma migrate deploy` logs.
