# Dashboard Remaining Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scorecard, team attention, history chart, and event feed sections to DashboardPage.

**Architecture:** Three new backend endpoints on AnalyticsController (scorecard, team, events), one DTO extension (PeriodScore + departmentAvg), four new frontend components wired into DashboardPage with parallel data fetching. AuditAspect currently writes userId=null and newValue=null; getDashboardEvents queries by userName (email) + evaluatee subquery and does a second batch lookup to build display text from entity context.

**Tech Stack:** Spring Boot 3.2 / JdbcTemplate SQL, Java records for DTOs, Mockito unit tests; React 18 / TypeScript, Recharts 2.12, inline styles, CSS variables from index.css.

---

## File Structure

**Backend — new files:**
- `backend/src/main/java/kg/gfh/kpi/dto/ScorecardResponse.java`
- `backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java`
- `backend/src/main/java/kg/gfh/kpi/dto/DashboardEventResponse.java`
- `backend/src/test/java/kg/gfh/kpi/service/AnalyticsScorecardTest.java`
- `backend/src/test/java/kg/gfh/kpi/service/AnalyticsTeamTest.java`
- `backend/src/test/java/kg/gfh/kpi/service/AnalyticsEventsTest.java`

**Backend — modified files:**
- `backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java` — add `departmentAvg` to PeriodScore record
- `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java` — update history query + 3 new methods
- `backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java` — 3 new endpoints
- `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java` — add @Audited to activatePeriod + closePeriod
- `backend/src/main/java/kg/gfh/kpi/service/AppealService.java` — add @Audited to fileAppeal + respond

**Frontend — new files:**
- `frontend/src/features/dashboard/DashboardScorecard.tsx`
- `frontend/src/features/dashboard/DashboardTeam.tsx`
- `frontend/src/features/dashboard/DashboardHistoryChart.tsx`
- `frontend/src/features/dashboard/DashboardEventFeed.tsx`

**Frontend — modified files:**
- `frontend/src/features/analytics/analyticsApi.ts` — PeriodScore + 3 new API methods + types
- `frontend/src/features/dashboard/DashboardPage.tsx` — add state + parallel fetches + new components

---

### Task 1: Extend PeriodScore with departmentAvg

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`

- [ ] **Step 1: Update PeriodScore record**

Replace the PeriodScore nested record in `PersonalAnalyticsResponse.java`:

```java
public record PersonalAnalyticsResponse(
    Long userId,
    String fullName,
    List<PeriodScore> history,
    BigDecimal currentScore,
    BigDecimal departmentAvg,
    BigDecimal companyAvg
) {
    public record PeriodScore(
        Long periodId,
        String periodType,
        String startDate,
        String endDate,
        BigDecimal score,
        BigDecimal departmentAvg
    ) {}
}
```

- [ ] **Step 2: Update history query in AnalyticsService to compute dept avg per period**

Replace the history query in `getPersonalAnalytics` (lines 29–45). The new query adds a correlated subquery for per-period department average:

```java
List<PeriodScore> history = jdbc.query("""
    SELECT e.period_id, ep.type, ep.start_date::text, ep.end_date::text, e.final_score,
           (SELECT AVG(e2.final_score)
            FROM evaluations e2
            JOIN users u2 ON u2.id = e2.evaluatee_id
            JOIN users u1 ON u1.id = ? AND u1.org_unit_id = u2.org_unit_id
            WHERE e2.period_id = e.period_id
              AND e2.final_score IS NOT NULL
              AND e2.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
           ) AS dept_avg
    FROM evaluations e
    JOIN evaluation_periods ep ON ep.id = e.period_id
    WHERE e.evaluatee_id = ?
      AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
      AND e.final_score IS NOT NULL
    ORDER BY ep.start_date DESC
    LIMIT 24
    """,
    (rs, i) -> new PeriodScore(
        rs.getLong("period_id"),
        rs.getString("type"),
        rs.getString("start_date"),
        rs.getString("end_date"),
        rs.getBigDecimal("final_score"),
        rs.getBigDecimal("dept_avg")
    ), userId, userId);
```

Note: two `userId` params — first for the JOIN inside the subquery, second for the outer WHERE.

- [ ] **Step 3: Run type check**

```bash
cd backend && mvn compile -q 2>&1 | tail -20
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java
git commit -m "feat(analytics): add departmentAvg per period to history"
```

---

### Task 2: ScorecardResponse + CriteriaScoreDto DTOs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/ScorecardResponse.java`

- [ ] **Step 1: Create ScorecardResponse DTO**

```java
package kg.gfh.kpi.dto;

import java.util.List;

public record ScorecardResponse(
    Long periodId,
    String periodLabel,
    double totalScore,
    String grade,
    double vsGoal,
    Double vsPrevPeriod,
    String prevPeriodLabel,
    Integer rank,
    double antiBonusTotal,
    List<CriteriaScoreDto> criteria,
    List<CriteriaScoreDto> antiBonuses
) {
    public record CriteriaScoreDto(
        Long criteriaId,
        String nameRu,
        String nameKg,
        double weight,
        double score,
        double maxScore,
        Double delta,
        String levelLabel
    ) {}
}
```

- [ ] **Step 2: Compile**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/ScorecardResponse.java
git commit -m "feat(analytics): add ScorecardResponse DTO"
```

---

### Task 3: getPersonalScorecard service method (TDD)

**Files:**
- Create: `backend/src/test/java/kg/gfh/kpi/service/AnalyticsScorecardTest.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`

- [ ] **Step 1: Write failing test**

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.ScorecardResponse;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsScorecardTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getPersonalScorecard_returnsNullWhenNoEvaluation() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Тест Пользователь");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jdbc.query(anyString(), any(RowMapper.class), any()))
            .thenReturn(List.of());

        ScorecardResponse result = analyticsService.getPersonalScorecard(1L);

        assertThat(result).isNull();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && mvn test -Dtest=AnalyticsScorecardTest -q 2>&1 | tail -10
```

Expected: FAIL — method `getPersonalScorecard` does not exist yet

- [ ] **Step 3: Add helper method buildPeriodLabel and implement getPersonalScorecard**

Add to `AnalyticsService.java` (after existing methods):

