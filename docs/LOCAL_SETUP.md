# Local setup (without Docker)

Run PostgreSQL and Redis on your machine and point the app at `localhost`. No Docker required.

## 1. PostgreSQL

### Windows

- **Option A – Installer**  
  Download and run the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/).  
  During setup, set a password for the `postgres` user (e.g. `postgres` to match `.env.example`).

- **Option B – Winget**  
  ```bash
  winget install PostgreSQL.PostgreSQL
  ```
  Then add the `bin` folder (e.g. `C:\Program Files\PostgreSQL\16\bin`) to your PATH.

### Create the database

Using the same user/password as in your `.env` (e.g. `postgres` / `postgres`):

```bash
psql -U postgres -h localhost
```

In `psql`:

```sql
CREATE DATABASE house_rental;
\q
```

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb house_rental
```

---

## 2. Redis

### Windows

- **Option A – WSL**  
  In WSL (e.g. Ubuntu):  
  `sudo apt update && sudo apt install redis-server && redis-server --daemonize yes`

- **Option B – Memurai**  
  [Memurai](https://www.memurai.com/) is a Redis-compatible server for Windows. Install and run it; it usually listens on `localhost:6379`.

- **Option C – Chocolatey**  
  ```bash
  choco install redis-64
  ```
  Then start the Redis service.

### macOS (Homebrew)

```bash
brew install redis
brew services start redis
```

---

## 3. App configuration

Copy the example env and keep **localhost** URLs (no Docker):

```bash
cp .env.example .env
```

Your `.env` should have:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/house_rental
REDIS_URL=redis://localhost:6379
```

Adjust `postgres` / `postgres` if you use a different user or password.

---

## 4. Run migrations and start the app

```bash
npm install
npx prisma migrate dev
npm run dev
```

Optional: seed the database:

```bash
npm run prisma:seed
```

---

## Quick check

- **PostgreSQL**: `psql -U postgres -h localhost -d house_rental -c "SELECT 1"`
- **Redis**: `redis-cli ping` (should reply `PONG`)

If both work and `.env` uses `localhost`, the app will use local connections without Docker.
