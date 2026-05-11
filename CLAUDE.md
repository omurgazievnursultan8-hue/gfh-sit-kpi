# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-based employee KPI evaluation system for OAO "State Financial Holding" (~100 employees, on-premise). Bilingual (ru/kg). Monorepo: `backend/` (Spring Boot) + `frontend/` (React/Vite).

## Commands

### Full dev stack (one shot)

```bash
# Starts Postgres container + backend + frontend, tails logs, Ctrl+C stops backend/frontend
./scripts/dev-start.sh

# Override Liquibase contexts (default: dev, loads seed data; use prod for empty DB)
SPRING_LIQUIBASE_CONTEXTS=prod ./scripts/dev-start.sh
```

Logs land in `.dev-logs/{backend,frontend}.log`. Postgres container (`gfh-postgres`) is left running on Ctrl+C; stop with `docker stop gfh-postgres`. Backend `:8080`, frontend `:5173`.

### Backend

```bash
# Run (dev) — requires PostgreSQL on localhost:5432/gfh
cd backend
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/gfh \
SPRING_DATASOURCE_USERNAME=gfh \
SPRING_DATASOURCE_PASSWORD=gfh \
JWT_SECRET=dev-secret-key-at-least-32-chars-long!! \
LOG_PATH=/tmp/gfh-logs \
UPLOAD_DIR=/tmp/gfh-uploads \
mvn spring-boot:run

# Run all tests (Testcontainers — needs Docker)
cd backend && mvn test

# Run a single test class
cd backend && mvn test -Dtest=UserServiceTest

# Build JAR
cd backend && mvn package -DskipTests
```

### Frontend

```bash
# Dev server (proxies /api → localhost:8080)
cd frontend && npm run dev

# Type check
cd frontend && npx tsc --noEmit

# Production build
cd frontend && npm run build
```

### Dev database (Docker)

```bash
docker run -d --name gfh-postgres \
  -e POSTGRES_DB=gfh -e POSTGRES_USER=gfh -e POSTGRES_PASSWORD=gfh \
  -p 5432:5432 postgres:15-alpine
```

### Production (Docker Compose)

```bash
cp .env.example .env   # fill POSTGRES_PASSWORD, JWT_SECRET
# Place SSL certs: nginx/ssl/server.crt, nginx/ssl/server.key
docker compose up -d
```

Default admin: `admin@gfh.kg` / `Admin123!@#` (change on first login).

## Architecture

### Backend (`kg.gfh.kpi`)

Spring Boot 3.2, Java 17. All API endpoints prefixed `/api/v1/`. Auth via httpOnly JWT cookies (access 15min, refresh 7d with rotation).

**Package structure:**
- `entity/` — JPA entities. Enums are **inner classes** on their entity (e.g. `Evaluation.EvaluationStatus`, `EvaluationPeriod.PeriodStatus`, `Appeal.AppealStatus`) — not in a separate package.
- `controller/` — REST controllers, one per domain.
- `service/` — business logic. `AuditService` is `@Async` + `REQUIRES_NEW` propagation.
- `security/` — `JwtAuthenticationFilter`, `JwtService`, Bucket4j rate limiter (5 attempts/15min per IP on login).
- `aspect/` — `AuditAspect` intercepts `@Audited(action=..., entityType=...)` annotations and writes to `audit_log` asynchronously.
- `job/` + `scheduler/` — Quartz jobs for period auto-creation, deadline enforcement, reminders (timezone: `Asia/Bishkek`).
- `annotation/` — `@Audited` annotation.

**Key domain rules:**
- `resolveEvaluator` walks the org tree upward + follows delegation chains (max 5 hops, `MAX_DELEGATION_CHAIN` constant).
- Rating has 4 formulas; always `MAX(0, score)` floor.
- `audit_log` rows are immutable — PostgreSQL trigger raises exception on UPDATE/DELETE.
- `audit_log` table columns: `user_id`, `user_name`, `timestamp`, `new_value` (NOT `actor_id`/`created_at`/`details`).

**Liquibase migrations:** `backend/src/main/resources/db/changelog/` organized by module (`m1/`, `m2/`, `m3/`, `m5/`). No `m4/` folder — analytics uses existing tables. Always add new changesets in a new numbered file; never modify existing ones.

**Pagination convention:** All list endpoints use `?page=0&size=20`, response: `{ content, totalElements, totalPages, number, size }`.

**Error format:** `{ "code": "SNAKE_CASE_KEY", "messageRu": "...", "messageKg": "...", "details": {} }`.

### Frontend (`src/`)

React 18, Vite, Redux Toolkit, React Router v6, Tailwind CSS, react-i18next.

**State:** Redux store has two slices — `auth` (`userId`, `email`, `role`, `isAuthenticated`, `passwordExpired`, `pdpaRequired`) and `notifications`. There is no `user` object or `selectCurrentUser` selector — access role directly via `useSelector((s: RootState) => s.auth.role)`.

**Routing:** `App.tsx` uses flat `<Routes>`. Admin panel uses nested routes under `/admin` with `AdminLayout` (which renders `<Outlet />`). `ProtectedRoute` checks `isAuthenticated`, `passwordExpired`, and optional `allowedRoles`.

**i18n:** Translation files at `frontend/public/locales/{lng}/translation.json` loaded via `i18next-http-backend` (HttpBackend). Language stored in localStorage key `gfh_lang`. Do NOT put translations in `src/`.

**API calls:** All via `src/app/api.ts` (axios instance with base URL `/api/v1`). Feature-specific API modules (e.g. `adminApi.ts`, `auditApi`) live alongside their feature pages.

**Vite proxy:** `/api` → `http://localhost:8080`, `/ws` → `ws://localhost:8080` (WebSocket). `global: 'globalThis'` define is required for SockJS.

**WebSocket:** STOMP over SockJS at `/ws`. JWT passed via cookie on handshake. Notifications pushed to `/user/queue/notifications`.

**Admin panel:** Lives in `src/features/admin/`. `AdminLayout` + `AdminSidebar` + per-page components. Routes: `/admin` (dashboard), `/admin/users`, `/admin/org`, `/admin/criteria`, `/admin/periods`, `/admin/delegations`, `/admin/settings`, `/admin/calendar`, `/admin/audit`, `/admin/monitoring`.

## Key Constraints

- Org unit tree endpoint: `GET /api/v1/org/structure` (not `/org/tree`).
- Org unit display name field: `nameRu` (not `name`).
- Appeal open status enum value: `PENDING` (not `OPEN`).
- AuditLog `countBy` method uses `countByTimestampAfter` (field is `timestamp`, not `createdAt`).
- Backend tests use Testcontainers + real PostgreSQL (no mocks for DB layer).
