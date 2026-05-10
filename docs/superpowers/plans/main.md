# GFH KPI System — Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web-based employee performance evaluation system for OAO "State Financial Holding" (ГФХ) — ~100 employees, on-premise, bilingual (ru/kg).

**Architecture:** Spring Boot REST API + React.js SPA served by NGINX, PostgreSQL for persistence, Docker Compose for on-premise deployment. Five sequential modules: auth → criteria/rating → evaluation workflow → analytics → audit/admin.

**Tech Stack:** Java 17 + Spring Boot 3.x, PostgreSQL 15, Liquibase, Quartz, Spring Cache (Caffeine), Spring Security + JWT (httpOnly cookie), React.js (Vite + Redux Toolkit + React Router v6 + Tailwind CSS + shadcn/ui + Recharts), react-i18next, Docker Compose, NGINX.

**Mobile:** React Native is out of scope.

---

## Module Execution Order

Modules are strictly sequential. All backend tasks in a module must be complete before frontend tasks begin.

```
M1 → M2 → M3 → M4 → M5
```

Within each module:
```
be-01 → be-02 → ... → be-N → fe-01 → fe-02 → ... → fe-N
```

---

## Task Index

### M1 — Auth, Users & Org Structure

| File | Layer | Title | Status |
|---|---|---|---|
| [m1-auth/be-01-db-schema.md](m1-auth/be-01-db-schema.md) | BE | DB schema + Liquibase migrations (all M1 tables + indexes) | ✅ |
| [m1-auth/be-02-security-jwt.md](m1-auth/be-02-security-jwt.md) | BE | Spring Security + JWT (httpOnly cookie, CSRF, refresh rotation, idle timeout) | ✅ |
| [m1-auth/be-03-user-service.md](m1-auth/be-03-user-service.md) | BE | User management service (CRUD, password policy, Bucket4j rate limiting, lockout) | ✅ |
| [m1-auth/be-04-org-structure.md](m1-auth/be-04-org-structure.md) | BE | Org structure service (CRUD, acyclism validation) | ✅ |
| [m1-auth/be-05-resolve-evaluator.md](m1-auth/be-05-resolve-evaluator.md) | BE | resolveEvaluator algorithm + delegation chain (A→B→C) | ✅ |
| [m1-auth/be-06-infra-setup.md](m1-auth/be-06-infra-setup.md) | BE | Docker Compose + NGINX + Logback + PDPA endpoint + Swagger/OpenAPI | ✅ |
| [m1-auth/fe-01-project-scaffold.md](m1-auth/fe-01-project-scaffold.md) | FE | Project scaffold (Vite + Redux Toolkit + React Router v6 + Tailwind + shadcn/ui + i18next) | ✅ |
| [m1-auth/fe-02-login-flow.md](m1-auth/fe-02-login-flow.md) | FE | Login page + token auto-refresh in background + forced password change flow | ✅ |
| [m1-auth/fe-03-user-management-ui.md](m1-auth/fe-03-user-management-ui.md) | FE | User management UI + PDPA consent page | ✅ |
| [m1-auth/fe-04-org-delegations-ui.md](m1-auth/fe-04-org-delegations-ui.md) | FE | Org structure UI (tree, CRUD) + delegations management UI | ✅ |

### M2 — Criteria & Rating Engine

| File | Layer | Title | Status |
|---|---|---|---|
| [m2-criteria/be-01-db-schema.md](m2-criteria/be-01-db-schema.md) | BE | DB schema (criteria, system_settings, production_calendar, evaluation_score_history) | ✅ |
| [m2-criteria/be-02-criteria-service.md](m2-criteria/be-02-criteria-service.md) | BE | CriteriaService (scope inheritance, weight validation, is_penalty freeze, reactivation) | ✅ |
| [m2-criteria/be-03-rating-service.md](m2-criteria/be-03-rating-service.md) | BE | RatingService (4 formulas, MAX(0,...), real-time recalc, recalculateAffected) | ✅ |
| [m2-criteria/be-04-auto-anti-bonus.md](m2-criteria/be-04-auto-anti-bonus.md) | BE | AutoAntiBonusService + Spring Cache Caffeine | ✅ |
| [m2-criteria/fe-01-criteria-ui.md](m2-criteria/fe-01-criteria-ui.md) | FE | Criteria management UI (positive/anti-bonus tabs, weight sum indicator) | ✅ |
| [m2-criteria/fe-02-settings-calendar-ui.md](m2-criteria/fe-02-settings-calendar-ui.md) | FE | System settings UI + production calendar UI | ✅ |

### M3 — Evaluation Workflow, Appeals & Notifications

