# Implementation Plan Design — GFH KPI System
**Date:** 2026-05-04  
**Scope:** Web application only (React Native mobile is out of scope)

---

## Project Overview

**System:** Employee performance evaluation system for OAO "State Financial Holding" (ГФХ).  
**Backend:** Spring Boot (Java), PostgreSQL, Liquibase, Quartz, Spring Cache (Caffeine), Spring Security + JWT  
**Frontend:** React.js — Vite + Redux Toolkit + React Router v6 + Tailwind CSS + shadcn/ui + Recharts + react-i18next  
**Infrastructure:** Docker Compose, NGINX, Let's Encrypt, on-premise deployment  

---

## Plan File Structure

All plan files live under `docs/superpowers/plans/`.

```
docs/superpowers/plans/
  main.md                        ← master index with links to all task files
  m1-auth/
    be-01-db-schema.md
    be-02-security-jwt.md
    be-03-user-service.md
    be-04-org-structure.md
    be-05-resolve-evaluator.md
    be-06-infra-setup.md
    fe-01-project-scaffold.md
    fe-02-login-flow.md
    fe-03-user-management-ui.md
    fe-04-org-delegations-ui.md
  m2-criteria/
    be-01-db-schema.md
    be-02-criteria-service.md
    be-03-rating-service.md
    be-04-auto-anti-bonus.md
    fe-01-criteria-ui.md
    fe-02-settings-calendar-ui.md
  m3-workflow/
    be-01-db-schema.md
    be-02-evaluation-service.md
    be-03-appeal-reaction.md
    be-04-file-service.md
    be-05-quartz-scheduler.md
    be-06-notifications-websocket.md
    fe-01-evaluation-form.md
    fe-02-reaction-appeal-ui.md
    fe-03-notification-center.md
    fe-04-manager-todo.md
  m4-analytics/
    be-01-hierarchical-analytics.md
    be-02-anti-bonus-analytics.md
    be-03-report-service.md
    fe-01-personal-dashboard.md
    fe-02-manager-dashboard.md
    fe-03-hierarchical-analytics-ui.md
    fe-04-anti-bonus-analytics-ui.md
    fe-05-export-responsive.md
  m5-admin/
    be-01-audit-aop-trigger.md
    be-02-audit-admin-api.md
    be-03-docker-nginx-devops.md
    fe-01-i18n-language-switcher.md
    fe-02-admin-panel.md
    fe-03-audit-log-ui.md
    fe-04-admin-monitoring-ui.md
```

---

## Module Sequence and Dependencies

Modules are strictly sequential — each module requires the previous to be complete:

```
M1 → M2 → M3 → M4 → M5
```

Within each module, all backend tasks complete before any frontend task begins:

```
M1: be-01 → be-02 → be-03 → be-04 → be-05 → be-06 → fe-01 → fe-02 → fe-03 → fe-04
M2: be-01 → be-02 → be-03 → be-04 → fe-01 → fe-02
M3: be-01 → be-02 → be-03 → be-04 → be-05 → be-06 → fe-01 → fe-02 → fe-03 → fe-04
M4: be-01 → be-02 → be-03 → fe-01 → fe-02 → fe-03 → fe-04 → fe-05
M5: be-01 → be-02 → be-03 → fe-01 → fe-02 → fe-03 → fe-04
```

---

## Task File Format

Each task file uses this structure:

```markdown
# [Task Title]
**Module:** M? — [Module Name]  
**Layer:** Backend | Frontend  
**Depends on:** [task file(s) that must be complete first]

## Scope
What this task covers, with references to specific doc sections.

## Deliverables
Concrete artifacts: entities, services, endpoints, pages, tests.

## Acceptance Criteria
How to verify this task is complete.
```

---

## Task Breakdown (41 tasks)

### M1 — Auth & Users (6 BE + 4 FE)

| File | Title |
|---|---|
| be-01 | DB schema + Liquibase migrations (users, org_units, refresh_tokens, login_attempts, password_reset_tokens, evaluator_delegations, audit_log, pdpa_consents + all indexes) |
| be-02 | Spring Security + JWT (httpOnly cookie, CSRF double-submit, refresh rotation, idle timeout) |
| be-03 | User management service (CRUD, password policy, bcrypt, Bucket4j rate limiting, account lockout) |
| be-04 | Org structure service (CRUD, acyclism validation, manager_id graph traversal) |
| be-05 | resolveEvaluator algorithm + delegation chain (A→B→C), audit_log for steps 4–5 |
| be-06 | Docker Compose + NGINX + Logback + PDPA endpoint + Swagger/OpenAPI |
| fe-01 | Project scaffold (Vite + Redux Toolkit + React Router v6 + Tailwind + shadcn/ui + react-i18next) |
| fe-02 | Login page + token auto-refresh in background + forced password change flow |
| fe-03 | User management UI (list, create, edit, deactivate, reactivate, reset password) + PDPA consent page |
| fe-04 | Org structure UI (tree, CRUD) + delegations management UI (chain support) |

