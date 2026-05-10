# Dev seed data — design

**Date:** 2026-05-10
**Reference date (all relative timestamps):** 2026-05-10
**Scope:** Populate dev database with realistic users, org tree, criteria, periods, evaluations, scores, appeals, calendar, settings, delegations.

## Goals

- 28 seeded users (+ existing admin = 29) covering all 6 roles.
- 1 closed period (Q1 2026) + 1 active period (Q2 2026) with realistic evaluation flow data.
- Reproducible: re-run dev DB → same data. No `NOW()` calls; all dates are SQL literals.
- Prod-safe: every changeset gated `context="dev"`; included only when `SPRING_LIQUIBASE_CONTEXTS=dev`.
- All seeded users share password `Test123!@#` (single BCrypt hash literal).

## Non-goals

- Audit log entries (skip — async aspect generates real rows on app actions; immutability trigger blocks updates).
- Real file blobs for `evaluation_files` (only metadata rows with placeholder paths).
- Bilingual translations of names/positions beyond Russian (kg locale uses same labels for now).

## Delivery

New folder: `backend/src/main/resources/db/changelog/m6/`. Master changelog already does `<includeAll path="db/changelog/..."/>`-style auto-discovery; verify and add `m6` directive if needed.

Each changeset:
```xml
<changeSet id="0XX-seed-..." author="gfh" context="dev" runOnChange="false">
```

Run dev with seeds:
```bash
SPRING_LIQUIBASE_CONTEXTS=dev mvn spring-boot:run
```

## Org tree (10 units)

Root → leaves:

```
1 Председатель Правления
├── 2 Финансовый блок (Deputy 1)
│   ├── 4 Финансовый департамент
│   └── 5 Департамент управления рисками
└── 3 Операционный блок (Deputy 2)
    ├── 6 ИТ-департамент
    │   ├── 8 Отдел разработки
    │   └── 9 Отдел инфраструктуры
    ├── 7 Юридический департамент
    └── 10 Управление персоналом
```

`name_ru` populated; `name_kg` mirrors `name_ru` for now.

## Users (28 + 1 admin)

| # | Role | Unit | Manager | Position |
|---|---|---|---|---|
| 1 | CHAIRMAN | 1 | — | Председатель Правления |
| 2 | DEPUTY_CHAIRMAN | 2 | 1 | Первый заместитель Председателя |
| 3 | DEPUTY_CHAIRMAN | 3 | 1 | Заместитель Председателя |
| 4 | HEAD_OF_DEPARTMENT | 4 | 2 | Директор Финансового департамента |
| 5 | HEAD_OF_DEPARTMENT | 5 | 2 | Директор Департамента рисков |
| 6 | HEAD_OF_DEPARTMENT | 6 | 3 | Директор ИТ-департамента |
| 7 | HEAD_OF_DEPARTMENT | 7 | 3 | Директор Юридического департамента |
| 8 | HEAD_OF_DEPARTMENT | 10 | 3 | Директор Управления персоналом |
| 9 | HEAD_OF_DEPARTMENT_UNIT | 8 | 6 | Начальник Отдела разработки |
| 10 | HEAD_OF_DEPARTMENT_UNIT | 9 | 6 | Начальник Отдела инфраструктуры |
| 11–14 | EMPLOYEE | 4 | 4 | Финансовые аналитики/бухгалтеры (×4) |
| 15–17 | EMPLOYEE | 5 | 5 | Риск-аналитики (×3) |
| 18–21 | EMPLOYEE | 8 | 9 | Разработчики (×4) |
| 22–23 | EMPLOYEE | 9 | 10 | Системные администраторы (×2) |
| 24–26 | EMPLOYEE | 7 | 7 | Юристы (×3) |
| 27–28 | EMPLOYEE | 10 | 8 | HR-специалисты (×2) |

Names: Kyrgyz/Russian mix (e.g., Айбек Жунусов, Алия Мамбетова, Дмитрий Соколов, Бурул Асанова, Михаил Петров, Жанара Бакирова). Emails: `firstname.lastname@gfh.kg` ASCII transliteration.

`password_updated_at = 2026-04-01` (not expired). `is_active = true`. `failed_login_attempts = 0`. `password_history = '[]'::jsonb`.

## Criteria catalog (12)

| Type | Code | name_ru | weight |
|---|---|---|---|
| QUANTITATIVE | PLAN_EXEC | Выполнение плана | 40 |
| QUANTITATIVE | REVENUE | KPI: Доход | 35 |
| QUANTITATIVE | COST_REDUCTION | KPI: Снижение издержек | 25 |
| QUALITATIVE | TEAMWORK | Работа в команде | 30 |
| QUALITATIVE | INITIATIVE | Инициативность | 25 |
| QUALITATIVE | PROFESSIONALISM | Профессионализм | 25 |
| QUALITATIVE | COMMUNICATION | Коммуникация | 20 |
| KPI | GOAL_ACHIEVEMENT | Достижение целей | 40 |
| KPI | PROJECT_DELIVERY | Сдача проектов | 35 |
| KPI | CSAT | Удовлетворённость клиентов | 25 |
| DISCIPLINE | PUNCTUALITY | Пунктуальность | 60 |
| DISCIPLINE | POLICY | Соблюдение регламентов | 40 |