| File | Layer | Title | Status |
|---|---|---|---|
| [m3-workflow/be-01-db-schema.md](m3-workflow/be-01-db-schema.md) | BE | DB schema (evaluation_periods, evaluations, evaluation_scores, reactions, files, appeals, notifications) | ✅ |
| [m3-workflow/be-02-evaluation-service.md](m3-workflow/be-02-evaluation-service.md) | BE | EvaluationService (scoring, score history, reassignment, dismissal, dry_run, optimistic locking) | ✅ |
| [m3-workflow/be-03-appeal-reaction.md](m3-workflow/be-03-appeal-reaction.md) | BE | AppealService + reaction logic (AGREE/DISAGREE, auto-AGREE on timeout, UPHELD/OVERTURNED) | ✅ |
| [m3-workflow/be-04-file-service.md](m3-workflow/be-04-file-service.md) | BE | FileService (magic bytes, MIME, filename sanitization, IDOR protection, audit on download) | ✅ |
| [m3-workflow/be-05-quartz-scheduler.md](m3-workflow/be-05-quartz-scheduler.md) | BE | Quartz scheduler (period auto-creation, reminders, deadline enforcement, Asia/Bishkek) | ✅ |
| [m3-workflow/be-06-notifications-websocket.md](m3-workflow/be-06-notifications-websocket.md) | BE | NotificationService + WebSocket STOMP over SockJS + JWT auth in handshake | ✅ |
| [m3-workflow/fe-01-evaluation-form.md](m3-workflow/fe-01-evaluation-form.md) | FE | Evaluation form (positive/anti-bonus sections, autosave draft, file upload) | ✅ |
| [m3-workflow/fe-02-reaction-appeal-ui.md](m3-workflow/fe-02-reaction-appeal-ui.md) | FE | Employee reaction page + appeal page | ✅ |
| [m3-workflow/fe-03-notification-center.md](m3-workflow/fe-03-notification-center.md) | FE | Notification center (WebSocket real-time, unread counter in header) | ✅ |
| [m3-workflow/fe-04-manager-todo.md](m3-workflow/fe-04-manager-todo.md) | FE | Manager "to-do" page (grouped by period type, progress bar, force-close) | ✅ |

### M4 — Dashboards, Analytics & Reports

| File | Layer | Title | Status |
|---|---|---|---|
| [m4-analytics/be-01-hierarchical-analytics.md](m4-analytics/be-01-hierarchical-analytics.md) | BE | AnalyticsService + HierarchicalAnalyticsService (aggregation SQL, caching TTL 5min) | ✅ |
| [m4-analytics/be-02-anti-bonus-analytics.md](m4-analytics/be-02-anti-bonus-analytics.md) | BE | AntiBonusAnalyticsService (top-10, distribution, 12-period dynamics) | ✅ |
| [m4-analytics/be-03-report-service.md](m4-analytics/be-03-report-service.md) | BE | ReportService (Apache POI Excel + iText PDF, audit on export) | ✅ |
| [m4-analytics/fe-01-personal-dashboard.md](m4-analytics/fe-01-personal-dashboard.md) | FE | Personal dashboard (color-coded rating, positive/anti-bonus breakdown, dynamics chart) | ✅ |
| [m4-analytics/fe-02-manager-dashboard.md](m4-analytics/fe-02-manager-dashboard.md) | FE | Manager operational dashboard (progress bar, subordinates table, top-3/bottom-3) | ✅ |
| [m4-analytics/fe-03-hierarchical-analytics-ui.md](m4-analytics/fe-03-hierarchical-analytics-ui.md) | FE | Hierarchical analytics page (3 controls, 4 display modes, drill-down modal, comparison) | ✅ |
| [m4-analytics/fe-04-anti-bonus-analytics-ui.md](m4-analytics/fe-04-anti-bonus-analytics-ui.md) | FE | Anti-bonus analytics page (top-10, distribution chart, dynamics, filters) | ✅ |
| [m4-analytics/fe-05-export-responsive.md](m4-analytics/fe-05-export-responsive.md) | FE | Export buttons on all analytics pages + responsive layout (mobile-first Tailwind) | ✅ |

### M5 — Audit, i18n, Admin Panel & DevOps

| File | Layer | Title | Status |
|---|---|---|---|
| [m5-admin/be-01-audit-aop-trigger.md](m5-admin/be-01-audit-aop-trigger.md) | BE | Spring AOP audit logging + PostgreSQL immutability trigger on audit_log | ✅ |
| [m5-admin/be-02-audit-admin-api.md](m5-admin/be-02-audit-admin-api.md) | BE | Audit API (GET /audit + export) + admin stats + Quartz jobs status + error logs | ✅ |
| [m5-admin/be-03-docker-nginx-devops.md](m5-admin/be-03-docker-nginx-devops.md) | BE | Docker Compose final config + NGINX (SSL, headers, WebSocket) + backup scripts + README | ✅ |
| [m5-admin/fe-01-i18n-language-switcher.md](m5-admin/fe-01-i18n-language-switcher.md) | FE | Language switcher (ru/kg, no reload, localStorage) + complete translation files | ✅ |
| [m5-admin/fe-02-admin-panel.md](m5-admin/fe-02-admin-panel.md) | FE | Admin panel (users, org, criteria, periods, delegations, settings, calendar) | ✅ |
| [m5-admin/fe-03-audit-log-ui.md](m5-admin/fe-03-audit-log-ui.md) | FE | Audit log UI (filters, pagination, Excel export) | ✅ |
| [m5-admin/fe-04-admin-monitoring-ui.md](m5-admin/fe-04-admin-monitoring-ui.md) | FE | Admin monitoring UI (health status, Quartz jobs, last 20 error log lines) | ✅ |

---

## Conventions

- Task files: `be-NN-slug.md` and `fe-NN-slug.md` within each module folder
- Backend tasks in a module are numbered from 01; frontend tasks from 01 (independent per layer)
- Update the Status column above as tasks complete: ⬜ pending → 🔄 in progress → ✅ done
- All backend API uses prefix `/api/v1/`
- All list endpoints use offset-based pagination: `?page=0&size=20`, response includes `content`, `totalElements`, `totalPages`, `number`, `size`
- Error format: `{ "code": "SNAKE_CASE_KEY", "message_ru": "...", "message_kg": "...", "details": {} }`
- Integration tests use Testcontainers + PostgreSQL
- Timezone for all scheduled operations: `Asia/Bishkek` (UTC+6)
