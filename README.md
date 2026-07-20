# Smart House Rental Platform - Backend API

Production-ready, highly scalable REST & Realtime WebSockets API for the **Smart House Rental Platform**, engineered with **NestJS**, **Prisma ORM**, **PostgreSQL**, **Redis**, and **Socket.IO**.

---

## 🏛️ Architecture & Key Features

- **NestJS Modular Architecture**: Strict separation of concerns with domain modules (`src/modules/*`), standard `@Injectable()` services, constructor Dependency Injection (DI), controllers, and guards.
- **Prisma ORM & PostgreSQL**: Type-safe database access with Prisma Client, migration handling, and seed scripts.
- **Authentication & Security**:
  - JWT access tokens + HTTP-only refresh cookies.
  - Role-based Access Control (`@Roles('admin', 'owner', 'renter')`) via NestJS Guards.
  - Zod request body/query validation pipes.
- **Realtime Messaging & WebSockets**: Socket.IO gateway (`/messaging`) backed by Redis Adapter for multi-instance pub/sub and state synchronization.
- **Payment Processing**: Integrated Chapa Payment Gateway webhook handling and verification workflow.
- **Email Notifications**: Resend integration for transactional HTML emails (email verification, password resets, appointment updates).
- **AI & Recommendation Engine**: Integration with Python embedding microservices for semantic property search and preference-driven property recommendations.

---

## 🛠️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Caching & Pub/Sub**: Redis
- **Realtime**: Socket.IO (`@nestjs/websockets`)
- **Documentation**: OpenAPI / Swagger (`/api-docs`)
- **Email Provider**: Resend
- **File Uploads**: Cloudinary & Multer (memory storage)
- **Testing**: Jest (Unit & Integration tests)

---

## 📁 Directory Structure

```text
src/
├── common/             # Interceptors, Filters, Guards, Decorators, Validation Pipes
├── config/             # Environment variables, database & logger configurations
├── core/               # Core utilities & cross-cutting concerns
├── modules/            # Domain Modules (NestJS Controllers, Services, Schemas)
│   ├── admin/          # Admin analytics, user & property management
│   ├── agreements/     # Rental agreements & digital contracts
│   ├── appointments/   # Property tour bookings & schedule management
│   ├── auth/           # Login, registration, token refresh, password resets
│   ├── internal/       # Internal data sync APIs for microservices
│   ├── messaging/      # Realtime chat controllers & Socket.IO gateway
│   ├── notifications/  # User notification delivery & audit logging
│   ├── owner/          # Owner dashboard metrics & listing overview
│   ├── payments/       # Chapa payment gateway integration & CSV export
│   ├── profile/        # Current user profile (/api/me) & preferences
│   ├── properties/     # Property listings, media upload & category filters
│   ├── recommendation/ # AI property recommendations & user interaction tracking
│   ├── reports/        # Issue reporting & owner response management
│   ├── reviews/        # Property reviews & ratings
│   ├── search/         # Semantic search & query parsing engine
│   ├── users/          # Public user profiles & user management
│   └── verification/   # Identity verification document processing
├── prisma/             # PrismaService & DB module initialization
├── utils/              # Helper utilities (JWT, Cloudinary, Geo, Sentiment)
└── main.ts             # NestJS Application entry point
```

---

## ⚡ Quick Start

### 1. Environment Setup

Create a `.env` file in the backend root directory:

```bash
cp .env.example .env
```

Ensure you configure the essential variables:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/houserental?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
RESEND_API_KEY="re_123456789"
EMAIL_FROM="noreply@yourdomain.com"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Migration & Seeding

```bash
# Run Prisma migrations
npm run prisma:migrate

# Seed database with initial demo data
npm run prisma:seed
```

### 4. Running the Application

```bash
# Development mode with hot-reload
npm run dev

# Production build
npm run build

# Start production server
npm start
```

---

## 🧪 Testing & Build Verification

```bash
# Run unit & integration tests
npm test

# Run tests in watch mode
npx jest --watch

# Build TypeScript output (tsc + asset copying)
npm run build
```

---

## 🐳 Docker Deployment

To launch the full backend stack alongside Redis and microservices:

```bash
docker compose up --build -d
```

### Available Endpoints & Interfaces:

- **Health Check**: `http://localhost:5000/health`
- **API Base URL**: `http://localhost:5000/api`
- **Swagger Documentation**: `http://localhost:5000/api-docs`

---

## 🗺️ Canonical API Map

| Domain | Base Path | Description |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | Login, registration, token refresh, password resets |
| **Profile / Me** | `/api/me` | Current user profile & preference management |
| **Users** | `/api/users` | User profile lookups & public listings |
| **Properties** | `/api/properties` | Listing creation, updates, category filtering & media |
| **Search** | `/api/search` | Natural language & semantic property search |
| **Recommendations**| `/api/recommendations` | Tailored property recommendations & event tracking |
| **Conversations** | `/api/conversations` | Realtime messaging threads & attachment handling |
| **Appointments** | `/api/appointments` | Tour bookings & schedule status updates |
| **Agreements** | `/api/agreements` | Lease agreement creation, signatures & offers |
| **Payments** | `/api/payments` | Chapa payments, webhooks, verification & CSV exports |
| **Reviews** | `/api/reviews` | Property ratings & review submissions |
| **Reports** | `/api/reports` | Property issue reporting & resolution tracking |
| **Verification** | `/api/verification` | Identity document verification processing |
| **Notifications** | `/api/notifications` | User notifications & admin broadcast alerts |
| **Owner Overview** | `/api/owner/overview` | Owner analytics & property overview metrics |
| **Admin** | `/api/admin` | Platform administration, analytics & moderation |
| **Internal** | `/api/internal` | Training data export for microservices |

---

## 🛠️ Prisma Troubleshooting

If `prisma migrate deploy` fails on existing databases with code `P3005`, baseline the migration state:

```bash
npx prisma migrate resolve --applied <baseline_migration_name>
npx prisma migrate deploy
```
