# Third Person AI Monorepo

Frontend (Vite + React + Tailwind) lives at repo root.
Backend API (Fastify + Prisma) lives at `apps/api`.

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

## Production Deploy

### Frontend on Vercel

- Framework preset: **Vite**
- Root directory: repository root
- Build command: `npm run build`
- Output directory: `dist`

Environment variables (Vercel Project Settings):

- `VITE_API_URL` = your deployed API URL (required)
- `VITE_AI_MODE` = `demo` (default) or `live`

Important:

- After changing env vars, **redeploy**.
- SPA routes are handled by `vercel.json` rewrites.

### API deploy

Required environment variables:

- `DATABASE_URL`
- `JWT_SECRET` (or both `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`)
- `HOST` (recommended: `0.0.0.0`)
- `PORT` (provided by platform when applicable)
- `CORS_ORIGIN` (comma-separated allowlist of frontend domains)

Build/start commands:

- Build: `npm --prefix apps/api run build`
- Start: `npm --prefix apps/api run start`

Prisma production steps:

- `npm --prefix apps/api run db:generate`
- `npm --prefix apps/api run db:migrate:deploy`

Health checks:

- `/health` basic liveness
- `/ready` readiness (includes DB check)

## Production Safety Checks

Run from repo root:

```bash
npm run prod:check
```

This runs:

1. localhost leak scan (`scripts/scan-localhost.mjs`)
2. frontend build
3. frontend asset verification (`scripts/verify-build.mjs`)
4. API TypeScript build

## Environment Templates

- Frontend: `.env.example`
- API: `apps/api/.env.example`