```java
private String buildPeriodLabel(String type, int year, int month) {
    return switch (type) {
        case "QUARTERLY" -> "Q" + ((month - 1) / 3 + 1) + " " + year;
        case "MONTHLY"   -> "M" + month + " " + year;
        default          -> "Год " + year;
    };
}

private String computeGrade(double score) {
    if (score >= 90) return "A";
    if (score >= 80) return "A−";
    if (score >= 70) return "B+";
    if (score >= 60) return "B";
    if (score >= 50) return "C";
    return "D";
}

public ScorecardResponse getPersonalScorecard(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
            "Пользователь не найден", "Колдонуучу табылган жок"));

    // 1. Find target evaluation: active period first, else latest scored
    record EvalRow(long id, long periodId, double score, String type, int year, int month) {}
    List<EvalRow> evalRows = jdbc.query("""
        SELECT e.id, e.period_id,
               COALESCE(e.final_score, 0)::float        AS score,
               ep.type,
               EXTRACT(YEAR  FROM ep.start_date)::int   AS yr,
               EXTRACT(MONTH FROM ep.start_date)::int   AS mo
        FROM evaluations e
        JOIN evaluation_periods ep ON ep.id = e.period_id
        WHERE e.evaluatee_id = ?
          AND e.status NOT IN ('DRAFT')
          AND (ep.status = 'ACTIVE' OR e.final_score IS NOT NULL)
        ORDER BY CASE WHEN ep.status = 'ACTIVE' THEN 0 ELSE 1 END,
                 ep.start_date DESC
        LIMIT 1
        """,
        (rs, i) -> new EvalRow(
            rs.getLong("id"), rs.getLong("period_id"), rs.getDouble("score"),
            rs.getString("type"), rs.getInt("yr"), rs.getInt("mo")
        ), userId);

    if (evalRows.isEmpty()) return null;

    EvalRow ev = evalRows.get(0);
    String periodLabel = buildPeriodLabel(ev.type(), ev.year(), ev.month());
    double totalScore = ev.score();

    // 2. Rank in department
    Integer rank = null;
    if (user.getUnitId() != null) {
        List<Object[]> ranking = getDepartmentRanking(user.getUnitId(), ev.periodId());
        for (Object[] row : ranking) {
            if (((Long) row[0]).equals(userId)) {
                rank = ((Long) row[3]).intValue();
                break;
            }
        }
    }

    // 3. Previous evaluation for delta + prevPeriodLabel
    record PrevRow(long id, double score, String type, int year, int month) {}
    List<PrevRow> prevRows = jdbc.query("""
        SELECT e.id, e.final_score::float AS score, ep.type,
               EXTRACT(YEAR  FROM ep.start_date)::int AS yr,
               EXTRACT(MONTH FROM ep.start_date)::int AS mo
        FROM evaluations e
        JOIN evaluation_periods ep ON ep.id = e.period_id
        WHERE e.evaluatee_id = ?
          AND e.id != ?
          AND e.final_score IS NOT NULL
          AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
        ORDER BY ep.start_date DESC LIMIT 1
        """,
        (rs, i) -> new PrevRow(rs.getLong("id"), rs.getDouble("score"),
            rs.getString("type"), rs.getInt("yr"), rs.getInt("mo")),
        userId, ev.id());

    Double vsPrevPeriod = null;
    String prevPeriodLabel = null;
    java.util.Map<Long, Double> prevScores = new java.util.HashMap<>();

    if (!prevRows.isEmpty()) {
        PrevRow prev = prevRows.get(0);
        vsPrevPeriod = totalScore - prev.score();
        prevPeriodLabel = buildPeriodLabel(prev.type(), prev.year(), prev.month());
        jdbc.query("""
            SELECT criteria_id, value::float AS val
            FROM evaluation_scores WHERE evaluation_id = ?
            """,
            rs -> prevScores.put(rs.getLong("criteria_id"), rs.getDouble("val")),
            prev.id());
    }

    // 4. Criteria scores
    List<ScorecardResponse.CriteriaScoreDto> allRows = jdbc.query("""
        SELECT es.criteria_id, c.name_ru, c.name_kg, c.weight::float,
               c.type AS criteria_type, es.value::float AS score,
               COALESCE(ou.name_ru, '') AS level_label
        FROM evaluation_scores es
        JOIN criteria c ON c.id = es.criteria_id
        LEFT JOIN org_units ou ON ou.id = c.org_unit_id
        WHERE es.evaluation_id = ?
        ORDER BY c.type, c.weight DESC
        """,
        (rs, i) -> {
            long cid = rs.getLong("criteria_id");
            double score = rs.getDouble("score");
            Double delta = prevScores.containsKey(cid)
                ? score - prevScores.get(cid) : null;
            return new ScorecardResponse.CriteriaScoreDto(
                cid,
                rs.getString("name_ru"),
                rs.getString("name_kg"),
                rs.getDouble("weight"),
                score,
                rs.getDouble("weight"),   // maxScore == weight
                delta,
                rs.getString("level_label")
            );
        }, ev.id());

    List<ScorecardResponse.CriteriaScoreDto> positive = allRows.stream()
        .filter(c -> jdbc.queryForObject(
            "SELECT type FROM criteria WHERE id = ?", String.class, c.criteriaId())
            .equals("POSITIVE"))
        .toList();

    // Avoid N+1 — re-query with type in one pass:
    record TypedRow(long id, String type) {}
    java.util.Map<Long, String> criteriaTypes = new java.util.HashMap<>();
    jdbc.query("""
        SELECT c.id, c.type FROM criteria c
        JOIN evaluation_scores es ON es.criteria_id = c.id
        WHERE es.evaluation_id = ?
        """,
        rs -> criteriaTypes.put(rs.getLong("id"), rs.getString("type")),
        ev.id());

    List<ScorecardResponse.CriteriaScoreDto> positiveCriteria = allRows.stream()
        .filter(c -> "POSITIVE".equals(criteriaTypes.get(c.criteriaId())))
        .toList();
    List<ScorecardResponse.CriteriaScoreDto> antiBonuses = allRows.stream()
        .filter(c -> "ANTI_BONUS".equals(criteriaTypes.get(c.criteriaId())))
        .toList();

    double antiBonusTotal = antiBonuses.stream().mapToDouble(ScorecardResponse.CriteriaScoreDto::score).sum();

    return new ScorecardResponse(
        ev.periodId(), periodLabel, totalScore, computeGrade(totalScore),
        totalScore - 90, vsPrevPeriod, prevPeriodLabel, rank,
        antiBonusTotal, positiveCriteria, antiBonuses
    );
}
```

**Important:** The inline N+1 `jdbc.queryForObject` call for each criteria type in step 3 is wrong — it's already covered by the `criteriaTypes` map above. Remove the bad block:

The correct final version of the criteria split — after `criteriaTypes` is populated:

```java
List<ScorecardResponse.CriteriaScoreDto> positiveCriteria = allRows.stream()
    .filter(c -> "POSITIVE".equals(criteriaTypes.get(c.criteriaId())))
    .toList();
List<ScorecardResponse.CriteriaScoreDto> antiBonuses = allRows.stream()
    .filter(c -> "ANTI_BONUS".equals(criteriaTypes.get(c.criteriaId())))
    .toList();
```

Do NOT include the earlier (wrong) version with `jdbc.queryForObject` inside the stream. The block to write is:

```java
// after allRows is populated:
java.util.Map<Long, String> criteriaTypes = new java.util.HashMap<>();
jdbc.query("""
    SELECT c.id, c.type FROM criteria c
    JOIN evaluation_scores es ON es.criteria_id = c.id
    WHERE es.evaluation_id = ?
    """,
    rs -> criteriaTypes.put(rs.getLong("id"), rs.getString("type")),
    ev.id());

List<ScorecardResponse.CriteriaScoreDto> positiveCriteria = allRows.stream()
    .filter(c -> "POSITIVE".equals(criteriaTypes.get(c.criteriaId())))
    .toList();
List<ScorecardResponse.CriteriaScoreDto> antiBonuses = allRows.stream()
    .filter(c -> "ANTI_BONUS".equals(criteriaTypes.get(c.criteriaId())))
    .toList();

double antiBonusTotal = antiBonuses.stream()
    .mapToDouble(ScorecardResponse.CriteriaScoreDto::score).sum();

return new ScorecardResponse(
    ev.periodId(), periodLabel, totalScore, computeGrade(totalScore),
    totalScore - 90, vsPrevPeriod, prevPeriodLabel, rank,
    antiBonusTotal, positiveCriteria, antiBonuses
);
```

