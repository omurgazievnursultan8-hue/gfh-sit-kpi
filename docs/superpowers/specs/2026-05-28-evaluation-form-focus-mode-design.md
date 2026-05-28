# Evaluation Form — Focus Mode Redesign

**Date**: 2026-05-28
**Owner**: frontend + backend
**Status**: Design approved, pending implementation plan

## Summary

Replace the current dense, two-column `EvaluationFormPage` with a focused, one-criterion-at-a-time stepper. Evaluators rate each KPI criterion individually with full rubric visibility, preset score chips, per-criterion file attachments, and a two-phase flow that separates positive scoring from anti-bonus deductions. Reduces cognitive load, increases rating quality, and aligns evidence files with the specific criterion they support.

## Goals

- One criterion per screen → less context switching, higher rating quality
- Show full scoring rubric (new backend `descriptionRu/Kg` field)
- Per-criterion file evidence (audit trail aligned with score)
- Two-phase flow: positive scoring → anti-bonus deductions
- Preset chip score input for fast scoring with custom-value escape hatch
- Auto-calculated criteria visible but read-only
- Keyboard-first navigation for power users
- Mobile-first stepper with sticky bottom bar and slide-in checklist

## Non-Goals

- New rating formula or weight semantics
- Changes to delegation / evaluator resolution
- Real-time multi-user editing (single-evaluator workflow only)
- Score history / undo timeline (audit log already covers this)
- Bulk evaluation (one evaluatee per page remains)

## Architecture

```
EvaluationFormPage  (route /evaluations/:id/form)
├─ <FormShell>                       page chrome, sticky topbar, dv3 theme
│  ├─ <StepperHeader>                progress dots, phase badge, evaluatee strip
│  ├─ <PhaseRouter>                  selects current view from state machine
│  │   ├─ <CriterionStep>            one criterion per step (positive + anti-bonus)
│  │   │   ├─ <RubricPanel>          name + descriptionRu + scope chip + weight
│  │   │   ├─ <ScoreInput>           preset chips → custom number reveal
│  │   │   ├─ <NoteField>            textarea autosize, validation
│  │   │   └─ <CriterionFiles>       drag-drop, list of files w/ criteria_id
│  │   ├─ <PhaseTransition>          "Положительные готовы → антибонус?"
│  │   └─ <ReviewStep>               final summary, low-total warn, submit
│  ├─ <BottomBar>                    prev / next / save indicator / submit
│  └─ <ChecklistDrawer>              right-side panel (desktop) / drawer (mobile)
├─ useEvaluationForm()               state hook
├─ useKeyboardShortcuts()            ←/→, 1..5, Cmd+S, Cmd+Enter, ?
└─ useAutosave()                     debounced 5s + interval 30s + visibilitychange
```

**State machine**: `phase: 'positive' | 'transition' | 'antibonus' | 'review'`, `cursor: number`. URL hash sync (`#p=pos&i=3`) for deep-link and browser back.

## Backend Changes

### Liquibase

New file `backend/src/main/resources/db/changelog/m7/035-evaluation-form-focus-mode.xml`:

```xml
<changeSet id="m7-001-add-criteria-description" author="azamat">
  <addColumn tableName="criteria">
    <column name="description_ru" type="TEXT"/>
    <column name="description_kg" type="TEXT"/>
  </addColumn>
</changeSet>

<changeSet id="m7-002-add-evaluation-file-criteria-id" author="azamat">
  <addColumn tableName="evaluation_file">
    <column name="criteria_id" type="BIGINT">
      <constraints nullable="true"
        foreignKeyName="fk_eval_file_criteria"
        references="criteria(id)"/>
    </column>
  </addColumn>
  <createIndex tableName="evaluation_file" indexName="idx_eval_file_criteria">
    <column name="criteria_id"/>
  </createIndex>
</changeSet>
```

Register the new file in `db.changelog-master.xml` under `m7/`.

### Entities

- `Criteria`: add nullable `String descriptionRu` + `String descriptionKg` (TEXT columns).
- `EvaluationFile`: add nullable `Long criteriaId` (null = evaluation-level evidence).

