# backend

Backend application for the Smart House Rental Platform built with **NestJS**, Prisma, and PostgreSQL.

## Architecture

- NestJS modular monolith (`src/modules/*`)
- Global API prefix: `/api`
- Auth: JWT access tokens + HTTP-only refresh cookies
- Realtime: Socket.IO (messaging)
- Sidecars: Python embedding + recommendation services (Docker Compose)

## Scripts

```bash
npm run dev          # nest start --watch
npm run build        # nest build + copy email/view assets
npm start            # node dist/main.js
npm run prisma:migrate
npm run prisma:seed
```

## Build behavior

The build compiles TypeScript via Nest CLI and copies runtime assets into `dist`:

- `src/views` -> `dist/views`
- `src/public` -> `dist/public`
- `src/emails` -> `dist/emails`

## Email provider (Resend)

Set:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SUPPORT_EMAIL` (optional)

## Run with Docker

1. `cp .env.example .env`
2. Set strong `JWT_SECRET` / `JWT_REFRESH_SECRET`
3. `docker compose up --build -d`
4. Open:
   - Health: http://localhost:5000/health
   - API: http://localhost:5000/api
   - Swagger: http://localhost:5000/api-docs

## Canonical API map

| Domain | Base path |
|--------|-----------|
| Auth | `/api/auth` |
| Profile / me | `/api/me` |
| Properties | `/api/properties` |
| Search | `/api/search` |
| Recommendations | `/api/recommendations` |
| Conversations | `/api/conversations` |
| Appointments | `/api/appointments` |
| Agreements | `/api/agreements` |
| Payments | `/api/payments` |
| Reviews | `/api/reviews` |
| Reports | `/api/reports` |
| Owner overview | `/api/owner/overview` |
| Admin | `/api/admin` |
| Internal | `/api/internal` |

## Prisma migrations on existing databases

If `prisma migrate deploy` fails with `P3005`, baseline first:

```bash
npx prisma migrate resolve --applied <baseline_migration_name>
npx prisma migrate deploy
```