Also add required imports at the top of AnalyticsService.java:

```java
import kg.gfh.kpi.dto.ScorecardResponse;
import kg.gfh.kpi.exception.ApiException;
```

(`ApiException` and `User` are already imported via the existing method.)

- [ ] **Step 4: Run test**

```bash
cd backend && mvn test -Dtest=AnalyticsScorecardTest -q 2>&1 | tail -10
```

Expected: PASS (1 test)

- [ ] **Step 5: Compile check**

```bash
cd backend && mvn compile -q 2>&1 | tail -10
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java \
        backend/src/test/java/kg/gfh/kpi/service/AnalyticsScorecardTest.java
git commit -m "feat(analytics): implement getPersonalScorecard"
```

---

### Task 4: GET /analytics/personal/scorecard endpoint

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java`

- [ ] **Step 1: Add import and endpoint**

Add to the imports in `AnalyticsController.java`:

```java
import kg.gfh.kpi.dto.ScorecardResponse;
```

Add after the existing `@GetMapping("/personal")` method:

```java
@GetMapping("/personal/scorecard")
public ResponseEntity<ScorecardResponse> scorecard(Authentication auth) {
    Long userId = resolveUserId(auth);
    ScorecardResponse result = analyticsService.getPersonalScorecard(userId);
    return result == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(result);
}
```

Add `ResponseEntity` import:

```java
import org.springframework.http.ResponseEntity;
```

- [ ] **Step 2: Compile**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java
git commit -m "feat(analytics): add GET /analytics/personal/scorecard"
```

---

### Task 5: TeamResponse + TeamMemberDto DTOs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java`

- [ ] **Step 1: Create TeamResponse DTO**

```java
package kg.gfh.kpi.dto;

import java.util.List;

public record TeamResponse(
    List<TeamMemberDto> attention,
    TeamMemberDto bestPerformer,
    int totalCount,
    Double teamAvg
) {
    public record TeamMemberDto(
        Long userId,
        String fullName,
        String position,
        String initials,
        Double latestScore,
        Double scoreDelta,
        String status,
        String reasonLabel
    ) {}
}
```