### M2 — Criteria & Rating (4 BE + 2 FE)

| File | Title |
|---|---|
| be-01 | DB schema (criteria, system_settings, production_calendar, evaluation_score_history + indexes) |
| be-02 | CriteriaService (scope inheritance, weight validation sum=100%, is_penalty freeze, reactivation) |
| be-03 | RatingService (4 formulas: employee/manager/chairman/manager-without-subs, MAX(0,...), real-time recalc, recalculateAffected) |
| be-04 | AutoAntiBonusService + Spring Cache Caffeine (applicableCriteria, systemSettings, productionCalendar) |
| fe-01 | Criteria management UI (positive/anti-bonus tabs, weight sum indicator, anti-weight info block) |
| fe-02 | System settings UI + production calendar UI |

### M3 — Evaluation Workflow (6 BE + 4 FE)

| File | Title |
|---|---|
| be-01 | DB schema (evaluation_periods, evaluations, evaluation_scores, employee_reactions, reaction_files, files, file_access_log, appeals, notifications + indexes) |
| be-02 | EvaluationService (score entry, score history, reassignment on transfer, dismissal handling, dry_run, optimistic locking) |
| be-03 | AppealService + reaction logic (AGREE/DISAGREE, auto-AGREE on timeout, UPHELD/OVERTURNED) |
| be-04 | FileService (magic bytes MIME check, filename sanitization, local storage outside webroot, IDOR protection, audit on download) |
| be-05 | Quartz scheduler (period auto-creation by type, deadline reminders at -1day/-1hr, auto-evaluation on missed deadline, reaction timeout check, Asia/Bishkek timezone) |
| be-06 | NotificationService + WebSocket STOMP over SockJS (JWT auth in handshake, unread counter push) |
| fe-01 | Evaluation form (positive/anti-bonus sections, autosave draft to localStorage every 30s, file upload up to 5 files) |
| fe-02 | Employee reaction page + appeal page (both criteria types, file evidence upload) |
| fe-03 | Notification center (WebSocket real-time, unread counter in header, mark read/all-read) |
| fe-04 | Manager "to-do" page (grouped by period type, progress bar X/N, force-close with double-confirm) |

### M4 — Analytics & Reports (3 BE + 5 FE)

| File | Title |
|---|---|
| be-01 | AnalyticsService + HierarchicalAnalyticsService (aggregation SQL, drill-down, comparison modes, caching TTL 5min, invalidation on period close) |
| be-02 | AntiBonusAnalyticsService (top-10, distribution by criteria, 12-period dynamics, auto vs manual split) |
| be-03 | ReportService (Apache POI Excel + iText PDF, GFH logo placeholder, export metadata, audit_log on export) |
| fe-01 | Personal dashboard (color-coded rating 3 zones, positive/anti-bonus breakdown, dynamics line chart, active cycles) |
| fe-02 | Manager operational dashboard (progress bar, subordinates table with trend ↑↓, top-3/bottom-3, open appeals, pending tasks) |
| fe-03 | Hierarchical analytics page (3 independent controls, 4 display modes, comparative mode, drill-down modal, localStorage persistence) |
| fe-04 | Anti-bonus analytics page (top-10, distribution chart, dynamics, filters by period/type/unit) |
| fe-05 | Export buttons on all analytics pages + responsive layout (mobile-first Tailwind, controls collapse to dropdown on mobile) |

### M5 — Audit, i18n, Admin, DevOps (3 BE + 4 FE)

| File | Title |
|---|---|
| be-01 | Spring AOP audit logging (@AfterReturning on service methods) + PostgreSQL immutability trigger on audit_log |
| be-02 | Audit API (GET /audit with filters + export) + admin stats API + Quartz jobs status API + error logs API |
| be-03 | Docker Compose final config + NGINX (SSL Let's Encrypt, security headers, WebSocket proxy) + backup scripts (pg_dump + rsync + cron) + README |
| fe-01 | Language switcher component (ru/kg, no page reload, localStorage persistence) + complete ru/kg translation files |
| fe-02 | Admin panel (navigation + pages for: users, org structure, criteria, periods, delegations, system settings, production calendar) |
| fe-03 | Audit log UI (filters: date/user/action/entity, pagination, Excel export button) |
| fe-04 | Admin monitoring UI (health status from /actuator/health, Quartz jobs table, last 20 ERROR log lines) |

---

## Conventions

- File names: `be-NN-short-slug.md` and `fe-NN-short-slug.md` within each module folder
- Backend tasks numbered from 01; frontend tasks numbered from 01 (independent sequence per layer)
- All backend tasks in a module must reach "done" before fe-01 of that module starts
- "Done" means: code written, unit tests pass, integration tests pass (Testcontainers where specified)