### DTOs

- `CriteriaRequest` + `CriteriaResponse`: add `descriptionRu`, `descriptionKg`.
- `EvaluationFileResponse`: add `criteriaId`.

### Endpoints

- `PUT /api/v1/criteria/{id}` — accepts description fields (existing endpoint, extended).
- `POST /api/v1/evaluations/{id}/files` — accepts optional `criteriaId` form-data field. FK validated server-side.
- `GET /api/v1/evaluations/{id}/files` — returns `criteriaId` per file for client-side grouping.
- No changes to `POST /scores`, `POST /preview`, `POST /submit` request/response shapes.

### Server-side validation rules (mirror client)

- Score in `[0, criteria.weight]`.
- Anti-bonus value > 0 ⇒ note non-empty (≥10 chars). Reject with `ANTIBONUS_NOTE_REQUIRED`.
- `Criteria.autoCalculated == true` → reject manual score update with `AUTO_CRITERIA_READONLY`.
- Submit recomputes total server-side regardless of client preview.

### Audit

Existing `@Audited` on `CriteriaController.update` captures description edits automatically. File upload audit event extended to include `criteriaId` in `new_value`.

### Deletion policy

Criterion deletion with linked files → **RESTRICT** (409). Frozen criteria + files outlive criterion edits.

## Frontend State + Data Flow

### `useEvaluationForm(evaluationId)` hook

```ts
type Phase = 'positive' | 'transition' | 'antibonus' | 'review'
type ScoreEntry = { value: string; note: string; dirty: boolean }
type FileEntry = {
  id: number;
  name: string;
  criteriaId: number | null;
  size: number;
  mime: string;
}

interface FormState {
  evaluation: Evaluation | null
  criteria: Criteria[]              // filtered: active
  positive: Criteria[]              // memoized
  antibonus: Criteria[]             // memoized
  scores: Record<number, ScoreEntry>
  files: FileEntry[]
  phase: Phase
  cursor: number                    // index within current phase's list
  previewScore: number | null
  lastSaved: Date | null
  saving: boolean
  loading: boolean
  error: string | null
}
```

**Derived selectors**:
- `currentCriterion = phase==='positive' ? positive[cursor] : phase==='antibonus' ? antibonus[cursor] : null`
- `posFilled / negFilled / totalSteps`
- `canAdvance` — value present + (anti-bonus > 0 ⇒ note ≥10 chars)
- `canSubmit` — all positive filled + all anti-bonus notes valid

**Actions**:
- `setScore(criteriaId, value)` → mark dirty, schedule debounced save (5s)
- `setNote(criteriaId, text)` → same
- `goNext()` / `goPrev()` → cursor++/-- with phase transition logic
- `goToStep(phase, index)` → checklist jump, URL hash sync
- `attachFile(criteriaId | null, file)` → optimistic add, POST, rollback on fail
- `removeFile(fileId)` → DELETE, optimistic
- `submit()` → flush save → POST submit → redirect `/my-tasks`

### Persistence layers

1. **Debounced save** — 5s after last keystroke
2. **Interval save** — 30s heartbeat
3. **`visibilitychange` flush** — save on tab hide
4. **`beforeunload` guard** — warn if `dirty && !saving`

### URL sync

`#p=pos&i=3` ↔ `phase + cursor`. Refresh restores position. Browser back steps backwards.

### Data flow on load

```
mount
  ├─ GET /evaluations/:id          → evaluation
  ├─ GET /criteria?size=200        → list (filter active)
  ├─ GET /evaluations/:id/scores   → seed scores (auto-calc values come from server)
  └─ GET /evaluations/:id/files    → seed files (grouped by criteriaId client-side)
[Promise.all → loading=false]
```

### Auto-calculated criteria

`criteria.autoCalculated === true` → `ScoreInput` renders disabled with computed value from `evaluation.scores` seed. Note field stays editable. `canAdvance` ignores value emptiness for auto criteria.

