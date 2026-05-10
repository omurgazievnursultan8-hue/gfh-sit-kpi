# M4-BE-02: AntiBonusAnalyticsService — Top-10, Distribution, 12-Period Dynamics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `AntiBonusAnalyticsService` with three analytics views: (1) top-10 employees with most anti-bonus incidents, (2) distribution histogram of anti-bonus scores across score ranges, (3) 12-period dynamics showing anti-bonus trends per criteria. All results cached 5 minutes.

**Architecture:** All queries use `evaluation_score_history` joined to `criteria` where `type = 'ANTI_BONUS'`. Top-10 groups by `evaluatee_id`, sums `raw_value` or counts rows. Distribution bins scores into configurable buckets (0-10, 10-20, ..., 90-100). Dynamics groups by `period_id` for the last 12 periods.

**Tech Stack:** Spring Boot 3.x, JdbcTemplate, PostgreSQL 15, Caffeine.

**Depends on:** m4-analytics/be-01-hierarchical-analytics.md

---

### Task 1: AntiBonusAnalyticsService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/AntiBonusAnalyticsResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AntiBonusAnalyticsService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AntiBonusAnalyticsController.java`

- [ ] **Step 1: Create AntiBonusAnalyticsResponse DTO**

`backend/src/main/java/kg/gfh/kpi/dto/AntiBonusAnalyticsResponse.java`:
```java
package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

public record AntiBonusAnalyticsResponse(
    List<TopEmployee> top10,
    List<DistributionBucket> distribution,
    List<PeriodDynamics> dynamics
) {
    public record TopEmployee(
        Long userId,
        String fullName,
        String orgUnitName,
        Long incidentCount,
        BigDecimal totalDeduction
    ) {}

    public record DistributionBucket(
        String label,       // e.g. "0–10%"
        Integer rangeFrom,
        Integer rangeTo,
        Long employeeCount
    ) {}

    public record PeriodDynamics(
        Long periodId,
        String periodStart,
        String criteriaNameRu,
        BigDecimal avgRawValue,
        Long incidentCount
    ) {}
}
```

- [ ] **Step 2: Create AntiBonusAnalyticsService**

`backend/src/main/java/kg/gfh/kpi/service/AntiBonusAnalyticsService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse;
import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AntiBonusAnalyticsService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = "antiBonusAnalytics", key = "#orgUnitId + '_' + #periodType")
    public AntiBonusAnalyticsResponse getAnalytics(Long orgUnitId, String periodType) {
        return new AntiBonusAnalyticsResponse(
            getTop10(orgUnitId, periodType),
            getDistribution(orgUnitId, periodType),
            getDynamics(orgUnitId, periodType)
        );
    }

    private List<TopEmployee> getTop10(Long orgUnitId, String periodType) {
        String unitFilter = orgUnitId != null ? "AND u.org_unit_id = ?" : "";
        Object[] params = orgUnitId != null
            ? new Object[]{periodType, orgUnitId}
            : new Object[]{periodType};

        return jdbc.query("""
            SELECT u.id, u.full_name,
                   ou.name as org_unit_name,
                   COUNT(h.id) as incident_count,
                   COALESCE(SUM(h.weighted_value), 0) as total_deduction
            FROM evaluation_score_history h
            JOIN evaluations e ON e.id = h.evaluation_id
            JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            JOIN users u ON u.id = e.evaluatee_id
            LEFT JOIN org_units ou ON ou.id = u.org_unit_id
            WHERE h.criteria_type = 'ANTI_BONUS'
            """ + unitFilter + """
            GROUP BY u.id, u.full_name, ou.name
            ORDER BY total_deduction DESC
            LIMIT 10
            """,
            (rs, i) -> new TopEmployee(
                rs.getLong("id"), rs.getString("full_name"),
                rs.getString("org_unit_name"),
                rs.getLong("incident_count"),
                rs.getBigDecimal("total_deduction")
            ), params);
    }

    private List<DistributionBucket> getDistribution(Long orgUnitId, String periodType) {
        // Distribution of final scores into 10% buckets
        List<DistributionBucket> buckets = new ArrayList<>();
        for (int from = 0; from < 100; from += 10) {
            int to = from + 10;
            String label = from + "–" + to + "%";

            String unitFilter = orgUnitId != null ? "AND u.org_unit_id = ?" : "";
            Object[] params = orgUnitId != null
                ? new Object[]{periodType, from, to}
                : new Object[]{periodType, from, to};

            Long count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT e.evaluatee_id)
                FROM evaluations e
                JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
                JOIN users u ON u.id = e.evaluatee_id
                WHERE e.final_score >= ? AND e.final_score < ?
                  AND e.final_score IS NOT NULL
                """ + unitFilter,
                Long.class, params);

            buckets.add(new DistributionBucket(label, from, to, count != null ? count : 0L));
        }
        return buckets;
    }

    private List<PeriodDynamics> getDynamics(Long orgUnitId, String periodType) {
        String unitFilter = orgUnitId != null ? "AND u.org_unit_id = ?" : "";
        Object[] params = orgUnitId != null
            ? new Object[]{periodType, orgUnitId}
            : new Object[]{periodType};

        return jdbc.query("""
            SELECT ep.id as period_id,
                   ep.start_date::text as period_start,
                   c.name_ru as criteria_name_ru,
                   AVG(h.raw_value) as avg_raw_value,
                   COUNT(h.id) as incident_count
            FROM evaluation_score_history h
            JOIN evaluations e ON e.id = h.evaluation_id
            JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            JOIN criteria c ON c.id = h.criteria_id
            JOIN users u ON u.id = e.evaluatee_id
            WHERE h.criteria_type = 'ANTI_BONUS'
            """ + unitFilter + """
            GROUP BY ep.id, ep.start_date, c.id, c.name_ru
            ORDER BY ep.start_date DESC
            LIMIT 12
            """,
            (rs, i) -> new PeriodDynamics(
                rs.getLong("period_id"),
                rs.getString("period_start"),
                rs.getString("criteria_name_ru"),
                rs.getBigDecimal("avg_raw_value"),
                rs.getLong("incident_count")
            ), params);
    }
}
```

- [ ] **Step 3: Create controller**

`backend/src/main/java/kg/gfh/kpi/controller/AntiBonusAnalyticsController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse;
import kg.gfh.kpi.service.AntiBonusAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics/anti-bonus")
@RequiredArgsConstructor
public class AntiBonusAnalyticsController {

    private final AntiBonusAnalyticsService service;

    @GetMapping
    public AntiBonusAnalyticsResponse get(
            @RequestParam(required = false) Long orgUnitId,
            @RequestParam(defaultValue = "MONTHLY") String periodType) {
        return service.getAnalytics(orgUnitId, periodType);
    }
}
```

Add `antiBonusAnalytics` to CacheConfig cache names.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/AntiBonusAnalyticsResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AntiBonusAnalyticsService.java \
        backend/src/main/java/kg/gfh/kpi/controller/AntiBonusAnalyticsController.java
git commit -m "feat(analytics): add AntiBonusAnalyticsService with top-10, distribution, and 12-period dynamics"
```