- [ ] **Step 2: Compile**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/TeamResponse.java
git commit -m "feat(analytics): add TeamResponse DTO"
```

---

### Task 6: getTeamAttention service method (TDD)

**Files:**
- Create: `backend/src/test/java/kg/gfh/kpi/service/AnalyticsTeamTest.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`

- [ ] **Step 1: Write failing test**

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.TeamResponse;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsTeamTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getTeamAttention_returnsEmptyWhenNoDirectReports() {
        when(jdbc.queryForList(anyString(), eq(42L))).thenReturn(List.of());

        TeamResponse result = analyticsService.getTeamAttention(42L);

        assertThat(result.attention()).isEmpty();
        assertThat(result.bestPerformer()).isNull();
        assertThat(result.totalCount()).isEqualTo(0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && mvn test -Dtest=AnalyticsTeamTest -q 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Implement getTeamAttention**

Add to `AnalyticsService.java` (after getPersonalScorecard):

```java
private String computeInitials(String fullName) {
    if (fullName == null || fullName.isBlank()) return "?";
    String[] parts = fullName.trim().split("\\s+");
    if (parts.length == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
    return (parts[0].charAt(0) + "" + parts[1].charAt(0)).toUpperCase();
}

public TeamResponse getTeamAttention(Long managerId) {
    // 1. Find direct reports
    List<java.util.Map<String, Object>> reports = jdbc.queryForList("""
        SELECT id, full_name, COALESCE(position, '') AS position
        FROM users
        WHERE manager_id = ? AND is_active = true
        """, managerId);

    if (reports.isEmpty()) {
        return new TeamResponse(List.of(), null, 0, null);
    }

    // 2. Find active period
    List<Long> activePeriodIds = jdbc.query("""
        SELECT id FROM evaluation_periods WHERE status = 'ACTIVE' LIMIT 1
        """, (rs, i) -> rs.getLong("id"));
    Long activePeriodId = activePeriodIds.isEmpty() ? null : activePeriodIds.get(0);

    // 3. Build subordinate id list for batch queries
    List<Long> subIds = reports.stream()
        .map(r -> (Long) r.get("id"))
        .toList();

    // 4. Get latest evaluation per subordinate in active period (if active period exists)
    java.util.Map<Long, java.util.Map<String, Object>> activeEvals = new java.util.HashMap<>();
    if (activePeriodId != null) {
        String inClause = subIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        jdbc.queryForList("""
            SELECT DISTINCT ON (e.evaluatee_id)
                   e.evaluatee_id, e.status AS eval_status,
                   e.final_score::float AS score,
                   ep.submission_deadline::text AS deadline
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id IN (%s)
              AND e.period_id = %d
            ORDER BY e.evaluatee_id, e.updated_at DESC
            """.formatted(inClause, activePeriodId))
            .forEach(row -> activeEvals.put((Long) row.get("evaluatee_id"), row));
    }

    // 5. Get previous period scores for delta
    java.util.Map<Long, Double> prevScores = new java.util.HashMap<>();
    if (activePeriodId != null) {
        String inClause = subIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        jdbc.queryForList("""
            SELECT DISTINCT ON (e.evaluatee_id)
                   e.evaluatee_id, e.final_score::float AS score
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id IN (%s)
              AND e.period_id != %d
              AND e.final_score IS NOT NULL
              AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
            ORDER BY e.evaluatee_id, ep.start_date DESC
            """.formatted(inClause, activePeriodId))
            .forEach(row -> prevScores.put((Long) row.get("evaluatee_id"), (Double) row.get("score")));
    }

    // 6. Classify each report
    List<TeamResponse.TeamMemberDto> attentionList = new java.util.ArrayList<>();
    TeamResponse.TeamMemberDto best = null;
    Double bestScore = null;
    List<Double> scoreList = new java.util.ArrayList<>();

    for (java.util.Map<String, Object> report : reports) {
        Long uid = (Long) report.get("id");
        String fullName = (String) report.get("full_name");
        String position = (String) report.get("position");
        String initials = computeInitials(fullName);
        java.util.Map<String, Object> eval = activeEvals.get(uid);

        Double score = eval != null ? (Double) eval.get("score") : null;
        if (score != null) scoreList.add(score);
        Double prev = prevScores.get(uid);
        Double delta = (score != null && prev != null) ? score - prev : null;

        String status = null;
        String reason = null;

        if (eval != null && "APPEALED".equals(eval.get("eval_status"))) {
            status = "appeal";
            String deadline = eval.get("deadline") != null
                ? eval.get("deadline").toString().substring(0, 10) : "?";
            reason = "Подал апелляцию · до " + deadline;
        } else if (score != null && score < 60) {
            status = "low";
            reason = "Низкий балл < 60";
        } else if (eval == null || "DRAFT".equals(eval.get("eval_status"))) {
            status = "unevaluated";
            reason = "Не оценён за текущий период";
        }

        if (status != null) {
            attentionList.add(new TeamResponse.TeamMemberDto(
                uid, fullName, position, initials, score, delta, status, reason));
        } else if (score != null && (bestScore == null || score > bestScore)) {
            bestScore = score;
            best = new TeamResponse.TeamMemberDto(
                uid, fullName, position, initials, score, delta, "best", "Лучший результат в команде");
        }
    }

    // Sort attention: appeal first, then low, then unevaluated
    attentionList.sort(java.util.Comparator.comparingInt(m ->
        switch (m.status()) { case "appeal" -> 0; case "low" -> 1; default -> 2; }));

    Double teamAvg = scoreList.isEmpty() ? null
        : scoreList.stream().mapToDouble(Double::doubleValue).average().orElse(0);

    return new TeamResponse(attentionList, best, reports.size(),
        teamAvg != null ? Math.round(teamAvg * 10.0) / 10.0 : null);
}
```

Also add import at the top of AnalyticsService.java:

```java
import kg.gfh.kpi.dto.TeamResponse;
```

- [ ] **Step 4: Run test**

```bash
cd backend && mvn test -Dtest=AnalyticsTeamTest -q 2>&1 | tail -10
```

Expected: PASS (1 test)

- [ ] **Step 5: Compile check**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java \
        backend/src/test/java/kg/gfh/kpi/service/AnalyticsTeamTest.java
git commit -m "feat(analytics): implement getTeamAttention"
```

---

### Task 7: GET /analytics/team endpoint

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java`

- [ ] **Step 1: Add import and endpoint**

Add import:

```java
import kg.gfh.kpi.dto.TeamResponse;
```

Add after the scorecard endpoint:

```java
@GetMapping("/team")
public TeamResponse team(Authentication auth) {
    Long userId = resolveUserId(auth);
    return analyticsService.getTeamAttention(userId);
}
```

- [ ] **Step 2: Compile and commit**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
git add backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java
git commit -m "feat(analytics): add GET /analytics/team"
```

---

### Task 8: Add @Audited annotations for event feed

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AppealService.java`

Context: AuditAspect automatically extracts the first `*Id` parameter as `entityId`. It always writes `newValue = null`. `getDashboardEvents` will look up context separately.

- [ ] **Step 1: Add @Audited to activatePeriod in EvaluationService**

Find `public EvaluationPeriod activatePeriod(Long periodId)` and add annotation:

```java
@Audited(action = "ACTIVATE_PERIOD", entityType = "EVALUATION_PERIOD")
@Transactional
public EvaluationPeriod activatePeriod(Long periodId) {
```

- [ ] **Step 2: Add @Audited to closePeriod in EvaluationService**

Find `public EvaluationPeriod closePeriod(Long periodId)` and add annotation:

```java
@Audited(action = "CLOSE_PERIOD", entityType = "EVALUATION_PERIOD")
@Transactional
public EvaluationPeriod closePeriod(Long periodId) {
```

- [ ] **Step 3: Add @Audited to fileAppeal in AppealService**

Find `public Appeal fileAppeal(Long evaluationId, Long appellantId, String reason)` and add annotation:

```java
@Audited(action = "FILE_APPEAL", entityType = "EVALUATION")
@Transactional
public Appeal fileAppeal(Long evaluationId, Long appellantId, String reason) {
```

- [ ] **Step 4: Add @Audited to respond in AppealService**

Find `public Appeal respond(Long appealId, Long evaluatorId, AppealStatus decision, String response)` and add annotation:

```java
@Audited(action = "RESPOND_APPEAL", entityType = "APPEAL")
@Transactional
public Appeal respond(Long appealId, Long evaluatorId, AppealStatus decision, String response) {
```

- [ ] **Step 5: Compile check**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java \
        backend/src/main/java/kg/gfh/kpi/service/AppealService.java
git commit -m "feat(audit): add @Audited to period activation/close and appeal file/respond"
```

---

### Task 9: DashboardEventResponse DTO + getDashboardEvents service method (TDD)

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/DashboardEventResponse.java`
- Create: `backend/src/test/java/kg/gfh/kpi/service/AnalyticsEventsTest.java`
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`

Context: AuditAspect writes `userId = null` (not the DB user id) and `userName = email`. `user_id` column in audit_log is always null for @Audited entries. Query by `user_name = email` for events the user triggered. For SUBMIT_EVALUATION events about the user's own evaluations, query by evaluatee subquery.

- [ ] **Step 1: Create DashboardEventResponse DTO**

```java
package kg.gfh.kpi.dto;

public record DashboardEventResponse(
    Long id,
    String action,
    String text,
    String iconType,
    String timestamp
) {}
```

- [ ] **Step 2: Write failing test**

```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.DashboardEventResponse;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsEventsTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getDashboardEvents_returnsEmptyWhenNoAuditEntries() {
        User user = new User();
        user.setId(5L);
        user.setEmail("test@gfh.kg");

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(jdbc.query(anyString(), any(RowMapper.class), any()))
            .thenReturn(List.of());

        List<DashboardEventResponse> result = analyticsService.getDashboardEvents(5L);

        assertThat(result).isEmpty();
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd backend && mvn test -Dtest=AnalyticsEventsTest -q 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 4: Implement getDashboardEvents**

Add to `AnalyticsService.java`:

```java
private String iconTypeForAction(String action) {
    return switch (action) {
        case "SUBMIT_EVALUATION", "CLOSE_PERIOD" -> "success";
        case "FILE_APPEAL", "RESPOND_APPEAL"     -> "warn";
        default                                  -> "info";
    };
}

public List<DashboardEventResponse> getDashboardEvents(Long userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
            "Пользователь не найден", "Колдонуучу табылган жок"));
    String email = user.getEmail();

    // 1. Fetch relevant audit_log rows
    record RawEvent(long id, String action, String entityType, Long entityId, String ts) {}
    List<RawEvent> rawEvents = jdbc.query("""
        SELECT al.id, al.action, al.entity_type, al.entity_id, al.timestamp::text AS ts
        FROM audit_log al
        WHERE (
            al.user_name = ?
            OR (al.action = 'SUBMIT_EVALUATION' AND al.entity_id IN (
                SELECT e.id FROM evaluations e WHERE e.evaluatee_id = ?
            ))
            OR (al.action = 'ACTIVATE_PERIOD')
        )
        AND al.action IN (
            'SUBMIT_EVALUATION','FILE_APPEAL','RESPOND_APPEAL',
            'ACTIVATE_PERIOD','CLOSE_PERIOD'
        )
        ORDER BY al.timestamp DESC
        LIMIT 10
        """,
        (rs, i) -> new RawEvent(rs.getLong("id"), rs.getString("action"),
            rs.getString("entity_type"), rs.getObject("entity_id", Long.class),
            rs.getString("ts")),
        email, userId);

    if (rawEvents.isEmpty()) return List.of();

    // 2. Batch-load context for evaluation-related events
    java.util.Set<Long> evalIds = rawEvents.stream()
        .filter(e -> "EVALUATION".equals(e.entityType()) && e.entityId() != null)
        .map(RawEvent::entityId)
        .collect(java.util.stream.Collectors.toSet());
    java.util.Set<Long> periodIds = rawEvents.stream()
        .filter(e -> "EVALUATION_PERIOD".equals(e.entityType()) && e.entityId() != null)
        .map(RawEvent::entityId)
        .collect(java.util.stream.Collectors.toSet());

    java.util.Map<Long, java.util.Map<String, Object>> evalContext = new java.util.HashMap<>();
    if (!evalIds.isEmpty()) {
        String inClause = evalIds.stream().map(String::valueOf)
            .collect(java.util.stream.Collectors.joining(","));
        jdbc.queryForList("""
            SELECT e.id, e.final_score::float AS score,
                   ep.type, ep.start_date::text,
                   EXTRACT(YEAR  FROM ep.start_date)::int AS yr,
                   EXTRACT(MONTH FROM ep.start_date)::int AS mo,
                   u.full_name AS evaluatee_name
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            JOIN users u ON u.id = e.evaluatee_id
            WHERE e.id IN (%s)
            """.formatted(inClause))
            .forEach(row -> evalContext.put((Long) row.get("id"), row));
    }

    java.util.Map<Long, java.util.Map<String, Object>> periodContext = new java.util.HashMap<>();
    if (!periodIds.isEmpty()) {
        String inClause = periodIds.stream().map(String::valueOf)
            .collect(java.util.stream.Collectors.joining(","));
        jdbc.queryForList("""
            SELECT id, type, start_date::text,
                   EXTRACT(YEAR  FROM start_date)::int AS yr,
                   EXTRACT(MONTH FROM start_date)::int AS mo,
                   submission_deadline::text AS deadline
            FROM evaluation_periods
            WHERE id IN (%s)
            """.formatted(inClause))
            .forEach(row -> periodContext.put((Long) row.get("id"), row));
    }

    // 3. Build text for each event
    List<DashboardEventResponse> result = new java.util.ArrayList<>();
    for (RawEvent ev : rawEvents) {
        String text = buildEventText(ev.action(), ev.entityId(), evalContext, periodContext);
        if (text == null) continue;
        result.add(new DashboardEventResponse(
            ev.id(), ev.action(), text,
            iconTypeForAction(ev.action()), ev.ts()
        ));
    }
    return result;
}

private String buildEventText(String action, Long entityId,
        java.util.Map<Long, java.util.Map<String, Object>> evalCtx,
        java.util.Map<Long, java.util.Map<String, Object>> periodCtx) {
    return switch (action) {
        case "SUBMIT_EVALUATION" -> {
            java.util.Map<String, Object> ctx = evalCtx.get(entityId);
            if (ctx == null) yield null;
            String label = buildPeriodLabel(
                (String) ctx.get("type"),
                ((Number) ctx.get("yr")).intValue(),
                ((Number) ctx.get("mo")).intValue());
            Object score = ctx.get("score");
            String scoreStr = score != null
                ? String.valueOf(((Number) score).intValue()) : "—";
            yield "Оценка за " + label + " отправлена · " + scoreStr + "/100";
        }
        case "FILE_APPEAL" -> {
            java.util.Map<String, Object> ctx = evalCtx.get(entityId);
            if (ctx == null) yield null;
            String name = (String) ctx.get("evaluatee_name");
            yield (name != null ? name : "Сотрудник") + " подал апелляцию";
        }
        case "RESPOND_APPEAL" -> "Апелляция закрыта";
        case "ACTIVATE_PERIOD" -> {
            java.util.Map<String, Object> ctx = periodCtx.get(entityId);
            if (ctx == null) yield "Открыт новый период";
            String label = buildPeriodLabel(
                (String) ctx.get("type"),
                ((Number) ctx.get("yr")).intValue(),
                ((Number) ctx.get("mo")).intValue());
            String deadline = ctx.get("deadline") != null
                ? ctx.get("deadline").toString().substring(0, 10) : "?";
            yield "Открыт период " + label + " · дедлайн " + deadline;
        }
        case "CLOSE_PERIOD" -> {
            java.util.Map<String, Object> ctx = periodCtx.get(entityId);
            if (ctx == null) yield "Период закрыт";
            String label = buildPeriodLabel(
                (String) ctx.get("type"),
                ((Number) ctx.get("yr")).intValue(),
                ((Number) ctx.get("mo")).intValue());
            yield "Период " + label + " завершён";
        }
        default -> null;
    };
}
```

Add import:

```java
import kg.gfh.kpi.dto.DashboardEventResponse;
```

- [ ] **Step 5: Run test**

```bash
cd backend && mvn test -Dtest=AnalyticsEventsTest -q 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 6: Compile check**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
```

Expected: BUILD SUCCESS

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/DashboardEventResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java \
        backend/src/test/java/kg/gfh/kpi/service/AnalyticsEventsTest.java
git commit -m "feat(analytics): implement getDashboardEvents"
```

---

### Task 10: GET /analytics/events endpoint

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java`

- [ ] **Step 1: Add import and endpoint**

Add import:

```java
import kg.gfh.kpi.dto.DashboardEventResponse;
```

Add after the team endpoint:

```java
@GetMapping("/events")
public List<DashboardEventResponse> events(Authentication auth) {
    Long userId = resolveUserId(auth);
    return analyticsService.getDashboardEvents(userId);
}
```

- [ ] **Step 2: Compile and commit**

```bash
cd backend && mvn compile -q 2>&1 | tail -5
git add backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java
git commit -m "feat(analytics): add GET /analytics/events"
```

---

### Task 11: Update analyticsApi.ts (PeriodScore + 3 new methods + types)

**Files:**
- Modify: `frontend/src/features/analytics/analyticsApi.ts`

- [ ] **Step 1: Add departmentAvg to PeriodScore and add new types and API methods**

Replace the entire file content:

```ts
import api from '../../app/api'

export interface PeriodScore {
  periodId: number
  periodType: string
  startDate: string
  endDate: string
  score: number
  departmentAvg: number | null
}

export interface PersonalAnalytics {
  userId: number
  fullName: string
  history: PeriodScore[]
  currentScore: number | null
  departmentAvg: number | null
  companyAvg: number | null
}

export interface CriteriaScore {
  criteriaId: number
  nameRu: string
  nameKg: string
  weight: number
  score: number
  maxScore: number
  delta: number | null
  levelLabel: string
}

export interface ScorecardResponse {
  periodId: number
  periodLabel: string
  totalScore: number
  grade: string
  vsGoal: number
  vsPrevPeriod: number | null
  prevPeriodLabel: string | null
  rank: number | null
  antiBonusTotal: number
  criteria: CriteriaScore[]
  antiBonuses: CriteriaScore[]
}

export interface TeamMemberDto {
  userId: number
  fullName: string
  position: string
  initials: string
  latestScore: number | null
  scoreDelta: number | null
  status: 'appeal' | 'low' | 'unevaluated' | 'best'
  reasonLabel: string
}

export interface TeamResponse {
  attention: TeamMemberDto[]
  bestPerformer: TeamMemberDto | null
  totalCount: number
  teamAvg: number | null
}

export interface DashboardEvent {
  id: number
  action: string
  text: string
  iconType: 'success' | 'warn' | 'info'
  timestamp: string
}

export interface HierarchicalNode {
  orgUnitId: number
  orgUnitNameRu: string
  orgUnitNameKg: string
  type: string
  avgScore: number | null
  minScore: number | null
  maxScore: number | null
  employeeCount: number
  submittedCount: number
  children: HierarchicalNode[]
}

export interface AntiBonusAnalytics {
  top10: Array<{
    userId: number
    fullName: string
    orgUnitName: string | null
    incidentCount: number
    totalDeduction: number
  }>
  distribution: Array<{
    label: string
    rangeFrom: number
    rangeTo: number
    employeeCount: number
  }>
  dynamics: Array<{
    periodId: number
    periodStart: string
    criteriaNameRu: string
    avgRawValue: number
    incidentCount: number
  }>
}

export const analyticsApi = {
  personal: () =>
    api.get<PersonalAnalytics>('/analytics/personal').then(r => r.data),

  scorecard: () =>
    api.get<ScorecardResponse>('/analytics/personal/scorecard')
      .then(r => r.status === 204 ? null : r.data)
      .catch(() => null),

  team: () =>
    api.get<TeamResponse>('/analytics/team').then(r => r.data),

  events: () =>
    api.get<DashboardEvent[]>('/analytics/events').then(r => r.data),

  hierarchical: (params?: { orgUnitId?: number; periodType?: string; startDate?: string; endDate?: string }) =>
    api.get<HierarchicalNode[]>('/analytics/hierarchical', { params }).then(r => r.data),

  antiBonus: (params?: { orgUnitId?: number; periodType?: string }) =>
    api.get<AntiBonusAnalytics>('/analytics/anti-bonus', { params }).then(r => r.data),
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output (clean)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/analytics/analyticsApi.ts
git commit -m "feat(dashboard): update analyticsApi with PeriodScore.departmentAvg and new types"
```

---

### Task 12: DashboardScorecard component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardScorecard.tsx`

- [ ] **Step 1: Create DashboardScorecard.tsx**

```tsx
import { useState } from 'react'
import type { ScorecardResponse, CriteriaScore } from '../analytics/analyticsApi'

interface Props {
  scorecard: ScorecardResponse | null
}

function sign(n: number): string {
  return n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1)
}

function MeterBar({ pct, warn }: { pct: number; warn: boolean }) {
  return (
    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: 4, height: 6 }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        height: 6, borderRadius: 4,
        background: warn ? 'var(--warn, #d97706)' : 'var(--accent, #1a7558)',
      }} />
    </div>
  )
}

function CriteriaRow({ row, isAntiBonus }: { row: CriteriaScore; isAntiBonus: boolean }) {
  const pct = row.maxScore > 0 ? (row.score / row.maxScore) * 100 : 0
  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '10px 14px', width: 58 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
          background: isAntiBonus ? '#fee2e2' : '#f1f5f9',
          color: isAntiBonus ? '#991b1b' : '#374151',
          padding: '3px 7px', borderRadius: 5,
        }}>
          {isAntiBonus ? row.score.toFixed(0) : `${row.weight.toFixed(0)}%`}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink, #1a1a2e)' }}>{row.nameRu}</div>
        {row.levelLabel && (
          <div style={{ fontSize: 11, color: 'var(--ink-faint, #6b7280)', marginTop: 1 }}>
            {row.levelLabel}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 14px', width: 140 }}>
        <MeterBar pct={pct} warn={!isAntiBonus && pct < 70} />
      </td>
      <td style={{ padding: '10px 14px', width: 90, textAlign: 'right', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {row.score.toFixed(1)}/{row.maxScore.toFixed(0)}
        </span>
        {row.delta !== null && (
          <span style={{ fontSize: 11, color: row.delta >= 0 ? '#16a34a' : 'var(--danger, #dc2626)', marginLeft: 4 }}>
            {sign(row.delta)}
          </span>
        )}
      </td>
    </tr>
  )
}

export function DashboardScorecard({ scorecard }: Props) {
  const [expanded, setExpanded] = useState(false)
  if (!scorecard) return null

  const { periodLabel, totalScore, grade, vsGoal, vsPrevPeriod, prevPeriodLabel,
          rank, antiBonusTotal, criteria, antiBonuses } = scorecard

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          Мой KPI · {periodLabel}
        </span>

        {/* Score summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Georgia, serif', lineHeight: 1 }}>
            {totalScore.toFixed(0)}
          </span>
          <span style={{ fontSize: 13, color: '#6b7280', alignSelf: 'flex-end', marginBottom: 2 }}>/100</span>
          <span style={{
            background: 'var(--accent, #1a7558)', color: '#fff',
            fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
          }}>
            {grade}
          </span>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {vsPrevPeriod !== null && prevPeriodLabel && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: vsPrevPeriod >= 0 ? '#dcfce7' : '#fee2e2',
              color: vsPrevPeriod >= 0 ? '#166534' : '#991b1b',
            }}>
              vs {prevPeriodLabel} {sign(vsPrevPeriod)}
            </span>
          )}
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
            background: vsGoal >= 0 ? '#dcfce7' : '#fee2e2',
            color: vsGoal >= 0 ? '#166534' : '#991b1b',
          }}>
            vs цель {sign(vsGoal)}
          </span>
          {rank !== null && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: '#f1f5f9', color: '#475569',
            }}>
              #{rank} в отделе
            </span>
          )}
          {antiBonusTotal < 0 && (
            <span style={{
              fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
              background: '#fee2e2', color: '#991b1b',
            }}>
              штрафы {antiBonusTotal.toFixed(1)}
            </span>
          )}
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--accent, #1a7558)', background: 'none',
            border: '1px solid #d1fae5', borderRadius: 20, padding: '4px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Скрыть' : 'Детали'} <span>{expanded ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Expanded: criteria table */}
      {expanded && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid #e5e7eb' }}>
            <tbody>
              {criteria.map(row => (
                <CriteriaRow key={row.criteriaId} row={row} isAntiBonus={false} />
              ))}
            </tbody>
          </table>

          {antiBonuses.length > 0 && (
            <>
              <div style={{
                background: '#fef2f2', padding: '8px 14px',
                fontSize: 11, fontWeight: 600, color: 'var(--danger, #dc2626)',
                letterSpacing: '.05em', textTransform: 'uppercase',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                Штрафные баллы
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {antiBonuses.map(row => (
                    <CriteriaRow key={row.criteriaId} row={row} isAntiBonus={true} />
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardScorecard.tsx
git commit -m "feat(dashboard): add DashboardScorecard component"
```

---

### Task 13: DashboardTeam component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardTeam.tsx`

- [ ] **Step 1: Create DashboardTeam.tsx**

```tsx
import { useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../app/store'
import type { TeamResponse, TeamMemberDto } from '../analytics/analyticsApi'

interface Props {
  team: TeamResponse | null
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #0d4d3f, #1a7558)',
      color: '#fff', fontSize: 11, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {initials}
    </div>
  )
}

function reasonColor(status: string): string {
  if (status === 'appeal' || status === 'low') return 'var(--danger, #dc2626)'
  if (status === 'unevaluated') return 'var(--warn, #d97706)'
  return '#16a34a'
}

function scoreColor(score: number | null): string {
  if (score === null) return '#6b7280'
  if (score < 70) return 'var(--danger, #dc2626)'
  if (score >= 90) return '#16a34a'
  return 'var(--ink, #1a1a2e)'
}

function MemberRow({ member, highlight }: { member: TeamMemberDto; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 20px', borderBottom: '1px solid #f3f4f6',
      background: highlight ? '#f0fdf4' : undefined,
    }}>
      <Avatar initials={member.initials} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink, #1a1a2e)' }}>{member.fullName}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{member.position}</div>
        <div style={{ fontSize: 11, color: reasonColor(member.status), marginTop: 1 }}>
          {member.reasonLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Georgia, serif', color: scoreColor(member.latestScore) }}>
          {member.latestScore !== null ? member.latestScore.toFixed(0) : '—'}
        </div>
        {member.scoreDelta !== null && (
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            {member.scoreDelta >= 0 ? '+' : ''}{member.scoreDelta.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  )
}

export function DashboardTeam({ team }: Props) {
  const [expanded, setExpanded] = useState(false)
  const role = useSelector((s: RootState) => s.auth.role)

  if (role !== 'MANAGER' && role !== 'ADMIN') return null
  if (!team) return null

  const { attention, bestPerformer, totalCount, teamAvg } = team
  const appealCount = attention.filter(m => m.status === 'appeal').length
  const unevaluatedCount = attention.filter(m => m.status === 'unevaluated').length

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          Команда
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Georgia, serif', color: 'var(--danger, #dc2626)', lineHeight: 1 }}>
            {attention.length}
          </span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>требуют внимания</span>
          {teamAvg !== null && (
            <span style={{
              fontSize: 12, background: '#f1f5f9', padding: '4px 10px',
              borderRadius: 20, color: '#6b7280', marginLeft: 4,
            }}>
              Средний балл: <strong style={{ color: 'var(--ink, #1a1a2e)' }}>{teamAvg.toFixed(0)}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {appealCount > 0 && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500, background: '#fee2e2', color: '#991b1b' }}>
              {appealCount} апелляции
            </span>
          )}
          {unevaluatedCount > 0 && (
            <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500, background: '#f1f5f9', color: '#475569' }}>
              {unevaluatedCount} не оценён
            </span>
          )}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--accent, #1a7558)', background: 'none',
            border: '1px solid #d1fae5', borderRadius: 20, padding: '4px 12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {expanded ? 'Скрыть' : 'Детали'} <span>{expanded ? '▴' : '▾'}</span>
        </button>
      </div>

      {/* Expanded: member rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          {attention.length === 0 && !bestPerformer && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: '#6b7280' }}>
              Команда в норме
            </div>
          )}
          {attention.map(m => <MemberRow key={m.userId} member={m} />)}
          {bestPerformer && <MemberRow member={bestPerformer} highlight />}
          <div style={{
            padding: '10px 20px', fontSize: 12, color: '#6b7280',
            display: 'flex', justifyContent: 'space-between',
            background: '#fafafa', borderTop: '1px solid #e5e7eb',
          }}>
            <span>Всего {totalCount} сотрудников</span>
            {role === 'ADMIN' && (
              <a href="/admin/org" style={{ color: 'var(--accent, #1a7558)', fontSize: 12 }}>
                Вся команда →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardTeam.tsx
git commit -m "feat(dashboard): add DashboardTeam component"
```

---

### Task 14: DashboardHistoryChart component (Recharts)

**Files:**
- Create: `frontend/src/features/dashboard/DashboardHistoryChart.tsx`

- [ ] **Step 1: Create DashboardHistoryChart.tsx**

```tsx
import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import type { PeriodScore } from '../analytics/analyticsApi'

interface Props {
  history: PeriodScore[]
}

type Tab = 'quarter' | 'half' | 'year'

function periodLabel(ps: PeriodScore): string {
  const d = new Date(ps.startDate)
  const yr = String(d.getFullYear()).slice(2)
  if (ps.periodType === 'QUARTERLY') {
    const q = Math.floor(d.getMonth() / 3) + 1
    return `Q${q} '${yr}`
  }
  if (ps.periodType === 'MONTHLY') return `M${d.getMonth() + 1} '${yr}`
  return `${d.getFullYear()}`
}

function groupByHalf(quarters: PeriodScore[]): { label: string; score: number; deptAvg: number | null }[] {
  const result: { label: string; score: number; deptAvg: number | null }[] = []
  for (let i = 0; i < quarters.length; i += 2) {
    const pair = quarters.slice(i, i + 2)
    const avgScore = pair.reduce((s, p) => s + p.score, 0) / pair.length
    const depts = pair.map(p => p.departmentAvg).filter((v): v is number => v !== null)
    const avgDept = depts.length > 0 ? depts.reduce((s, v) => s + v, 0) / depts.length : null
    const d = new Date(pair[0].startDate)
    const half = d.getMonth() < 6 ? 'H1' : 'H2'
    result.push({ label: `${half} '${String(d.getFullYear()).slice(2)}`, score: Math.round(avgScore), deptAvg: avgDept })
  }
  return result
}

function groupByYear(quarters: PeriodScore[]): { label: string; score: number; deptAvg: number | null }[] {
  const byYear: Record<number, PeriodScore[]> = {}
  quarters.forEach(p => {
    const yr = new Date(p.startDate).getFullYear()
    ;(byYear[yr] ??= []).push(p)
  })
  return Object.entries(byYear).map(([yr, ps]) => {
    const avgScore = ps.reduce((s, p) => s + p.score, 0) / ps.length
    const depts = ps.map(p => p.departmentAvg).filter((v): v is number => v !== null)
    const avgDept = depts.length > 0 ? depts.reduce((s, v) => s + v, 0) / depts.length : null
    return { label: yr, score: Math.round(avgScore), deptAvg: avgDept }
  })
}

export function DashboardHistoryChart({ history }: Props) {
  const [tab, setTab] = useState<Tab>('quarter')

  const quarters = useMemo(() =>
    [...history]
      .filter(p => p.periodType === 'QUARTERLY')
      .reverse()
      .slice(-8),
    [history])

  const chartData = useMemo(() => {
    if (tab === 'quarter') {
      return quarters.map(p => ({
        label: periodLabel(p),
        score: Math.round(p.score),
        deptAvg: p.departmentAvg !== null ? Math.round(p.departmentAvg) : null,
      }))
    }
    if (tab === 'half') return groupByHalf(quarters)
    return groupByYear(quarters)
  }, [tab, quarters])

  const hasHalf = quarters.length >= 2
  const hasYear = quarters.length >= 4

  if (history.length === 0) return null

  const n = chartData.length
  const suffix = history[0].periodType === 'MONTHLY' ? 'месяцев' : 'кварталов'

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
            letterSpacing: '.08em', textTransform: 'uppercase',
          }}>
            История KPI · {n} {suffix}
          </span>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1a7558', display: 'inline-block' }} />
              Мой KPI
            </span>
            <span style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#c9a84c', opacity: .8, display: 'inline-block' }} />
              Среднее по деп.
            </span>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8,
          overflow: 'hidden', width: 'fit-content', marginBottom: 14,
        }}>
          {(['quarter', 'half', 'year'] as Tab[]).map(t => {
            const label = t === 'quarter' ? 'Квартал' : t === 'half' ? 'Полугодие' : 'Год'
            const disabled = (t === 'half' && !hasHalf) || (t === 'year' && !hasYear)
            return (
              <button key={t} onClick={() => !disabled && setTab(t)} disabled={disabled} style={{
                fontSize: 12, padding: '5px 14px', cursor: disabled ? 'default' : 'pointer',
                background: tab === t ? 'var(--ink, #1a1a2e)' : '#fff',
                color: tab === t ? '#fff' : disabled ? '#d1d5db' : '#6b7280',
                border: 'none', fontFamily: 'inherit',
              }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barGap={3} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <YAxis domain={[50, 100]} ticks={[55, 70, 85, 100]} tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              labelStyle={{ fontWeight: 600 }}
              formatter={(val: number, name: string) => [val, name === 'score' ? 'Мой KPI' : 'Ср. по деп.']}
            />
            <Bar dataKey="score" fill="#1a7558" radius={[3, 3, 0, 0]} />
            <Bar dataKey="deptAvg" fill="#c9a84c" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardHistoryChart.tsx
git commit -m "feat(dashboard): add DashboardHistoryChart with Recharts and quarter/half/year toggle"
```

---

### Task 15: DashboardEventFeed component

**Files:**
- Create: `frontend/src/features/dashboard/DashboardEventFeed.tsx`

- [ ] **Step 1: Create DashboardEventFeed.tsx**

```tsx
import type { DashboardEvent } from '../analytics/analyticsApi'

interface Props {
  events: DashboardEvent[]
}

function relativeTime(isoStr: string): string {
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffD = Math.floor(diffMs / 86_400_000)
  if (diffH < 1) return '<1ч'
  if (diffH < 24) return `${diffH}ч`
  if (diffD === 1) return 'вчера'
  const d = new Date(isoStr)
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const iconStyles: Record<string, { bg: string; char: string }> = {
  success: { bg: '#dcfce7', char: '✓' },
  warn:    { bg: '#fef3c7', char: '!' },
  info:    { bg: '#dbeafe', char: '📅' },
}

export function DashboardEventFeed({ events }: Props) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      marginTop: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{
          fontFamily: 'var(--font-mono, monospace)', fontSize: 12, fontWeight: 600,
          letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          Лента событий
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '20px', fontSize: 13, color: '#6b7280' }}>
          Событий пока нет
        </div>
      ) : (
        events.map((ev, i) => {
          const icon = iconStyles[ev.iconType] ?? iconStyles.info
          return (
            <div key={ev.id} style={{
              display: 'flex', gap: 14, padding: '11px 20px',
              borderBottom: i < events.length - 1 ? '1px solid #f3f4f6' : 'none',
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                background: icon.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, marginTop: 1,
              }}>
                {icon.char}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink, #1a1a2e)', lineHeight: 1.5, flex: 1 }}>
                {ev.text}
              </div>
              <div style={{
                marginLeft: 'auto', fontSize: 11, color: '#6b7280',
                whiteSpace: 'nowrap', paddingTop: 3,
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {relativeTime(ev.timestamp)}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardEventFeed.tsx
git commit -m "feat(dashboard): add DashboardEventFeed component"
```

---

### Task 16: DashboardPage wiring

**Files:**
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Replace DashboardPage.tsx with extended version**

```tsx
import { useEffect, useState } from 'react'
import { analyticsApi } from '../analytics/analyticsApi'
import type { PersonalAnalytics, ScorecardResponse, TeamResponse, DashboardEvent } from '../analytics/analyticsApi'
import { evaluationsApi } from '../evaluations/evaluationsApi'
import type { PageResponse, Evaluation } from '../evaluations/evaluationsApi'
import { periodsApi } from '../periods/periodsApi'
import type { Period, AppealPending } from '../periods/periodsApi'
import { DashboardHero } from './DashboardHero'
import { DashboardQuickActions } from './DashboardQuickActions'
import { DashboardScorecard } from './DashboardScorecard'
import { DashboardTeam } from './DashboardTeam'
import { DashboardHistoryChart } from './DashboardHistoryChart'
import { DashboardEventFeed } from './DashboardEventFeed'

export function DashboardPage() {
  const [analytics, setAnalytics] = useState<PersonalAnalytics | null>(null)
  const [myTasks, setMyTasks] = useState<PageResponse<Evaluation> | null>(null)
  const [periods, setPeriods] = useState<Period[]>([])
  const [pendingAppeals, setPendingAppeals] = useState<AppealPending[]>([])
  const [scorecard, setScorecard] = useState<ScorecardResponse | null>(null)
  const [team, setTeam] = useState<TeamResponse | null>(null)
  const [events, setEvents] = useState<DashboardEvent[]>([])

  useEffect(() => {
    analyticsApi.personal().then(setAnalytics).catch(() => {})
    evaluationsApi.myTasks(0, 200).then(setMyTasks).catch(() => {})
    periodsApi.list().then(setPeriods).catch(() => {})
    periodsApi.pendingAppeals().then(setPendingAppeals).catch(() => {})
    analyticsApi.scorecard().then(v => { if (v) setScorecard(v) }).catch(() => {})
    analyticsApi.team().then(setTeam).catch(() => {})
    analyticsApi.events().then(setEvents).catch(() => {})
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
      <DashboardScorecard scorecard={scorecard} />
      <DashboardTeam team={team} />
      {analytics && <DashboardHistoryChart history={analytics.history} />}
      <DashboardEventFeed events={events} />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add frontend/src/features/dashboard/DashboardPage.tsx
git commit -m "feat(dashboard): wire scorecard, team, history chart, and event feed into DashboardPage"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Scorecard header: score, grade, pills (vs prev, vs цель, rank, штрафы) | Task 12 |
| Scorecard criteria table with weights, meters, scores, deltas | Task 12 |
| Scorecard anti-bonus block | Task 12 |
| Scorecard collapsed by default, "Детали" button | Task 12 |
| `GET /analytics/personal/scorecard` | Tasks 2–4 |
| Team section visible MANAGER/ADMIN only | Task 13 |
| Team header: attention count, avg, summary pills | Task 13 |
| Team rows: appeal → low → unevaluated sort, best performer | Tasks 6, 13 |
| Team "Вся команда →" for ADMIN only to /admin/org | Task 13 |
| `GET /analytics/team` | Tasks 5–7 |
| History chart: Recharts BarChart, personal + dept avg bars | Task 14 |
| Quarter/half/year toggle (client-side grouping) | Task 14 |
| PeriodScore.departmentAvg added | Task 1 |
| `GET /analytics/events` with audit_log query | Tasks 9–10 |
| Event feed display with iconType coloring | Task 15 |
| Empty state "Событий пока нет" | Task 15 |
| @Audited on activatePeriod, closePeriod, fileAppeal, respond | Task 8 |
| DashboardPage fires 7 parallel requests | Task 16 |

**Type consistency:**
- `ScorecardResponse.CriteriaScoreDto` used in Task 3 service matches Task 2 DTO ✅
- `TeamResponse.TeamMemberDto` used in Task 6 service matches Task 5 DTO ✅
- `DashboardEventResponse` used in Task 9 service matches DTO ✅
- Frontend types in `analyticsApi.ts` (Task 11) match backend DTOs ✅
- `PeriodScore.departmentAvg` added in both Java (Task 1) and TypeScript (Task 11) ✅