**Backend contract**: server must populate auto-calc score rows on evaluation draft creation (or lazily on first `GET /scores` request) so the client never displays an empty value for an auto criterion. If the auto value is genuinely unavailable (e.g., upstream data not yet computed), return the score row with `value: null` and the client renders `—` with a "ОЖИДАНИЕ" sub-badge; `canSubmit` blocks until all auto scores resolve.

## Visual Layout

Editorial language preserved — Garamond italic display, Geist Mono labels, dv3 tokens.

### Step page

```
┌─────────────────────────────────────────────────────────────┐
│  ← back            EV-000123 · DRAFT          [ru / kg]     │  ← topbar (sticky, 56px)
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ── ФАЗА · ПОЛОЖИТЕЛЬНЫЕ ─────────────────────────         │
│   ●●●●○○○○                                  4 / 8           │  ← step dots + count
│                                                             │
│       Критерий 4                                            │  ← Geist Mono, .2em tracking
│                                                             │
│     Качество выполнения задач                               │  ← H1 Garamond italic 48px
│     в рамках должностной инструкции                         │
│                                                             │
│     [ вес 15% ] [ Отдел разработки ]                        │  ← chips
│                                                             │
│     ─────────────────────────────────────────────           │
│                                                             │
│     Оценивайте полноту, своевременность,                    │  ← description (Garamond reg 16px, max-w 60ch)
│     соответствие стандартам качества...                     │
│                                                             │
│     ─────────────────────────────────────────────           │
│                                                             │
│     БАЛЛ                                  / 15              │  ← Mono label
│                                                             │
│     [  0  ] [ 3.75 ] [ 7.5 ] [ 11.25 ] [ 15 ] [ Свой ]      │  ← preset chips (5 + custom)
│                                                             │
│     Большое значение: 11.25                                 │  ← live readout, Garamond 36px italic
│                                                             │
│     ─────────────────────────────────────────────           │
│                                                             │
│     ПРИМЕЧАНИЕ                                              │
│     ┌─────────────────────────────────────────────┐         │
│     │ Краткое обоснование оценки (опционально)   │         │  ← autosize textarea, dashed border
│     └─────────────────────────────────────────────┘         │
│                                                             │
│     ─────────────────────────────────────────────           │
│                                                             │
│     ДОКАЗАТЕЛЬНАЯ БАЗА                                      │
│     ┌─────────────────────────────────────────────┐         │
│     │  + перетащите файл сюда или нажмите         │         │  ← drag-drop zone
│     └─────────────────────────────────────────────┘         │
│     · report-q1.pdf  240 KB           [ × ]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  ◀ Назад       сохранено 14:23       ☰ Список   Далее ▶    │  ← bottom bar (sticky, 56px)
└─────────────────────────────────────────────────────────────┘
```

### Phase transition

```
   ── ПОЛОЖИТЕЛЬНЫЕ ЗАВЕРШЕНЫ ──

       8 / 8  заполнено
       сумма  82.5 / 100

   Перейти к антибонусу?
   2 критерия для возможных вычетов

   [ Перейти ▶ ]    [ Пропустить (вычетов нет) ]
```

### Review step

```
   ── ИТОГ ──

       82.5
       / 100

   Положительные  +82.5
   Антибонус       −0
   ─────────────────
   Итог            82.5

   ☑ Все критерии заполнены
   ☑ Антибонус: нет вычетов
   ☑ Файлов: 3

   [ Отправить ▶ ]   [ Назад к редактированию ]
```

### Checklist drawer

Right-side panel desktop (≥1024px), sliding sheet mobile (via `☰` button):
- All criteria listed (positive + anti-bonus grouped)
- Each row: status dot · idx · name · value
- Click → `goToStep(phase, idx)`, drawer closes on mobile
- Sticky header with phase progress bars

### Color / state semantics

Reuse existing dv3 tokens:
- Positive phase: `--dv3-accent` thumb, fills, dots
- Anti-bonus phase: `--dv3-zone-down` thumb, fills, dots → page tint shifts via `data-phase="antibonus"` root attr
- Auto-calc step: `--dv3-zone-info` "АВТО" badge, score zone dimmed
- Validation error: `--dv3-zone-warn` border + inline message

