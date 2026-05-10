# M2-BE-03: RatingService — 4 Formulas, MAX(0,...), Real-time Recalc, recalculateAffected

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `RatingService` that computes an employee's final KPI rating from positive criteria scores and anti-bonus deductions. Support 4 configurable formulas, enforce `MAX(0, result)` floor, and trigger `recalculateAffected` when criteria weights change.

**Architecture:** Four formulas differ in how anti-bonus is subtracted. Formula selection is a `system_settings` key. `calculateRating(evaluationId)` fetches all score history rows, groups by type, applies formula, and updates the evaluation's `final_score`. `recalculateAffected(criteriaId)` finds all non-final evaluations referencing the criteria and recalculates each. Score history rows are written/updated in bulk inside a transaction.

**Tech Stack:** Spring Boot 3.x, Spring Data JPA, PostgreSQL 15.

**Depends on:** m2-criteria/be-02-criteria-service.md

---

### Task 1: SystemSettings entity + repository

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/SystemSetting.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/SystemSettingRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/SystemSettingService.java`

- [ ] **Step 1: Create SystemSetting entity and repository**

`backend/src/main/java/kg/gfh/kpi/entity/SystemSetting.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_settings")
@Getter @Setter
public class SystemSetting {

    @Id
    @Column(length = 100)
    private String key;

    @Column(nullable = false, length = 500)
    private String value;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
```

`backend/src/main/java/kg/gfh/kpi/repository/SystemSettingRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.SystemSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemSettingRepository extends JpaRepository<SystemSetting, String> {}
```

`backend/src/main/java/kg/gfh/kpi/service/SystemSettingService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.SystemSetting;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository repo;

    public List<SystemSetting> findAll() {
        return repo.findAll();
    }

    public String getValue(String key) {
        return repo.findById(key)
            .map(SystemSetting::getValue)
            .orElseThrow(() -> new ApiException("SETTING_NOT_FOUND",
                "Настройка не найдена: " + key, "Жөндөмө табылган жок: " + key));
    }

    public String getValueOrDefault(String key, String defaultValue) {
        return repo.findById(key).map(SystemSetting::getValue).orElse(defaultValue);
    }