Weights sum = 100 per type group. Active for both periods.

## Periods

| ID | Type | Start | End | Submission deadline | Status | closed_at |
|---|---|---|---|---|---|---|
| 1 | QUARTERLY | 2026-01-01 | 2026-03-31 | 2026-04-05T18:00 | CLOSED | 2026-04-10T10:00 |
| 2 | QUARTERLY | 2026-04-01 | 2026-06-30 | 2026-07-05T18:00 | ACTIVE | NULL |

`auto_created = false`, `created_by = admin id`.

## Evaluations

Total: 27 per period (skip chairman — no evaluator). Evaluator = direct manager (`manager_id`) per `resolveEvaluator`.

### Q1 2026 (CLOSED): all 27 SUBMITTED

- All criteria scored.
- `final_score` computed using formula 1 (weighted average of criteria scores × type-group weights, then averaged across type groups).
- `evaluation_score_history` row per evaluation (event=PERIOD_CLOSE).

**Per-user score personality (deterministic, drives realistic charts):**
- 3 high performers (final ~88–95): users #11, #18, #24
- 3 low performers (final ~55–65): users #15, #22, #27
- Remaining 21 average (final ~72–82, gaussian-ish spread)

### Q1 appeals (3)

| User | Status | Outcome |
|---|---|---|
| #15 | RESOLVED_ACCEPTED | score raised +5, history row event=APPEAL_RESOLVED |
| #22 | RESOLVED_ACCEPTED | score raised +3 |
| #27 | RESOLVED_REJECTED | no change |

### Q2 2026 (ACTIVE): 27 evaluations, mixed states

| State | Count | Detail |
|---|---|---|
| SUBMITTED | 11 | full scores + evaluator comment |
| IN_PROGRESS | 8 | 3–5 criteria scored, no submit |
| DRAFT | 5 | empty (just shell row) |
| SUBMITTED + PENDING appeal | 3 | full scores, appeal row status=PENDING |

### Reactions + files

- `evaluation_reactions`: 5 rows (likes on Q1 evaluator comments by employees).
- `evaluation_files`: 3 rows (file_name=`appeal_evidence.pdf`, path=`/tmp/gfh-uploads/seed/appeal-N.pdf`, size=12345). No real blobs.

## Production calendar (2026)

365 rows for `2026-01-01` … `2026-12-31`. `is_working_day` flags:
- Weekends (Sat/Sun) → false
- KG holidays → false: Jan 1–7, Mar 8, Mar 21 (Nooruz), May 1, May 5, May 9, Aug 31, Nov 7–8
- Else → true

Generated via SQL `generate_series` + CASE in single changeset.

## System settings

Insert only if missing (each row guarded by `<preConditions onFail="MARK_RAN"><sqlCheck expectedResult="0">SELECT count(*) FROM system_settings WHERE key='X'</sqlCheck></preConditions>`):

| key | value |
|---|---|
| notification_enabled | true |
| default_period_type | QUARTERLY |
| appeal_window_days | 10 |
| password_expiry_days | 90 |

## Delegations (2)

| Delegator | Delegate | from | to | status |
|---|---|---|---|---|
| HOD Finance (#4) | Deputy 1 (#2) | 2026-04-15 | 2026-04-25 | EXPIRED |
| HOD IT (#6) | Deputy 2 (#3) | 2026-05-08 | 2026-05-20 | ACTIVE |

## File layout

```
backend/src/main/resources/db/changelog/m6/
├── 022-seed-org-units.xml
├── 023-seed-users.xml
├── 024-seed-criteria.xml
├── 025-seed-production-calendar.xml
├── 026-seed-system-settings.xml
├── 027-seed-delegations.xml
├── 028-seed-periods-and-evaluations.xml
└── 029-seed-scores-appeals-history.xml
```

Master changelog updated to include `m6/` if not auto-discovered.

## Testing / verification

- `mvn spring-boot:run` with `SPRING_LIQUIBASE_CONTEXTS=dev` → app boots, no Liquibase errors.
- `mvn spring-boot:run` without dev context → no seed rows inserted; bootstrap admin still present.
- Login as `aibek.zhunusov@gfh.kg / Test123!@#` (a HOD-Finance employee) → dashboard renders Q1 history bar + Q2 active scorecard.
- Login as admin → `/admin/users` shows 29 users; `/admin/periods` shows 2 periods.
- Re-run liquibase → no duplicate inserts (changesets idempotent via `runOnChange=false` + checksum).

## Open questions

None — all resolved during brainstorming.

## Risks

- BCrypt hash literal must match `Test123!@#` exactly. Generate once via `BCryptPasswordEncoder` strength 12 and paste; document the source command in changeset comment.
- Score-history `criteria_type` column added in changeset 014 — seed must populate it.
- Foreign keys: insert order matters (org_units → users → criteria → periods → evaluations → scores → history → appeals → reactions/files).
- ID stability: use explicit `id` columns in inserts to make cross-references deterministic; bump PG sequences after final insert via `SELECT setval(...)` so app-generated IDs don't collide.