### Animations

- Step change: `translateX(20px) + fade` 240ms ease (reduced-motion: instant)
- Preset chip pick: scale-pulse 120ms
- Save indicator: pulse-once on success
- Phase transition: full-page fade 320ms

## Validation + Error Handling

| Rule | Client | Server | Trigger |
|---|---|---|---|
| Score in `[0, weight]` | `min/max` on input, clamp on blur | `@DecimalMin/Max` on DTO | save / submit |
| Anti-bonus value > 0 ⇒ note ≥10 chars | `canAdvance` false + inline error | service check | save / advance / submit |
| All positive criteria filled | `canSubmit` gate | service `submit()` rechecks | submit |
| Auto-calc score read-only | `disabled` attr + no setScore action | service rejects manual update | save |
| Final total < 30 | soft confirm dialog | none (soft only) | submit click |
| File ≤10 MB, allowed mime | reject pre-upload | service check | upload |

### Error surfaces

- Field-level: red border + `--dv3-zone-warn` text under input
- Step-level: warn banner at top of step
- Page-level: toast via existing `notifications` slice
- Submit fail: dialog with server `messageRu`, retry / cancel

### Save failure

- Optimistic UI (no blocking spinner)
- 4xx → rollback `dirty` stays true, toast "Не удалось сохранить — попробуйте снова"
- 5xx / network → exponential backoff retry (1s, 3s, 9s, give up after 3)
- `beforeunload` → warn if `dirty && !saving`

### Concurrency (two-tab edit)

- Server returns `updatedAt` on `GET scores`; use `@Version` on `Evaluation` for optimistic locking.
- Save sends version → 409 on conflict → dialog "Изменения с другого устройства. Перезагрузить?" → reload.

### Status race

- Server returns 409 with `code: EVALUATION_NOT_DRAFT` if period closed / already submitted mid-edit.
- Client → full-screen banner "Оценка более недоступна для редактирования" → redirect /my-tasks after 5s.

### Deep-link / refresh

- URL hash `#p=antibonus&i=1` → restore phase + cursor on mount.
- Invalid index → clamp to 0.
- Missing evaluation / 403 → existing error banner.

### Period label

Current page renders `Период #${periodId}` (raw id). New design must render the real period name. If `Evaluation` DTO does not expose `periodNameRu/Kg`, extend it server-side (one join, no schema change since `evaluation_period` already has the name columns). Frontend reads `evaluation.periodNameRu` (with `gfh_lang` fallback to `periodNameKg`).

### Empty states

- Zero positive criteria → page-level error "В этом периоде нет критериев. Обратитесь к администратору." (do not render stepper)
- Zero anti-bonus → skip phase entirely, positive review → review step

### Submit confirm dialog

- Always show: "Итоговый балл: {total}. После отправки оценку нельзя будет изменить."
- If `total < 30`: add "Балл ниже среднего. Подтвердите осознанно."
- If any anti-bonus > 0: list deductions in dialog body
- Cancel → stay on review step; confirm → call `submit()`

### Accessibility

- `role="progressbar"` on step dots with `aria-valuenow/min/max`
- Each step `aria-live="polite"` announces "Критерий 5 из 8" on transition
- `?` keyboard shortcut opens shortcuts help overlay
- Color never sole signal — every zone has icon + text label
- Min tap target 44×44 for preset chips and bottom-bar buttons
- `prefers-reduced-motion` → skip slide, keep fade-only

### Audit trail

Existing `@Audited` aspect:
- `save_scores` → entity_type=EVALUATION, action=SCORES_UPDATED, new_value=scores JSON (existing)
- `submit` → action=EVALUATION_SUBMITTED (existing)
- `upload_file` → action=FILE_UPLOADED, new_value={fileId, criteriaId} (extend existing event)

