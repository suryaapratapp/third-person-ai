# Third Person AI API

## Quick Setup

1. Copy env and adjust if needed:

```bash
cp .env.example .env
```

2. Start local infra (Postgres + Redis) if you use Docker:

```bash
npm run infra:up
```

3. Install dependencies and run setup:

```bash
npm install
npm run setup:full
```

This runs Prisma validation/generation, applies migrations, builds the API, and checks DB connectivity.

## Run API

```bash
npm run dev
```

Default URL: `http://localhost:3002`

## Auth flows included

- `POST /auth/register` (creates pending-verification account)
- `GET /auth/verification-status?email=...`
- `POST /auth/verify-otp`
- `POST /auth/resend-otp`
- `POST /auth/register/complete`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password` (auth required)
- `POST /auth/logout` (auth required)
- `GET /auth/me` (auth required)

## Demo mode OTP behavior

When `ANALYSIS_MODE=mock` (or OpenAI key is missing), OTP verification is simulated for local development:

- OTP value `123456` is accepted.
- OTP values are also logged server-side for easier testing.

## Troubleshooting

- If migrations fail with DB connection errors, confirm Postgres is running on `localhost:5432`.
- If API boot fails, confirm Redis is reachable at `localhost:6379`.
- OpenAPI docs are at `/docs` after the server starts.
