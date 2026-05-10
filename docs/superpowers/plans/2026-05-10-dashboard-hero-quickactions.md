# Dashboard Hero + Quick Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `DashboardPage` with a redesigned hero banner + three quick-action cards matching the reference design (`Обзор_v2.html`).

**Architecture:** Four new frontend components (`KpiRing`, `DashboardHero`, `DashboardQuickActions`, `DashboardPage`) plus one new backend endpoint (`GET /api/v1/appeals/pending`). The page fetches four APIs in parallel and renders role-adaptive cards — evaluate-employees and appeals cards are hidden when counts are zero.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, CSS variables (already in `index.css`), Spring Boot 3.2 / Java 17, JPA/JPQL.

---

## File Map

**Create:**
- `frontend/src/features/dashboard/KpiRing.tsx`
- `frontend/src/features/dashboard/DashboardHero.tsx`
- `frontend/src/features/dashboard/DashboardQuickActions.tsx`
- `backend/src/main/java/kg/gfh/kpi/dto/AppealPendingResponse.java`
- `backend/src/test/java/kg/gfh/kpi/service/AppealServicePendingTest.java`

**Modify:**
- `frontend/src/features/dashboard/DashboardPage.tsx` (currently a stub)
- `frontend/tailwind.config.js` (add `font-display` and `font-mono` families)
- `backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java` (add JPQL query)
- `backend/src/main/java/kg/gfh/kpi/service/AppealService.java` (add service method)
- `backend/src/main/java/kg/gfh/kpi/controller/AppealController.java` (add GET endpoint)

---

## Task 1: Add font utilities to Tailwind config

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Add font families**

Open `frontend/tailwind.config.js`. Replace the entire file content with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1e40af',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        display: ['"Source Serif Pro"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat(dashboard): add display and mono font families to Tailwind config"
```

---

## Task 2: Backend — AppealPendingResponse DTO

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/AppealPendingResponse.java`

- [ ] **Step 1: Create the DTO record**

```java
package kg.gfh.kpi.dto;

import java.time.LocalDateTime;

public record AppealPendingResponse(
    Long id,
    Long evaluationId,
    String evaluateeName,
    String reason,
    LocalDateTime deadline,
    LocalDateTime createdAt
) {}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/AppealPendingResponse.java
git commit -m "feat(appeals): add AppealPendingResponse DTO"
```

---