No new audit hooks needed beyond `criteriaId` in file upload event.

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `←` / `→` | prev / next step |
| `1` … `5` | pick preset chip 1–5 (custom = `6`) |
| `Cmd/Ctrl+S` | manual save |
| `Cmd/Ctrl+Enter` | submit (only from review step) |
| `?` | open shortcuts help overlay |
| `Esc` | close overlay / drawer |

## Internationalization

Extract all hardcoded ru strings from current `EvaluationFormPage.tsx` into `frontend/public/locales/{ru,kg}/translation.json` under `evaluation.form.*` namespace. Translate kg before merge. Language toggle via existing `gfh_lang` localStorage key.

## Testing

### Backend (Testcontainers + real PG)

- `CriteriaServiceTest`
  - `update` persists `descriptionRu/Kg` (round-trip)
  - null descriptions tolerated
  - audit log captures description change in `new_value`
- `EvaluationFileServiceTest`
  - upload with `criteriaId` links row to criterion
  - upload without `criteriaId` → row has null
  - FK violation on bogus `criteriaId` → 400 `INVALID_CRITERIA`
  - criterion deletion with linked files → 409 (RESTRICT)
- `EvaluationServiceTest`
  - reject manual score update for `autoCalculated=true` → 400 `AUTO_CRITERIA_READONLY`
  - reject anti-bonus score > 0 without note → 400 `ANTIBONUS_NOTE_REQUIRED`
  - submit recomputes total even if client preview drifted
- Liquibase: `tag` + `rollback` test passes for new changeset

### Frontend (Vitest + Testing Library)

- `useEvaluationForm` hook
  - state machine transitions: positive → transition → antibonus → review
  - skip antibonus phase when list empty
  - `canAdvance` gates on validation rules
  - `canSubmit` requires all positive filled
  - URL hash sync on cursor change
- `<ScoreInput>` — preset chip click sets value; custom toggle reveals number input; range clamp
- `<CriterionFiles>` — drag-drop upload, optimistic add, rollback on fail
- `<NoteField>` — autosize, anti-bonus note validation
- Keyboard shortcuts: `←/→`, `1..5`, `Cmd+S`, `Cmd+Enter`, `?`
- Snapshot test on phase transition + review step
- `beforeunload` guard fires when dirty
- i18n: ru + kg keys present for all new strings

### E2E

Skip unless `frontend/e2e/` Playwright suite exists. If present:
- Full happy path: open draft → fill 8 criteria → transition → fill 2 antibonus → review → submit → land on /my-tasks
- Refresh mid-edit restores cursor
- Two-tab conflict shows reload dialog

### Manual QA (added to PR body)

- Desktop ≥1280: layout intact, drawer visible
- Tablet 768–1023: drawer collapses to button
- Mobile ≤640: bottom bar sticky, drawer becomes sheet
- Keyboard-only: every action reachable
- Screen reader: phase transitions announced
- ru ↔ kg toggle preserves all strings
- Auto-calc step shows AUTO badge + locked input + editable note
- Low total (< 30) triggers extra confirm

## Rollout

1. **Phase 1** — backend changesets + entity + DTO + tests merge first. No frontend changes. Existing form keeps working (descriptions null, criteriaId null on files).
2. **Phase 2** — admin criteria edit page gets description fields. Admins backfill descriptions for existing criteria.
3. **Phase 3** — new `EvaluationFormPage` replaces current. Old file archived as `EvaluationFormPage.legacy.tsx` (kept for 1 release for rollback, then deleted).
4. **Phase 4** — delete legacy file after one period cycle of usage in prod.

No feature flag — full replacement, low blast radius (single page, route unchanged, server APIs additive only).

## Implementation Order

(Refined in writing-plans skill.)

1. Liquibase + entity + DTO + endpoint changes
2. Backend tests
3. `useEvaluationForm` hook + state machine
4. Stepper shell + step components
5. Score input + note + per-criterion files
6. Phase transition + review step
7. Validation + error handling + audit hooks
8. Keyboard shortcuts + accessibility pass
9. i18n extraction (ru + kg)
10. Replace route, archive legacy, manual QA

## Open Questions

None — all 7 brainstorming questions resolved with user.
