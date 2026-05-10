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

## Criteria catalog (10)

DB schema only allows `type IN ('POSITIVE','ANTI_BONUS')`. 8 POSITIVE criteria summing to 100% + 2 ANTI_BONUS deductions.

| # | Type | name_ru | weight |
|---|---|---|---|
| 1 | POSITIVE | Выполнение плана | 20 |
| 2 | POSITIVE | KPI: Доход / результативность | 15 |
| 3 | POSITIVE | Достижение целей | 15 |
| 4 | POSITIVE | Сдача проектов | 10 |
| 5 | POSITIVE | Профессионализм | 10 |
| 6 | POSITIVE | Работа в команде | 10 |
| 7 | POSITIVE | Инициативность | 10 |
| 8 | POSITIVE | Коммуникация | 10 |
| 9 | ANTI_BONUS | Дисциплинарные нарушения | 5 |
| 10 | ANTI_BONUS | Несоблюдение регламентов | 5 |

POSITIVE weights sum to 100. ANTI_BONUS criteria deduct from final score. `org_unit_id = NULL` (global). `is_active = true`. `is_auto_calculated = false`. `is_frozen = false`.

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

DB enum `appeals.status`: `PENDING / UPHELD / OVERTURNED / AUTO_AGREED`. UPHELD = appellant won (score corrected); OVERTURNED = appeal denied.

| User | Appeal status | Eval final-status | Outcome |
|---|---|---|---|
| #15 | UPHELD | CLOSED | final_score +5 |
| #22 | UPHELD | CLOSED | final_score +3 |
| #27 | OVERTURNED | CLOSED | no score change |

Other 24 Q1 evals → status `CLOSED` (acknowledged + period closed).

### Q2 2026 (ACTIVE): 27 evaluations, mixed states

`evaluations.status` enum is `DRAFT / SUBMITTED / ACKNOWLEDGED / APPEALED / CLOSED`. No `IN_PROGRESS` — partial-progress evaluations stay `DRAFT` with some scores filled.

| State | Count | Detail |
|---|---|---|
| SUBMITTED | 11 | all 10 criteria scored, evaluator comment, `submitted_at` set |
| DRAFT (partial) | 8 | 3–5 criteria scored, `submitted_at` NULL |
| DRAFT (empty) | 5 | shell only, no scores |
| APPEALED + appeal PENDING | 3 | full scores, `appeals.status=PENDING`, `deadline=2026-07-08` |

### Reactions + files

- `evaluation_reactions`: 5 rows on Q1 CLOSED evals — `reaction='AGREE'`, optional `comment`. Unique per evaluation.
- `evaluation_files`: 3 rows attached to the 3 Q1 appealed evals. `original_name='appeal_evidence.pdf'`, `storage_path='/seed/appeal-{n}.pdf'` (unique per row), `mime_type='application/pdf'`, `file_size=12345`, `uploaded_by` = evaluatee. No real blobs on disk.

## Production calendar (2026)

Schema is **monthly aggregate** (`year`, `month`, `working_days`, unique on `(year,month)`). 12 rows for 2026 with KG-realistic working day counts (after subtracting weekends and public holidays):

| month | working_days | rationale |
|---|---|---|
| 1 | 17 | 22 weekdays − 5 (Jan 1–7 holiday) |
| 2 | 20 | 20 weekdays |
| 3 | 20 | 22 weekdays − 2 (Mar 8, Mar 21) |
| 4 | 22 | 22 weekdays |
| 5 | 18 | 21 weekdays − 3 (May 1, 5, 9) |
| 6 | 22 | 22 weekdays |
| 7 | 23 | 23 weekdays |
| 8 | 20 | 21 weekdays − 1 (Aug 31) |
| 9 | 22 | 22 weekdays |
| 10 | 22 | 22 weekdays |
| 11 | 19 | 21 weekdays − 2 (Nov 7–8) |
| 12 | 23 | 23 weekdays |

`created_by = 1` (admin).

## System settings

Changeset `011-create-system-settings` already seeds `idle_timeout_minutes`, `password_expiry_days`, `evaluation_period_days`, `appeal_deadline_days`, `auto_agree_timeout_hours`, `pdpa_version`. Seed only the missing keys, guarded by sqlCheck preconditions:

| key | value | description |
|---|---|---|
| notification_enabled | true | Master toggle for in-app + websocket notifications |
| default_period_type | QUARTERLY | Default `EvaluationPeriod.type` for auto-creation |

## Delegations (2)

Schema columns: `evaluatee_id`, `original_evaluator_id`, `delegated_to_id`, `valid_from`, `valid_to`, `is_active`, `reason`, `created_by`. There is no `status` enum — `is_active=false` denotes revoked/cancelled. Past-dated delegations remain `is_active=true` until explicitly revoked.

| evaluatee | original evaluator | delegated to | valid_from | valid_to | is_active | reason |
|---|---|---|---|---|---|---|
| #11 (Finance employee) | #4 (HOD-Finance) | #2 (Deputy 1) | 2026-04-15 | 2026-04-25 | true | Отпуск руководителя |
| #18 (IT-Dev employee) | #9 (HOD-Unit Dev) | #6 (HOD-IT) | 2026-05-08 | 2026-05-20 | true | Командировка |

`created_by = 1` (admin).

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