## Task 3: Backend — Repository query

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java`

- [ ] **Step 1: Add JPQL query method**

Open `AppealRepository.java`. Add these imports and method (full file after edit):

```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppealRepository extends JpaRepository<Appeal, Long> {
    Optional<Appeal> findByEvaluationId(Long evaluationId);
    boolean existsByEvaluationId(Long evaluationId);
    List<Appeal> findByStatusAndDeadlineBefore(AppealStatus status, LocalDateTime now);
    long countByStatus(AppealStatus status);

    @Query("SELECT a FROM Appeal a JOIN Evaluation e ON a.evaluationId = e.id " +
           "WHERE e.evaluator.id = :evaluatorId AND a.status = 'PENDING'")
    List<Appeal> findPendingByEvaluatorId(@Param("evaluatorId") Long evaluatorId);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java
git commit -m "feat(appeals): add findPendingByEvaluatorId query to AppealRepository"
```

---

## Task 4: Backend — Service method + unit test (TDD)

**Files:**
- Create: `backend/src/test/java/kg/gfh/kpi/service/AppealServicePendingTest.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AppealService.java`

- [ ] **Step 1: Write the failing test**

Create `backend/src/test/java/kg/gfh/kpi/service/AppealServicePendingTest.java`:

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppealServicePendingTest {

    @Mock AppealRepository appealRepository;
    @Mock EvaluationRepository evaluationRepository;
    @Mock EvaluationScoreRepository scoreRepository;
    @Mock SystemSettingService settingService;
    @Mock NotificationService notificationService;
    @InjectMocks AppealService appealService;

    @Test
    void getPendingAppealsForEvaluator_returnsMappedDtos() {
        Long evaluatorId = 10L;
        LocalDateTime deadline = LocalDateTime.of(2026, 5, 20, 0, 0);
        LocalDateTime createdAt = LocalDateTime.of(2026, 5, 1, 9, 0);

        Appeal appeal = new Appeal();
        appeal.setId(1L);
        appeal.setEvaluationId(42L);
        appeal.setReason("Несогласен с оценкой");
        appeal.setDeadline(deadline);
        appeal.setCreatedAt(createdAt);

        User evaluatee = new User();
        evaluatee.setFullName("Айтурган Касымалиев");

        Evaluation eval = new Evaluation();
        eval.setId(42L);
        eval.setEvaluatee(evaluatee);

        when(appealRepository.findPendingByEvaluatorId(evaluatorId)).thenReturn(List.of(appeal));
        when(evaluationRepository.findById(42L)).thenReturn(Optional.of(eval));

        List<AppealPendingResponse> result = appealService.getPendingAppealsForEvaluator(evaluatorId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).evaluateeName()).isEqualTo("Айтурган Касымалиев");
        assertThat(result.get(0).deadline()).isEqualTo(deadline);
    }

    @Test
    void getPendingAppealsForEvaluator_emptyWhenNone() {
        when(appealRepository.findPendingByEvaluatorId(99L)).thenReturn(List.of());

        List<AppealPendingResponse> result = appealService.getPendingAppealsForEvaluator(99L);

        assertThat(result).isEmpty();
    }
}
```

- [ ] **Step 2: Run test — expect compile failure (method not defined yet)**

```bash
cd backend && mvn test -Dtest=AppealServicePendingTest -pl . 2>&1 | tail -20
```

Expected: compilation error — `cannot find symbol: method getPendingAppealsForEvaluator`.

- [ ] **Step 3: Add the service method to AppealService**

Open `backend/src/main/java/kg/gfh/kpi/service/AppealService.java`. Add import and method. Add this import at the top (with existing imports):

```java
import kg.gfh.kpi.dto.AppealPendingResponse;
```

Add this method before the private `findEvaluation` helper at the bottom of the class:

```java
public List<AppealPendingResponse> getPendingAppealsForEvaluator(Long evaluatorId) {
    return appealRepository.findPendingByEvaluatorId(evaluatorId).stream()
        .map(a -> {
            Evaluation eval = findEvaluation(a.getEvaluationId());
            return new AppealPendingResponse(
                a.getId(),
                a.getEvaluationId(),
                eval.getEvaluatee().getFullName(),
                a.getReason(),
                a.getDeadline(),
                a.getCreatedAt()
            );
        })
        .toList();
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
cd backend && mvn test -Dtest=AppealServicePendingTest 2>&1 | tail -15
```

Expected: `BUILD SUCCESS`, 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/AppealService.java \
        backend/src/main/java/kg/gfh/kpi/dto/AppealPendingResponse.java \
        backend/src/test/java/kg/gfh/kpi/service/AppealServicePendingTest.java
git commit -m "feat(appeals): add getPendingAppealsForEvaluator service method with tests"
```

---

## Task 5: Backend — Controller endpoint

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/controller/AppealController.java`

- [ ] **Step 1: Add the GET /pending endpoint**

Replace the entire file content:

```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AppealService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/appeals")
@RequiredArgsConstructor
public class AppealController {

    private final AppealService appealService;
    private final UserRepository userRepository;

    @PostMapping
    public Object fileAppeal(@RequestBody Map<String, Object> body, Authentication auth) {
        Long userId = resolveUserId(auth);
        Long evaluationId = Long.parseLong(body.get("evaluationId").toString());
        String reason = (String) body.get("reason");
        return appealService.fileAppeal(evaluationId, userId, reason);
    }

    @PostMapping("/{id}/respond")
    public Object respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        AppealStatus decision = AppealStatus.valueOf(body.get("decision"));
        String response = body.get("response");
        return appealService.respond(id, userId, decision, response);
    }

    @GetMapping("/pending")
    public List<AppealPendingResponse> getPendingAppeals(Authentication auth) {
        Long userId = resolveUserId(auth);
        return appealService.getPendingAppealsForEvaluator(userId);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 2: Build to verify no compilation errors**

```bash
cd backend && mvn compile -q 2>&1 | tail -10
```

Expected: clean compile, no output.

- [ ] **Step 3: Run all backend tests**

```bash
cd backend && mvn test 2>&1 | tail -20
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/controller/AppealController.java
git commit -m "feat(appeals): add GET /appeals/pending endpoint"
```

---

## Task 6: Frontend — KpiRing component

**Files:**
- Create: `frontend/src/features/dashboard/KpiRing.tsx`

- [ ] **Step 1: Create the component**

```tsx
interface KpiRingProps {
  score: number | null
}

const RADIUS = 50
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // 314.16

function gradeLabel(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'A−'
  if (score >= 70) return 'B+'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  return 'D'
}

export function KpiRing({ score }: KpiRingProps) {
  const arcLen = score !== null ? (score / 100) * CIRCUMFERENCE : 0

  return (
    <div className="relative" style={{ width: 130, height: 130, flexShrink: 0 }}>
      <svg
        viewBox="0 0 120 120"
        width={130}
        height={130}
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={score !== null ? `KPI score ${score} out of 100` : 'No KPI score yet'}
      >
        {/* Base track */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(255,255,255,0.10)" strokeWidth={9} fill="none"
        />
        {/* Red zone 0–60% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(163,31,31,0.28)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.6 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={0} opacity={0.55}
        />
        {/* Yellow zone 60–80% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(168,133,43,0.30)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.2 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={-(0.6 * CIRCUMFERENCE)} opacity={0.55}
        />
        {/* Green zone 80–100% */}
        <circle
          cx={60} cy={60} r={RADIUS}
          stroke="rgba(26,117,88,0.32)" strokeWidth={9} fill="none"
          strokeDasharray={`${0.2 * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={-(0.8 * CIRCUMFERENCE)} opacity={0.55}
        />
        {/* Score arc */}
        {score !== null && (
          <circle
            cx={60} cy={60} r={RADIUS}
            stroke="var(--gold)" strokeWidth={9} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arcLen} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            style={{ filter: 'drop-shadow(0 0 5px rgba(168,133,43,0.4))' }}
          />
        )}
      </svg>

      {/* Centre overlay */}
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {score !== null ? (
          <div>
            <div
              className="font-display leading-none"
              style={{ fontSize: 38, fontWeight: 600, color: 'var(--gold-soft)' }}
            >
              {Math.round(score)}
            </div>
            <div
              className="font-mono uppercase tracking-widest mt-1"
              style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
            >
              из 100
            </div>
            <span
              className="inline-block font-mono font-semibold mt-1 px-1.5 py-px rounded"
              style={{
                fontSize: 9.5,
                background: 'rgba(168,133,43,0.22)',
                border: '1px solid rgba(168,133,43,0.40)',
                color: 'var(--gold)',
              }}
            >
              {gradeLabel(score)}
            </span>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, color: 'rgba(245,236,210,0.3)', fontWeight: 600 }}>—</div>
            <div
              className="font-mono uppercase tracking-wider mt-1"
              style={{ fontSize: 10, color: 'rgba(245,236,210,0.45)' }}
            >
              Нет оценки
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|KpiRing"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/KpiRing.tsx
git commit -m "feat(dashboard): add KpiRing SVG component with zones and null state"
```

---

## Task 7: Frontend — DashboardHero component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardHero.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { KpiRing } from './KpiRing'
import type { PersonalAnalytics } from '../analytics/analyticsApi'
import type { Period } from '../periods/periodsApi'

interface DashboardHeroProps {
  analytics: PersonalAnalytics | null
  activePeriod: Period | null
  pendingEvaluations: number
  pendingAppeals: number
}

function timeGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatPeriodDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function todayLine(): string {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function DashboardHero({ analytics, activePeriod, pendingEvaluations, pendingAppeals }: DashboardHeroProps) {
  const score = analytics?.currentScore ?? null
  const deptAvg = analytics?.departmentAvg ?? null
  const history = analytics?.history ?? []
  const firstName = analytics?.fullName?.split(' ')[1] ?? analytics?.fullName ?? ''

  const vsDepart = score !== null && deptAvg !== null
    ? Math.round((score - deptAvg) * 10) / 10
    : null

  const prevScore = history.length >= 2 ? history[history.length - 2].score : null
  const vsPrev = score !== null && prevScore !== null
    ? Math.round((score - prevScore) * 10) / 10
    : null

  const deadlineDays = activePeriod ? daysUntil(activePeriod.submissionDeadline) : null
  const periodName = activePeriod
    ? `${activePeriod.type.replace('QUARTERLY', 'Q').replace('MONTHLY', 'M').replace('ANNUAL', 'Год')} · ${formatPeriodDate(activePeriod.startDate)} — ${formatPeriodDate(activePeriod.endDate)}`
    : null

  const subtitleParts: string[] = []
  if (activePeriod && deadlineDays !== null) {
    subtitleParts.push(`Период оценки завершается через ${deadlineDays} дн.`)
  }
  if (pendingEvaluations > 0) {
    subtitleParts.push(`${pendingEvaluations} сотрудников ждут оценку`)
  }
  if (pendingAppeals > 0) {
    subtitleParts.push(`${pendingAppeals} апелляций на рассмотрении`)
  }
  if (subtitleParts.length === 0 && activePeriod) {
    subtitleParts.push('Оценка будет доступна после завершения периода.')
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl mb-5"
      style={{
        background: 'linear-gradient(135deg, #0e2724 0%, #0d4d3f 55%, #1a7558 100%)',
        color: '#ecf2f0',
        padding: '22px 28px',
        border: '1px solid #06120f',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      {/* Grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,rgba(255,255,255,.012) 0 1px,transparent 1px 5px),' +
            'repeating-linear-gradient(90deg,rgba(255,255,255,.008) 0 1px,transparent 1px 5px)',
        }}
      />
      {/* Gold radial glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80, right: -80, width: 280, height: 280,
          background: 'radial-gradient(circle,rgba(168,133,43,.12),transparent 60%)',
        }}
      />

      <div className="relative grid gap-6" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'center' }}>
        {/* Left — text */}
        <div>
          <div className="flex items-center gap-2 mb-2" style={{ fontFamily: 'var(--font-mono,monospace)' }}>
            <span
              className="inline-block rounded-full"
              style={{
                width: 6, height: 6, background: 'var(--gold)',
                animation: 'pulse 1.8s ease-in-out infinite',
                boxShadow: '0 0 0 0 rgba(168,133,43,0.7)',
              }}
            />
            <span
              className="font-mono uppercase tracking-widest"
              style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.7)' }}
            >
              {todayLine()}
            </span>
          </div>

          <h1
            className="font-display mb-1.5"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.01em', color: '#ecf2f0' }}
          >
            {timeGreeting()},{' '}
            <span style={{ color: 'var(--gold)' }}>{firstName}.</span>
          </h1>

          {subtitleParts.length > 0 && (
            <p className="mb-3" style={{ fontSize: 13, color: 'rgba(236,242,240,0.82)', maxWidth: 420, lineHeight: 1.5 }}>
              {subtitleParts.join(' · ')}
            </p>
          )}

          {activePeriod && periodName && (
            <div className="flex items-center gap-2 font-mono" style={{ fontSize: 10.5, color: 'rgba(245,236,210,0.65)' }}>
              <span
                className="font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded"
                style={{
                  fontSize: 10,
                  background: 'rgba(168,133,43,0.18)',
                  color: 'var(--gold)',
                  border: '1px solid rgba(168,133,43,0.30)',
                }}
              >
                Активный
              </span>
              <span>{periodName}</span>
            </div>
          )}
        </div>

        {/* Right — ring + side stats */}
        <div className="flex items-center gap-4">
          <KpiRing score={score} />

          <div className="flex flex-col gap-2.5 min-w-0">
            {/* vs dept avg */}
            <div
              className="px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="font-mono uppercase tracking-widest mb-0.5"
                style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
              >
                vs Ср. отдел
              </div>
              <div className="font-display flex items-baseline gap-1.5" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold-soft)' }}>
                {vsDepart !== null ? (
                  <>
                    {vsDepart > 0 ? '+' : ''}{vsDepart}
                    <span
                      className="font-mono"
                      style={{ fontSize: 10.5, color: vsDepart >= 0 ? '#9bdfb5' : '#d97f7f' }}
                    >
                      {vsDepart >= 0 ? 'лучше' : 'ниже'}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'rgba(245,236,210,0.35)' }}>—</span>
                )}
              </div>
            </div>

            {/* vs prev period */}
            <div
              className="px-3 py-2 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="font-mono uppercase tracking-widest mb-0.5"
                style={{ fontSize: 9.5, color: 'rgba(245,236,210,0.6)' }}
              >
                Динамика
              </div>
              <div className="font-display flex items-baseline gap-1.5" style={{ fontSize: 20, fontWeight: 600, color: 'var(--gold-soft)' }}>
                {vsPrev !== null ? (
                  <>
                    {vsPrev > 0 ? '+' : ''}{vsPrev}
                    <span
                      className="font-mono"
                      style={{ fontSize: 10.5, color: vsPrev >= 0 ? '#9bdfb5' : '#d97f7f' }}
                    >
                      vs пред.
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'rgba(245,236,210,0.35)' }}>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|DashboardHero"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardHero.tsx frontend/src/features/dashboard/KpiRing.tsx
git commit -m "feat(dashboard): add DashboardHero and KpiRing components"
```

---

## Task 8: Frontend — DashboardQuickActions component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardQuickActions.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useNavigate } from 'react-router-dom'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import type { AppealPending, Period } from '../periods/periodsApi'

interface DashboardQuickActionsProps {
  myTasks: PageResponse<Evaluation> | null
  pendingAppeals: AppealPending[] | null
  activePeriod: Period | null
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}

type Urgency = 'urgent' | 'warn' | 'info' | 'neutral'

function urgencyStyle(u: Urgency): { stripe: string; tag: string; tagText: string; tagBorder: string } {
  switch (u) {
    case 'urgent': return {
      stripe: 'var(--danger)',
      tag: 'var(--danger-soft)',
      tagText: 'var(--danger)',
      tagBorder: 'color-mix(in srgb,var(--danger) 30%,transparent)',
    }
    case 'warn': return {
      stripe: 'var(--warn)',
      tag: 'var(--warn-soft)',
      tagText: 'var(--warn)',
      tagBorder: 'color-mix(in srgb,var(--warn) 30%,transparent)',
    }
    case 'info': return {
      stripe: 'var(--info)',
      tag: 'var(--bg-soft,#ebe6db)',
      tagText: 'var(--ink-faint)',
      tagBorder: 'var(--line)',
    }
    default: return {
      stripe: 'var(--line-strong)',
      tag: 'var(--bg-soft,#ebe6db)',
      tagText: 'var(--ink-faint)',
      tagBorder: 'var(--line)',
    }
  }
}

interface ActionCard {
  key: string
  urgency: Urgency
  icon: React.ReactNode
  label: string
  tagText: string
  numContent: React.ReactNode
  footer: React.ReactNode
  onClick: () => void
}

export function DashboardQuickActions({ myTasks, pendingAppeals, activePeriod }: DashboardQuickActionsProps) {
  const navigate = useNavigate()
  const cards: ActionCard[] = []

  // Card 1: Evaluate subordinates
  if (myTasks) {
    const draftCount = myTasks.content.filter(e => e.status === 'DRAFT').length
    if (draftCount > 0 && activePeriod) {
      const days = daysUntil(activePeriod.submissionDeadline)
      const urgency: Urgency = days <= 7 ? 'urgent' : days <= 14 ? 'warn' : 'info'
      cards.push({
        key: 'evaluate',
        urgency,
        icon: (
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
        ),
        label: 'Оценить сотрудников',
        tagText: `${days} дн.`,
        numContent: (
          <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
            {draftCount}
            <span className="font-mono" style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-faint)' }}>
              {' / '}{myTasks.totalElements}
            </span>
          </span>
        ),
        footer: (
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
            Финал до <strong style={{ color: 'var(--ink-soft)' }}>{formatDate(activePeriod.submissionDeadline)}</strong>
          </span>
        ),
        onClick: () => navigate('/my-tasks'),
      })
    }
  }

  // Card 2: Pending appeals
  if (pendingAppeals && pendingAppeals.length > 0) {
    const sorted = [...pendingAppeals].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    const nearestDays = daysUntil(sorted[0].deadline)
    const urgency: Urgency = nearestDays <= 3 ? 'urgent' : 'warn'
    const names = sorted.slice(0, 2).map(a => a.evaluateeName.split(' ').slice(0, 2).join(' '))
    const nameStr = names.join(', ') + (pendingAppeals.length > 2 ? '…' : '')

    cards.push({
      key: 'appeals',
      urgency,
      icon: (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      label: 'Апелляции',
      tagText: `${nearestDays} дн.`,
      numContent: (
        <span className="font-display" style={{ fontSize: 30, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
          {pendingAppeals.length}
        </span>
      ),
      footer: (
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          Ждут решения · <strong style={{ color: 'var(--ink-soft)' }}>{nameStr}</strong>
        </span>
      ),
      onClick: () => navigate('/my-tasks'),
    })
  }

  // Card 3: Period deadline (always shown when active period exists)
  if (activePeriod && myTasks) {
    const days = daysUntil(activePeriod.submissionDeadline)
    const total = myTasks.totalElements
    const draftCount = myTasks.content.filter(e => e.status === 'DRAFT').length
    const completed = total - draftCount
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    const MINI_CIRC = 2 * Math.PI * 16 // r=16 → 100.53
    const miniArc = (pct / 100) * MINI_CIRC

    cards.push({
      key: 'deadline',
      urgency: 'info',
      icon: (
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      label: `${activePeriod.type === 'QUARTERLY' ? 'Квартал' : activePeriod.type === 'MONTHLY' ? 'Месяц' : 'Год'} · Дедлайн`,
      tagText: 'Информация',
      numContent: (
        <div className="flex items-center gap-3 mb-1">
          {/* Mini progress ring */}
          <div className="relative flex-shrink-0" style={{ width: 44, height: 44 }}>
            <svg viewBox="0 0 40 40" width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={20} cy={20} r={16} stroke="var(--bg-soft,#ebe6db)" strokeWidth={4} fill="none"/>
              <circle
                cx={20} cy={20} r={16}
                stroke="var(--accent-2)" strokeWidth={4} fill="none" strokeLinecap="round"
                strokeDasharray={`${miniArc} ${MINI_CIRC}`}
                strokeDashoffset={0}
              />
            </svg>
            <div
              className="absolute inset-0 flex items-center justify-center font-mono font-semibold"
              style={{ fontSize: 10, color: 'var(--accent)' }}
            >
              {pct}%
            </div>
          </div>
          <div>
            <div className="font-display" style={{ fontSize: 26, fontWeight: 600, color: 'var(--ink)', lineHeight: 1 }}>
              {formatDate(activePeriod.submissionDeadline)}
            </div>
            <div className="font-mono uppercase tracking-wider mt-0.5" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              Через {days} дней
            </div>
          </div>
        </div>
      ),
      footer: (
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.5 }}>
          {total > 0
            ? <>Оценено <strong style={{ color: 'var(--ink-soft)' }}>{completed} из {total}</strong></>
            : 'Оценки ещё не начаты · период активен'}
        </span>
      ),
      onClick: () => navigate('/my-tasks'),
    })
  }

  if (cards.length === 0) return null

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-3">
        <span
          className="font-mono uppercase font-semibold tracking-widest"
          style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}
        >
          К действию · {cards.length}
        </span>
        <a
          href="/my-tasks"
          onClick={e => { e.preventDefault(); navigate('/my-tasks') }}
          className="font-mono font-semibold"
          style={{ fontSize: 10.5, color: 'var(--accent)', letterSpacing: '0.04em' }}
        >
          Все задачи →
        </a>
      </div>

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cards.length}, 1fr)` }}
      >
        {cards.map(card => {
          const s = urgencyStyle(card.urgency)
          return (
            <div
              key={card.key}
              className="relative overflow-hidden rounded-lg cursor-pointer transition-all hover:-translate-y-px"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
                padding: '15px 17px',
                boxShadow: 'var(--shadow-sm)',
              }}
              onClick={card.onClick}
            >
              {/* Top colour stripe */}
              <div
                className="absolute top-0 left-0 right-0"
                style={{ height: 3, background: s.stripe }}
              />

              <div className="flex items-center justify-between gap-2 mb-3">
                <div
                  className="flex items-center gap-1.5 font-medium"
                  style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}
                >
                  <span style={{ color: 'var(--ink-faint)' }}>{card.icon}</span>
                  {card.label}
                </div>
                <span
                  className="font-mono font-semibold uppercase tracking-wide flex-shrink-0"
                  style={{
                    fontSize: 9.5,
                    padding: '2px 7px',
                    borderRadius: 4,
                    background: s.tag,
                    color: s.tagText,
                    border: `1px solid ${s.tagBorder}`,
                  }}
                >
                  {card.tagText}
                </span>
              </div>

              <div className="mb-1.5">{card.numContent}</div>
              <div>{card.footer}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -E "error|DashboardQuickActions"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardQuickActions.tsx
git commit -m "feat(dashboard): add DashboardQuickActions with evaluate/appeals/deadline cards"
```

---

## Task 9: Frontend — DashboardPage wiring

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Replace stub with full page**

```tsx
import { useEffect, useState } from 'react'
import { analyticsApi, PersonalAnalytics } from '../analytics/analyticsApi'
import { evaluationsApi, PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi, Period, AppealPending } from '../periods/periodsApi'
import { DashboardHero } from './DashboardHero'
import { DashboardQuickActions } from './DashboardQuickActions'

export function DashboardPage() {
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])

  useEffect(() => {
    analyticsApi.personal().then(setAnalytics).catch(() => {})
    evaluationsApi.myTasks(0, 200).then(setMyTasks).catch(() => {})
    periodsApi.list().then(setPeriods).catch(() => {})
    periodsApi.pendingAppeals().then(setPendingAppeals).catch(() => {})
  }, [])

  const activePeriod = periods.find(p => p.status === 'ACTIVE') ?? null
  const draftCount = myTasks?.content.filter(e => e.status === 'DRAFT').length ?? 0

  return (
    <div style={{ padding: '28px 32px 48px', maxWidth: 1280, margin: '0 auto' }}>
      <DashboardHero
        analytics={analytics}
        activePeriod={activePeriod}
        pendingEvaluations={draftCount}
        pendingAppeals={pendingAppeals.length}
      />
      <DashboardQuickActions
        myTasks={myTasks}
        pendingAppeals={pendingAppeals}
        activePeriod={activePeriod}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check the whole frontend**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Open browser and verify**

Navigate to `http://localhost:5173/dashboard`. Confirm:
- Dark green hero banner renders with ring and side stats.
- Quick action cards appear when data loads (evaluate card if user has DRAFT tasks, appeals card if pending appeals, deadline card if active period).
- Null score state: ring shows `—` / `Нет оценки` if `currentScore` is null.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): wire DashboardPage with hero and quick actions"
```

---

## Self-Review Checklist

- [x] Spec: Hero ring with zones, score, grade, null state → Task 6 (KpiRing)
- [x] Spec: Time-based greeting, pulse dot, period tag → Task 7 (DashboardHero)
- [x] Spec: Side rows vs-dept-avg and vs-prev-period → Task 7
- [x] Spec: `history.length < 2` → vsPrev shows `—` → Task 7 (`prevScore = null` guard)
- [x] Spec: One page, cards hide if not applicable → Tasks 8 cards are push-conditional
- [x] Spec: Grade mapping → Task 6 `gradeLabel`
- [x] Spec: Card 1 evaluate employees, Card 2 appeals, Card 3 deadline → Task 8
- [x] Spec: Urgency colours per deadline days → Task 8 `urgencyStyle`
- [x] Spec: `GET /appeals/pending` backend endpoint → Tasks 2–5
- [x] Spec: `AppealPending` type already in `periodsApi.ts` → DTO matches
- [x] Spec: Parallel fetch, errors silently hidden → Task 9 `.catch(() => {})`
- [x] Type names consistent across tasks: `AppealPending`, `PersonalAnalytics`, `PageResponse<Evaluation>`, `Period` — all imported from existing files