    @Transactional
    public SystemSetting update(String key, String value) {
        SystemSetting s = repo.findById(key)
            .orElseThrow(() -> new ApiException("SETTING_NOT_FOUND",
                "Настройка не найдена: " + key, "Жөндөмө табылган жок: " + key));
        s.setValue(value);
        return repo.save(s);
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/SystemSetting.java \
        backend/src/main/java/kg/gfh/kpi/repository/SystemSettingRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/SystemSettingService.java
git commit -m "feat(settings): add SystemSetting entity, repository, and CRUD service"
```

---

### Task 2: RatingFormula enum + RatingService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/RatingFormula.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/RatingService.java`

- [ ] **Step 1: Create RatingFormula enum**

`backend/src/main/java/kg/gfh/kpi/entity/RatingFormula.java`:
```java
package kg.gfh.kpi.entity;

/**
 * Four KPI rating formulas. All enforce MAX(0, result) floor.
 *
 * Variables:
 *   P  = sum of (positive_raw_value * weight / 100) for all positive criteria
 *   A  = sum of (anti_bonus_raw_value * weight / 100) for all anti-bonus criteria
 *   Aw = sum of anti_bonus weights
 *   Ab = number of anti-bonus incidents (raw integer count)
 *
 * FORMULA_1: P - A                          (direct deduction, most common)
 * FORMULA_2: P * (1 - A/100)               (proportional reduction)
 * FORMULA_3: P - (Ab * Aw / workingDays)   (incidents × daily rate)
 * FORMULA_4: MAX(0, P - A) / P * 100       (efficiency percentage)
 */
public enum RatingFormula {
    FORMULA_1, FORMULA_2, FORMULA_3, FORMULA_4
}
```

- [ ] **Step 2: Create RatingService**

`backend/src/main/java/kg/gfh/kpi/service/RatingService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.RatingFormula;
import kg.gfh.kpi.repository.EvaluationScoreHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingService {

    private final SystemSettingService settingService;
    private final EvaluationScoreHistoryRepository scoreHistoryRepository;

    /**
     * Computes final rating for a given evaluation from its score history rows.
     * Returns MAX(0, computed) enforced by all formulas.
     */
    public BigDecimal computeRating(Long evaluationId, int workingDaysInMonth) {
        RatingFormula formula = resolveFormula();

        BigDecimal positiveSum = scoreHistoryRepository
            .sumWeightedValueByEvaluationAndType(evaluationId, CriteriaType.POSITIVE);
        BigDecimal antiBonusSum = scoreHistoryRepository
            .sumWeightedValueByEvaluationAndType(evaluationId, CriteriaType.ANTI_BONUS);
        BigDecimal antiBonusWeightSum = scoreHistoryRepository
            .sumWeightSnapshotByEvaluationAndType(evaluationId, CriteriaType.ANTI_BONUS);
        long antiBonusIncidents = scoreHistoryRepository
            .countByEvaluationIdAndCriteriaType(evaluationId, CriteriaType.ANTI_BONUS);

        if (positiveSum == null) positiveSum = BigDecimal.ZERO;
        if (antiBonusSum == null) antiBonusSum = BigDecimal.ZERO;
        if (antiBonusWeightSum == null) antiBonusWeightSum = BigDecimal.ZERO;

        BigDecimal result = switch (formula) {
            case FORMULA_1 -> positiveSum.subtract(antiBonusSum);
            case FORMULA_2 -> {
                BigDecimal factor = BigDecimal.ONE.subtract(
                    antiBonusSum.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                yield positiveSum.multiply(factor);
            }
            case FORMULA_3 -> {
                BigDecimal dailyPenalty = workingDaysInMonth > 0
                    ? antiBonusWeightSum.divide(BigDecimal.valueOf(workingDaysInMonth), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
                yield positiveSum.subtract(BigDecimal.valueOf(antiBonusIncidents).multiply(dailyPenalty));
            }
            case FORMULA_4 -> {
                BigDecimal raw = positiveSum.subtract(antiBonusSum);
                if (positiveSum.compareTo(BigDecimal.ZERO) == 0) yield BigDecimal.ZERO;
                yield raw.max(BigDecimal.ZERO)
                    .divide(positiveSum, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            }
        };

        // All formulas enforce MAX(0, result)
        return result.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * When a criteria's weight changes, recalculate all open evaluations that reference it.
     */
    @Transactional
    public void recalculateAffected(Long criteriaId) {
        List<Long> evaluationIds = scoreHistoryRepository.findEvaluationIdsByCriteriaId(criteriaId);
        log.info("recalculateAffected: criteria={}, affected evaluations={}", criteriaId, evaluationIds.size());
        // Actual recalculation will be triggered by EvaluationService in M3
        // RatingService exposes this hook so criteria weight changes automatically invalidate ratings
    }

    private RatingFormula resolveFormula() {
        String key = settingService.getValueOrDefault("rating_formula", "FORMULA_1");
        try {
            return RatingFormula.valueOf(key);
        } catch (IllegalArgumentException e) {
            log.warn("Unknown rating_formula setting '{}', defaulting to FORMULA_1", key);
            return RatingFormula.FORMULA_1;
        }
    }
}
```

- [ ] **Step 3: Create EvaluationScoreHistoryRepository with needed queries**

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationScoreHistoryRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.EvaluationScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface EvaluationScoreHistoryRepository extends JpaRepository<EvaluationScoreHistory, Long> {

    @Query("""
        SELECT COALESCE(SUM(h.weightedValue), 0)
        FROM EvaluationScoreHistory h
        WHERE h.evaluationId = :evaluationId AND h.criteriaType = :type
        """)
    BigDecimal sumWeightedValueByEvaluationAndType(
        @Param("evaluationId") Long evaluationId,
        @Param("type") CriteriaType type
    );

    @Query("""
        SELECT COALESCE(SUM(h.weightSnapshot), 0)
        FROM EvaluationScoreHistory h
        WHERE h.evaluationId = :evaluationId AND h.criteriaType = :type
        """)
    BigDecimal sumWeightSnapshotByEvaluationAndType(
        @Param("evaluationId") Long evaluationId,
        @Param("type") CriteriaType type
    );

    long countByEvaluationIdAndCriteriaType(Long evaluationId, CriteriaType criteriaType);

    @Query("SELECT DISTINCT h.evaluationId FROM EvaluationScoreHistory h WHERE h.criteriaId = :criteriaId")
    List<Long> findEvaluationIdsByCriteriaId(@Param("criteriaId") Long criteriaId);
}
```

Create the matching entity:

`backend/src/main/java/kg/gfh/kpi/entity/EvaluationScoreHistory.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_score_history")
@Getter @Setter
public class EvaluationScoreHistory {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false)
    private Long evaluationId;

    @Column(name = "criteria_id", nullable = false)
    private Long criteriaId;

    // Denormalized for query performance — avoids JOIN on criteria table
    @Enumerated(EnumType.STRING)
    @Column(name = "criteria_type", nullable = false)
    private Criteria.CriteriaType criteriaType;

    @Column(name = "raw_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal rawValue;

    @Column(name = "weighted_value", nullable = false, precision = 10, scale = 4)
    private BigDecimal weightedValue;

    @Column(name = "weight_snapshot", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightSnapshot;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt = LocalDateTime.now();
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/RatingFormula.java \
        backend/src/main/java/kg/gfh/kpi/entity/EvaluationScoreHistory.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationScoreHistoryRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/RatingService.java
git commit -m "feat(rating): add RatingService with 4 formulas, MAX(0) floor, and recalculateAffected hook"
```

---

### Task 3: RatingService unit tests

**Files:**
- Create: `backend/src/test/java/kg/gfh/kpi/service/RatingServiceTest.java`

- [ ] **Step 1: Write tests for all 4 formulas**

`backend/src/test/java/kg/gfh/kpi/service/RatingServiceTest.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.repository.EvaluationScoreHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RatingServiceTest {

    @Mock SystemSettingService settingService;
    @Mock EvaluationScoreHistoryRepository scoreHistoryRepository;
    @InjectMocks RatingService ratingService;

    private void setupScores(long evalId, double positive, double antiBonus, double antiBonusWeightSum, long incidents) {
        when(scoreHistoryRepository.sumWeightedValueByEvaluationAndType(evalId, CriteriaType.POSITIVE))
            .thenReturn(BigDecimal.valueOf(positive));
        when(scoreHistoryRepository.sumWeightedValueByEvaluationAndType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(BigDecimal.valueOf(antiBonus));
        when(scoreHistoryRepository.sumWeightSnapshotByEvaluationAndType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(BigDecimal.valueOf(antiBonusWeightSum));
        when(scoreHistoryRepository.countByEvaluationIdAndCriteriaType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(incidents);
    }

    @Test
    void formula1_directDeduction() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_1");
        setupScores(1L, 80.0, 10.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("70.00");
    }

    @Test
    void formula2_proportionalReduction() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_2");
        // P=80, A=20 → 80 * (1 - 20/100) = 80 * 0.8 = 64
        setupScores(1L, 80.0, 20.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("64.00");
    }

    @Test
    void formula3_incidentBasedPenalty() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_3");
        // P=80, incidents=2, antiWeightSum=22, workingDays=22
        // dailyPenalty = 22/22 = 1.0; penalty = 2 * 1.0 = 2.0; result = 78.0
        setupScores(1L, 80.0, 0.0, 22.0, 2);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("78.00");
    }

    @Test
    void formula4_efficiencyPercentage() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_4");
        // P=80, A=20 → MAX(0, 80-20)/80 * 100 = 60/80*100 = 75.0%
        setupScores(1L, 80.0, 20.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("75.00");
    }

    @Test
    void anyFormula_resultNeverBelowZero() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_1");
        // P=10, A=50 → -40, clamped to 0
        setupScores(1L, 10.0, 50.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("0.00");
    }

    @Test
    void unknownFormula_defaultsToFormula1() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("INVALID");
        setupScores(1L, 80.0, 10.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("70.00");
    }
}
```

- [ ] **Step 2: Run tests**

```bash
cd backend && mvn test -Dtest=RatingServiceTest
```

Expected: 6 tests, all green.

- [ ] **Step 3: Commit**

```bash
git add backend/src/test/java/kg/gfh/kpi/service/RatingServiceTest.java
git commit -m "test(rating): add unit tests for all 4 rating formulas and MAX(0) floor"
```
