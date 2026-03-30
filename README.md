# backend

Backend application for the Smart House Rental Platform built with Node and Express.

## Build behavior

The build process compiles TypeScript and copies runtime assets into `dist`, including:

- `src/views` -> `dist/views`
- `src/public` -> `dist/public`
- `src/emails` -> `dist/emails`

This prevents template-missing errors in production deployments.

## Run with Docker

1. Copy env file:

```bash
cp .env.example .env
```

2. (Optional but recommended) set strong values in `.env` for `JWT_SECRET` and `JWT_REFRESH_SECRET`.

3. Build and start all services:

```bash
docker compose up --build -d
```

4. Check running containers:

```bash
docker compose ps
```

5. Open the API:

- App: http://localhost:5000
- Health: http://localhost:5000/health
- Swagger: http://localhost:5000/api-docs

6. Stop services:

```bash
docker compose down
```
