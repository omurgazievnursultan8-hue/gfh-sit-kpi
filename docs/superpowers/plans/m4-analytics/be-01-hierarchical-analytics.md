# M4-BE-01: AnalyticsService + HierarchicalAnalyticsService — Aggregation SQL, Caching TTL 5min

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `AnalyticsService` (personal rating history, comparison with department average) and `HierarchicalAnalyticsService` (drill-down aggregation by org unit, period type, and date range, with 3 display modes: table / bar chart / heatmap data). Cache results with 5-minute TTL via Caffeine.

**Architecture:** All analytics queries go directly to PostgreSQL with CTEs rather than loading data into Java — the DB can aggregate 100-employee sets trivially. `HierarchicalAnalyticsService.aggregate(orgUnitId, periodType, dateRange)` returns a tree of `{ unitName, avgScore, employeeCount, children }` nodes by walking `org_units` recursively. Results cached per `(orgUnitId, periodType, startDate, endDate)` key with 5-minute TTL. Personal analytics uses `evaluation_score_history` joined to `evaluations` for the requesting user.

**Tech Stack:** Spring Boot 3.x, Spring Data JPA (native queries), PostgreSQL 15, Caffeine.

**Depends on:** m3-workflow/be-06-notifications-websocket.md

---

### Task 1: Personal analytics service

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java`

- [ ] **Step 1: Create AnalyticsService**

`backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java`:
```java
package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

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
        BigDecimal score
    ) {}
}
```

`backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.PersonalAnalyticsResponse;
import kg.gfh.kpi.dto.PersonalAnalyticsResponse.PeriodScore;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;

    @Cacheable(value = "personalAnalytics", key = "#userId")
    public PersonalAnalyticsResponse getPersonalAnalytics(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок"));

        List<PeriodScore> history = jdbc.query("""
            SELECT e.period_id, ep.type, ep.start_date::text, ep.end_date::text, e.final_score
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
                rs.getBigDecimal("final_score")
            ), userId);

        BigDecimal currentScore = history.isEmpty() ? null : history.get(0).score();

        // Department average: employees in same org unit, same last period
        BigDecimal deptAvg = jdbc.queryForObject("""
            SELECT AVG(e2.final_score)
            FROM evaluations e2
            JOIN users u2 ON u2.id = e2.evaluatee_id
            JOIN users u1 ON u1.org_unit_id = u2.org_unit_id AND u1.id = ?
            WHERE e2.period_id = (
                SELECT MAX(e3.period_id) FROM evaluations e3 WHERE e3.evaluatee_id = ?
            ) AND e2.final_score IS NOT NULL
            """, BigDecimal.class, userId, userId);

        // Company average: last period
        BigDecimal companyAvg = jdbc.queryForObject("""
            SELECT AVG(e.final_score) FROM evaluations e
            WHERE e.period_id = (
                SELECT MAX(e2.period_id) FROM evaluations e2 WHERE e2.evaluatee_id = ?
            ) AND e.final_score IS NOT NULL
            """, BigDecimal.class, userId);

        return new PersonalAnalyticsResponse(userId, user.getFullName(), history,
            currentScore, deptAvg, companyAvg);
    }

    @Cacheable(value = "departmentRanking", key = "#orgUnitId + '_' + #periodId")
    public List<Object[]> getDepartmentRanking(Long orgUnitId, Long periodId) {
        return jdbc.query("""
            SELECT u.id, u.full_name, e.final_score,
                   RANK() OVER (ORDER BY e.final_score DESC NULLS LAST) as rank
            FROM evaluations e
            JOIN users u ON u.id = e.evaluatee_id
            WHERE u.org_unit_id = ?
              AND e.period_id = ?
              AND e.final_score IS NOT NULL
            ORDER BY e.final_score DESC
            """,
            (rs, i) -> new Object[]{
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getBigDecimal("final_score"),
                rs.getLong("rank")
            }, orgUnitId, periodId);
    }
}
```

- [ ] **Step 2: Create AnalyticsController**

`backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.PersonalAnalyticsResponse;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AnalyticsService;
import kg.gfh.kpi.service.HierarchicalAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final HierarchicalAnalyticsService hierarchicalService;
    private final UserRepository userRepository;

    @GetMapping("/personal")
    public PersonalAnalyticsResponse personal(Authentication auth) {
        Long userId = resolveUserId(auth);
        return analyticsService.getPersonalAnalytics(userId);
    }

    @GetMapping("/hierarchical")
    public Object hierarchical(
            @RequestParam(required = false) Long orgUnitId,
            @RequestParam(defaultValue = "MONTHLY") String periodType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return hierarchicalService.aggregate(orgUnitId, periodType, startDate, endDate);
    }

    @GetMapping("/ranking")
    public List<Object[]> ranking(
            @RequestParam Long orgUnitId,
            @RequestParam Long periodId) {
        return analyticsService.getDepartmentRanking(orgUnitId, periodId);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/PersonalAnalyticsResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AnalyticsService.java \
        backend/src/main/java/kg/gfh/kpi/controller/AnalyticsController.java
git commit -m "feat(analytics): add AnalyticsService with personal history, department avg, company avg (cached 5min)"
```

---

### Task 2: HierarchicalAnalyticsService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/HierarchicalNode.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/HierarchicalAnalyticsService.java`

- [ ] **Step 1: Create HierarchicalNode DTO**

`backend/src/main/java/kg/gfh/kpi/dto/HierarchicalNode.java`:
```java
package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

public record HierarchicalNode(
    Long orgUnitId,
    String orgUnitName,
    String type,
    BigDecimal avgScore,
    BigDecimal minScore,
    BigDecimal maxScore,
    Integer employeeCount,
    Integer submittedCount,
    List<HierarchicalNode> children
) {}
```

- [ ] **Step 2: Create HierarchicalAnalyticsService**

`backend/src/main/java/kg/gfh/kpi/service/HierarchicalAnalyticsService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.HierarchicalNode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HierarchicalAnalyticsService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = "hierarchicalAnalytics",
        key = "#orgUnitId + '_' + #periodType + '_' + #startDate + '_' + #endDate")
    public List<HierarchicalNode> aggregate(Long orgUnitId, String periodType,
                                             String startDate, String endDate) {
        // Fetch all org units (for tree building)
        List<Map<String, Object>> units = jdbc.queryForList("""
            SELECT id, name, type, parent_id FROM org_units ORDER BY id
            """);

        // Fetch aggregated scores per org unit for the requested period range
        String dateFilter = "";
        List<Object> params = new ArrayList<>();
        params.add(periodType);

        if (startDate != null && endDate != null) {
            dateFilter = "AND ep.start_date >= ?::date AND ep.end_date <= ?::date";
            params.add(startDate);
            params.add(endDate);
        }

        String sql = """
            SELECT u.org_unit_id,
                   COUNT(DISTINCT u.id) as employee_count,
                   COUNT(e.id) FILTER (WHERE e.final_score IS NOT NULL) as submitted_count,
                   AVG(e.final_score) as avg_score,
                   MIN(e.final_score) as min_score,
                   MAX(e.final_score) as max_score
            FROM users u
            LEFT JOIN evaluations e ON e.evaluatee_id = u.id
            LEFT JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            """ + dateFilter + """
            WHERE u.is_active = true AND u.org_unit_id IS NOT NULL
            GROUP BY u.org_unit_id
            """;

        List<Map<String, Object>> scores = jdbc.queryForList(sql, params.toArray());
        Map<Long, Map<String, Object>> scoreMap = scores.stream()
            .collect(Collectors.toMap(
                r -> ((Number) r.get("org_unit_id")).longValue(),
                r -> r
            ));

        // Build node map
        Map<Long, HierarchicalNode> nodeMap = units.stream().collect(
            Collectors.toMap(
                u -> ((Number) u.get("id")).longValue(),
                u -> {
                    Long unitId = ((Number) u.get("id")).longValue();
                    Map<String, Object> s = scoreMap.getOrDefault(unitId, Map.of());
                    return new HierarchicalNode(
                        unitId,
                        (String) u.get("name"),
                        (String) u.get("type"),
                        s.isEmpty() ? null : (BigDecimal) s.get("avg_score"),
                        s.isEmpty() ? null : (BigDecimal) s.get("min_score"),
                        s.isEmpty() ? null : (BigDecimal) s.get("max_score"),
                        s.isEmpty() ? 0 : ((Number) s.get("employee_count")).intValue(),
                        s.isEmpty() ? 0 : ((Number) s.get("submitted_count")).intValue(),
                        new ArrayList<>()
                    );
                }
            )
        );

        // Wire children
        List<HierarchicalNode> roots = new ArrayList<>();
        for (Map<String, Object> unit : units) {
            Long id = ((Number) unit.get("id")).longValue();
            Object parentId = unit.get("parent_id");
            if (parentId == null) {
                roots.add(nodeMap.get(id));
            } else {
                HierarchicalNode parent = nodeMap.get(((Number) parentId).longValue());
                if (parent != null) {
                    ((ArrayList<HierarchicalNode>) parent.children()).add(nodeMap.get(id));
                }
            }
        }

        // If specific orgUnitId requested, return subtree only
        if (orgUnitId != null) {
            HierarchicalNode target = nodeMap.get(orgUnitId);
            return target != null ? List.of(target) : List.of();
        }

        return roots;
    }
}
```

Add cache name to CacheConfig:
```java
// In CacheConfig.java, add "hierarchicalAnalytics", "personalAnalytics", "departmentRanking"
// to the manager.setCacheName list
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/HierarchicalNode.java \
        backend/src/main/java/kg/gfh/kpi/service/HierarchicalAnalyticsService.java
git commit -m "feat(analytics): add HierarchicalAnalyticsService with tree aggregation and Caffeine caching"
```
