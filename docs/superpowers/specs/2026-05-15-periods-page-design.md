# Periods Page — Design

**Date:** 2026-05-15
**Status:** Approved

## Problem

The `/admin/periods` route currently renders `MyTasksPage` (an evaluator queue).
For an ADMIN user this shows an empty list — admins have no assigned
evaluations. The original `ManagerTodoPage` was deleted. There is no real
period-management page.

## Goal

A dedicated admin page for evaluation-period lifecycle management: list all
periods, create new ones, activate drafts, close active periods, and show
per-period completion progress.

## Backend API (existing, no changes)

All under `/api/v1`, ADMIN-only for mutations.

| Endpoint | Purpose |
|----------|---------|
| `GET /periods` | List all periods |
| `POST /periods` | Create period — body: `{ type, startDate, endDate, submissionDeadline }` → new period is `DRAFT` |
| `POST /periods/{id}/activate` | DRAFT → ACTIVE |
| `POST /periods/{id}/close` | ACTIVE → CLOSED |
| `GET /periods/{id}/progress` | `{ total, completed }` |

`Period`: `id, type (MONTHLY|QUARTERLY|ANNUAL), startDate, endDate,
submissionDeadline, status (DRAFT|ACTIVE|CLOSED), autoCreated, createdAt`.

`periodsApi.ts` already exposes `list`, `create`, `activate`, `close`,
`progress`. No API changes needed.

## Files

- `frontend/src/features/periods/PeriodsPage.tsx` — container
- `frontend/src/features/periods/components/PeriodCard.tsx` — one period card
- `frontend/src/features/periods/components/PeriodFormModal.tsx` — create form
- `frontend/src/App.tsx:102` — route element `MyTasksPage` → `PeriodsPage`

## Layout

Page header: title + "Создать период" button.

Three status sections, stacked top-down:
1. **Активные** (ACTIVE)
2. **Черновики** (DRAFT)
3. **Завершённые** (CLOSED)

Each section = heading + vertical list of `PeriodCard`. Empty section hidden.

## PeriodCard

Shows:
- Type label — Ежемесячная / Квартальная / Годовая
- Date range `startDate – endDate`
- Submission deadline
- Status badge
- `autoCreated` tag when true
- Progress bar `completed / total` — ACTIVE and CLOSED only; DRAFT skipped
  (no evaluations exist yet)

Actions by status:
- `DRAFT` → "Активировать" button → `periodsApi.activate(id)`
- `ACTIVE` → "Закрыть" button → `ConfirmDialog` → `periodsApi.close(id)`
- `CLOSED` → no actions

## Data Flow

1. On mount: `periodsApi.list()`; split into 3 status buckets.
2. For each ACTIVE/CLOSED period: `periodsApi.progress(id)` in a parallel
   `Promise.all`. DRAFT periods skipped.
3. After activate / close / create succeeds → reload the list.

## PeriodFormModal

Fields:
- `type` — select (MONTHLY / QUARTERLY / ANNUAL)
- `startDate`, `endDate`, `submissionDeadline` — date inputs

Submit → `periodsApi.create()`. New period appears under Черновики.
Reuse the existing modal pattern from the criteria/delegation form modals.

## Aesthetic

Match existing admin pages: deep-green hero, cream paper, JetBrains Mono
labels, Source Serif display, design tokens (`--accent`, `--line`, etc.).
Reuse `ConfirmDialog` for the close confirmation.

## Out of Scope

- Pending-appeals panel — `MyTasksPage` already owns this.
- Edit / delete periods — backend has no such endpoints.
