# M3-BE-02: EvaluationService — Scoring, Score History, Reassignment, Dismissal, Dry Run, Optimistic Locking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `EvaluationService` covering: evaluation period lifecycle (DRAFT→ACTIVE→CLOSED), evaluator resolution via `EvaluatorResolver`, score entry with autosave, final submission (computes rating, writes score history snapshot, sets `is_frozen` on criteria), evaluator reassignment, employee dismissal handling, and dry-run score preview.

**Architecture:** Creating a period calls `resolveEvaluator` for every active employee and creates DRAFT evaluations. Submitting calls `RatingService.computeRating`, writes `evaluation_score_history` rows, and freezes referenced criteria. Optimistic locking via `@Version` rejects concurrent saves. Reassignment replaces `evaluator_id`; dismissal sets evaluation status to CLOSED with a note. Dry-run returns computed score without persisting.

**Tech Stack:** Spring Boot 3.x, Spring Data JPA, PostgreSQL 15.

**Depends on:** m3-workflow/be-01-db-schema.md, m2-criteria/be-03-rating-service.md

---

### Task 1: Entities + repositories for M3

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/EvaluationPeriod.java`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/Evaluation.java`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/EvaluationScore.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluationPeriodRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluationRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluationScoreRepository.java`

- [ ] **Step 1: Create EvaluationPeriod entity**

`backend/src/main/java/kg/gfh/kpi/entity/EvaluationPeriod.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_periods")
@Getter @Setter
public class EvaluationPeriod {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PeriodType type;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "submission_deadline", nullable = false)
    private LocalDateTime submissionDeadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PeriodStatus status = PeriodStatus.DRAFT;

    @Column(name = "auto_created")
    private boolean autoCreated = false;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    public enum PeriodType { MONTHLY, QUARTERLY, ANNUAL }
    public enum PeriodStatus { DRAFT, ACTIVE, CLOSED }
}
```

- [ ] **Step 2: Create Evaluation entity**

`backend/src/main/java/kg/gfh/kpi/entity/Evaluation.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluations")
@Getter @Setter
public class Evaluation {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private EvaluationPeriod period;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluatee_id", nullable = false)
    private User evaluatee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_id", nullable = false)
    private User evaluator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EvaluationStatus status = EvaluationStatus.DRAFT;

    @Column(name = "final_score", precision = 6, scale = 2)
    private BigDecimal finalScore;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "evaluatee_comment")
    private String evaluateeComment;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public enum EvaluationStatus { DRAFT, SUBMITTED, ACKNOWLEDGED, APPEALED, CLOSED }
}
```

- [ ] **Step 3: Create EvaluationScore entity**

`backend/src/main/java/kg/gfh/kpi/entity/EvaluationScore.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_scores")
@Getter @Setter
public class EvaluationScore {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false)
    private Long evaluationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criteria_id", nullable = false)
    private Criteria criteria;

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal value;

    @Column
    private String note;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
```

- [ ] **Step 4: Create repositories**

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationPeriodRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationPeriodRepository extends JpaRepository<EvaluationPeriod, Long> {
    List<EvaluationPeriod> findByStatus(PeriodStatus status);
    Page<EvaluationPeriod> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    Optional<Evaluation> findByPeriodIdAndEvaluateeId(Long periodId, Long evaluateeId);

    List<Evaluation> findByPeriodIdAndStatus(Long periodId, EvaluationStatus status);

    Page<Evaluation> findByEvaluatorIdAndStatus(Long evaluatorId, EvaluationStatus status, Pageable pageable);

    Page<Evaluation> findByEvaluateeId(Long evaluateeId, Pageable pageable);

    @Query("SELECT e FROM Evaluation e WHERE e.period.id = :periodId AND e.evaluator.id = :evaluatorId")
    List<Evaluation> findByPeriodAndEvaluator(
        @Param("periodId") Long periodId,
        @Param("evaluatorId") Long evaluatorId
    );

    long countByPeriodIdAndStatus(Long periodId, EvaluationStatus status);
}
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationScoreRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EvaluationScoreRepository extends JpaRepository<EvaluationScore, Long> {
    List<EvaluationScore> findByEvaluationId(Long evaluationId);
    Optional<EvaluationScore> findByEvaluationIdAndCriteriaId(Long evaluationId, Long criteriaId);

    @Modifying
    @Query("DELETE FROM EvaluationScore s WHERE s.evaluationId = :evaluationId")
    void deleteByEvaluationId(Long evaluationId);
}
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/EvaluationPeriod.java \
        backend/src/main/java/kg/gfh/kpi/entity/Evaluation.java \
        backend/src/main/java/kg/gfh/kpi/entity/EvaluationScore.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationPeriodRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationScoreRepository.java
git commit -m "feat(evaluation): add Evaluation/EvaluationPeriod/EvaluationScore entities and repositories"
```

---

### Task 2: EvaluationService + DTOs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/EvaluationPeriodRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/EvaluationResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/ScoreRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java`

- [ ] **Step 1: Create DTOs**

`backend/src/main/java/kg/gfh/kpi/dto/EvaluationPeriodRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EvaluationPeriodRequest(
    @NotNull PeriodType type,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotNull LocalDateTime submissionDeadline
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/EvaluationResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record EvaluationResponse(
    Long id,
    Long periodId,
    Long evaluateeId,
    String evaluateeName,
    Long evaluatorId,
    String evaluatorName,
    EvaluationStatus status,
    BigDecimal finalScore,
    Long version,
    LocalDateTime submittedAt,
    LocalDateTime createdAt
) {
    public static EvaluationResponse from(Evaluation e) {
        return new EvaluationResponse(
            e.getId(), e.getPeriod().getId(),
            e.getEvaluatee().getId(), e.getEvaluatee().getFullName(),
            e.getEvaluator().getId(), e.getEvaluator().getFullName(),
            e.getStatus(), e.getFinalScore(), e.getVersion(),
            e.getSubmittedAt(), e.getCreatedAt()
        );
    }
}
```

`backend/src/main/java/kg/gfh/kpi/dto/ScoreRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ScoreRequest(
    @NotNull Long criteriaId,
    @NotNull BigDecimal value,
    String note
) {}
```

- [ ] **Step 2: Create EvaluationService**

`backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.EvaluationPeriodRequest;
import kg.gfh.kpi.dto.EvaluationResponse;
import kg.gfh.kpi.dto.ScoreRequest;
import kg.gfh.kpi.entity.*;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final EvaluationRepository evaluationRepository;
    private final EvaluationPeriodRepository periodRepository;
    private final EvaluationScoreRepository scoreRepository;
    private final EvaluationScoreHistoryRepository historyRepository;
    private final CriteriaRepository criteriaRepository;
    private final UserRepository userRepository;
    private final EvaluatorResolver evaluatorResolver;
    private final RatingService ratingService;
    private final ProductionCalendarService calendarService;
    private final NotificationService notificationService;

    // ── Period lifecycle ─────────────────────────────────────────────────────

    @Transactional
    public EvaluationPeriod createPeriod(EvaluationPeriodRequest req, Long createdBy) {
        EvaluationPeriod period = new EvaluationPeriod();
        period.setType(req.type());
        period.setStartDate(req.startDate());
        period.setEndDate(req.endDate());
        period.setSubmissionDeadline(req.submissionDeadline());
        period.setCreatedBy(createdBy);
        return periodRepository.save(period);
    }

    @Transactional
    public EvaluationPeriod activatePeriod(Long periodId) {
        EvaluationPeriod period = findPeriodById(periodId);
        if (period.getStatus() != PeriodStatus.DRAFT) {
            throw new ApiException("PERIOD_NOT_DRAFT", "Период не в статусе DRAFT",
                "Мезгил DRAFT статусунда эмес");
        }
        period.setStatus(PeriodStatus.ACTIVE);
        periodRepository.save(period);

        // Create evaluations for all active employees
        List<User> employees = userRepository.findByIsActiveTrue();
        for (User employee : employees) {
            User evaluator = evaluatorResolver.resolve(employee.getId(),
                period.getStartDate(), period.getEndDate());
            if (evaluator == null) {
                log.warn("No evaluator resolved for employee {} in period {}", employee.getId(), periodId);
                continue;
            }
            Evaluation eval = new Evaluation();
            eval.setPeriod(period);
            eval.setEvaluatee(employee);
            eval.setEvaluator(evaluator);
            evaluationRepository.save(eval);
        }

        notificationService.notifyPeriodActivated(period);
        return period;
    }

    @Transactional
    public EvaluationPeriod closePeriod(Long periodId) {
        EvaluationPeriod period = findPeriodById(periodId);
        if (period.getStatus() != PeriodStatus.ACTIVE) {
            throw new ApiException("PERIOD_NOT_ACTIVE", "Период не активен", "Мезгил активдүү эмес");
        }
        // Auto-close any remaining DRAFT evaluations
        List<Evaluation> drafts = evaluationRepository.findByPeriodIdAndStatus(periodId, EvaluationStatus.DRAFT);
        for (Evaluation e : drafts) {
            e.setStatus(EvaluationStatus.CLOSED);
            evaluationRepository.save(e);
        }
        period.setStatus(PeriodStatus.CLOSED);
        period.setClosedAt(LocalDateTime.now());
        return periodRepository.save(period);
    }

    // ── Score entry ──────────────────────────────────────────────────────────

    @Transactional
    public EvaluationResponse saveScores(Long evaluationId, List<ScoreRequest> scores, Long evaluatorId) {
        Evaluation eval = findById(evaluationId);
        assertEvaluatorOwns(eval, evaluatorId);
        assertEditable(eval);

        for (ScoreRequest req : scores) {
            EvaluationScore score = scoreRepository
                .findByEvaluationIdAndCriteriaId(evaluationId, req.criteriaId())
                .orElseGet(() -> {
                    EvaluationScore s = new EvaluationScore();
                    s.setEvaluationId(evaluationId);
                    Criteria c = criteriaRepository.findById(req.criteriaId())
                        .orElseThrow(() -> new ApiException("CRITERIA_NOT_FOUND",
                            "Критерий не найден", "Критерий табылган жок"));
                    s.setCriteria(c);
                    return s;
                });
            score.setValue(req.value());
            score.setNote(req.note());
            scoreRepository.save(score);
        }
        return EvaluationResponse.from(eval);
    }

    // ── Dry run ──────────────────────────────────────────────────────────────

    public BigDecimal dryRunScore(Long evaluationId, List<ScoreRequest> scores) {
        Evaluation eval = findById(evaluationId);
        YearMonth ym = YearMonth.of(eval.getPeriod().getStartDate().getYear(),
            eval.getPeriod().getStartDate().getMonth());
        int workingDays = calendarService.getWorkingDays(ym);

        // Temporarily persist to history-like objects without saving (in-memory calc)
        BigDecimal positiveSum = BigDecimal.ZERO;
        BigDecimal antiBonusSum = BigDecimal.ZERO;

        for (ScoreRequest req : scores) {
            Criteria c = criteriaRepository.findById(req.criteriaId())
                .orElseThrow(() -> new ApiException("CRITERIA_NOT_FOUND",
                    "Критерий не найден", "Критерий табылган жок"));
            BigDecimal weighted = req.value().multiply(c.getWeight())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
            if (c.getType() == Criteria.CriteriaType.POSITIVE) {
                positiveSum = positiveSum.add(weighted);
            } else {
                antiBonusSum = antiBonusSum.add(weighted);
            }
        }

        BigDecimal result = positiveSum.subtract(antiBonusSum);
        return result.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    // ── Submission ───────────────────────────────────────────────────────────

    @Transactional
    public EvaluationResponse submit(Long evaluationId, Long evaluatorId) {
        Evaluation eval;
        try {
            eval = findById(evaluationId);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new ApiException("CONCURRENT_MODIFICATION",
                "Оценка была изменена другим пользователем. Перезагрузите страницу.",
                "Баалоо башка колдонуучу тарабынан өзгөртүлдү. Бетти жаңылаңыз.");
        }

        assertEvaluatorOwns(eval, evaluatorId);
        assertEditable(eval);

        List<EvaluationScore> scores = scoreRepository.findByEvaluationId(evaluationId);
        if (scores.isEmpty()) {
            throw new ApiException("NO_SCORES", "Нет ни одной оценки для отправки",
                "Жөнөтүү үчүн бир да баа жок");
        }

        YearMonth ym = YearMonth.of(eval.getPeriod().getStartDate().getYear(),
            eval.getPeriod().getStartDate().getMonth());
        int workingDays = calendarService.getWorkingDays(ym);

        // Write immutable score history snapshot
        for (EvaluationScore s : scores) {
            EvaluationScoreHistory history = new EvaluationScoreHistory();
            history.setEvaluationId(evaluationId);
            history.setCriteriaId(s.getCriteria().getId());
            history.setCriteriaType(s.getCriteria().getType());
            history.setRawValue(s.getValue());
            history.setWeightSnapshot(s.getCriteria().getWeight());
            history.setWeightedValue(s.getValue().multiply(s.getCriteria().getWeight())
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
            historyRepository.save(history);

            // Freeze criteria — weight cannot change once scored
            if (!s.getCriteria().isFrozen()) {
                s.getCriteria().setFrozen(true);
                criteriaRepository.save(s.getCriteria());
            }
        }

        BigDecimal finalScore = ratingService.computeRating(evaluationId, workingDays);
        eval.setFinalScore(finalScore);
        eval.setStatus(EvaluationStatus.SUBMITTED);
        eval.setSubmittedAt(LocalDateTime.now());
        evaluationRepository.save(eval);

        notificationService.notifyEvaluationSubmitted(eval);
        return EvaluationResponse.from(eval);
    }

    // ── Reassignment ─────────────────────────────────────────────────────────

    @Transactional
    public EvaluationResponse reassign(Long evaluationId, Long newEvaluatorId) {
        Evaluation eval = findById(evaluationId);
        assertEditable(eval);
        User newEvaluator = userRepository.findById(newEvaluatorId)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок"));
        eval.setEvaluator(newEvaluator);
        return EvaluationResponse.from(evaluationRepository.save(eval));
    }

    // ── Dismissal handling ───────────────────────────────────────────────────

    @Transactional
    public void handleDismissal(Long userId) {
        // Close all DRAFT evaluations for dismissed employee
        List<Evaluation> openEvals = evaluationRepository.findByEvaluateeId(userId, Pageable.unpaged())
            .getContent().stream()
            .filter(e -> e.getStatus() == EvaluationStatus.DRAFT)
            .toList();
        for (Evaluation e : openEvals) {
            e.setStatus(EvaluationStatus.CLOSED);
            evaluationRepository.save(e);
        }
        log.info("Closed {} draft evaluations for dismissed user {}", openEvals.size(), userId);
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    public Page<EvaluationResponse> listForEvaluator(Long evaluatorId, EvaluationStatus status, Pageable pageable) {
        return evaluationRepository.findByEvaluatorIdAndStatus(evaluatorId, status, pageable)
            .map(EvaluationResponse::from);
    }

    public Page<EvaluationResponse> listForEmployee(Long employeeId, Pageable pageable) {
        return evaluationRepository.findByEvaluateeId(employeeId, pageable)
            .map(EvaluationResponse::from);
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    private Evaluation findById(Long id) {
        return evaluationRepository.findById(id)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
    }

    private EvaluationPeriod findPeriodById(Long id) {
        return periodRepository.findById(id)
            .orElseThrow(() -> new ApiException("PERIOD_NOT_FOUND",
                "Период не найден", "Мезгил табылган жок"));
    }

    private void assertEvaluatorOwns(Evaluation eval, Long evaluatorId) {
        if (!eval.getEvaluator().getId().equals(evaluatorId)) {
            throw new ApiException("ACCESS_DENIED",
                "Вы не являетесь оценщиком этого сотрудника",
                "Сиз бул кызматкердин баалоочусу эмессиз");
        }
    }

    private void assertEditable(Evaluation eval) {
        if (eval.getStatus() != EvaluationStatus.DRAFT) {
            throw new ApiException("EVALUATION_NOT_EDITABLE",
                "Оценка уже отправлена и не может быть изменена",
                "Баалоо жөнөтүлгөн жана өзгөртүүгө болбойт");
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/ \
        backend/src/main/java/kg/gfh/kpi/service/EvaluationService.java
git commit -m "feat(evaluation): add EvaluationService with scoring, submission, history snapshot, reassignment, and dismissal handling"
```

---

### Task 3: EvaluationController + integration test

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/controller/EvaluationController.java`
- Create: `backend/src/test/java/kg/gfh/kpi/service/EvaluationServiceTest.java`

- [ ] **Step 1: Create EvaluationController**

`backend/src/main/java/kg/gfh/kpi/controller/EvaluationController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.EvaluationPeriodRequest;
import kg.gfh.kpi.dto.EvaluationResponse;
import kg.gfh.kpi.dto.ScoreRequest;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final UserRepository userRepository;

    // ── Periods ──────────────────────────────────────────────────────────────

    @PostMapping("/periods")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createPeriod(@Valid @RequestBody EvaluationPeriodRequest req, Authentication auth) {
        Long userId = resolveUserId(auth);
        return evaluationService.createPeriod(req, userId);
    }

    @PostMapping("/periods/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public Object activatePeriod(@PathVariable Long id) {
        return evaluationService.activatePeriod(id);
    }

    @PostMapping("/periods/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public Object closePeriod(@PathVariable Long id) {
        return evaluationService.closePeriod(id);
    }

    // ── Evaluations ───────────────────────────────────────────────────────────

    @GetMapping("/evaluations/my-tasks")
    public Page<EvaluationResponse> myPendingEvaluations(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = resolveUserId(auth);
        return evaluationService.listForEvaluator(userId, EvaluationStatus.DRAFT, PageRequest.of(page, size));
    }

    @GetMapping("/evaluations/my-history")
    public Page<EvaluationResponse> myEvaluationHistory(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = resolveUserId(auth);
        return evaluationService.listForEmployee(userId, PageRequest.of(page, size));
    }

    @PutMapping("/evaluations/{id}/scores")
    public EvaluationResponse saveScores(
            @PathVariable Long id,
            @Valid @RequestBody List<ScoreRequest> scores,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        return evaluationService.saveScores(id, scores, userId);
    }

    @PostMapping("/evaluations/{id}/scores/preview")
    public BigDecimal dryRun(
            @PathVariable Long id,
            @RequestBody List<ScoreRequest> scores) {
        return evaluationService.dryRunScore(id, scores);
    }

    @PostMapping("/evaluations/{id}/submit")
    public EvaluationResponse submit(@PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        return evaluationService.submit(id, userId);
    }

    @PutMapping("/evaluations/{id}/reassign")
    @PreAuthorize("hasRole('ADMIN')")
    public EvaluationResponse reassign(
            @PathVariable Long id,
            @RequestParam Long newEvaluatorId) {
        return evaluationService.reassign(id, newEvaluatorId);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 2: Write key unit tests for EvaluationService**

`backend/src/test/java/kg/gfh/kpi/service/EvaluationServiceTest.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock EvaluationRepository evaluationRepository;
    @Mock EvaluationPeriodRepository periodRepository;
    @Mock EvaluationScoreRepository scoreRepository;
    @Mock EvaluationScoreHistoryRepository historyRepository;
    @Mock CriteriaRepository criteriaRepository;
    @Mock UserRepository userRepository;
    @Mock EvaluatorResolver evaluatorResolver;
    @Mock RatingService ratingService;
    @Mock ProductionCalendarService calendarService;
    @Mock NotificationService notificationService;

    @InjectMocks EvaluationService evaluationService;

    @Test
    void saveScores_wrongEvaluator_throwsAccessDenied() {
        Evaluation eval = stubEvaluation(1L, 99L, EvaluationStatus.DRAFT);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));

        assertThatThrownBy(() -> evaluationService.saveScores(1L, java.util.List.of(), 42L))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("ACCESS_DENIED");
    }

    @Test
    void submit_alreadySubmitted_throwsNotEditable() {
        Evaluation eval = stubEvaluation(1L, 42L, EvaluationStatus.SUBMITTED);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));

        assertThatThrownBy(() -> evaluationService.submit(1L, 42L))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("EVALUATION_NOT_EDITABLE");
    }

    @Test
    void submit_noScores_throwsNoScores() {
        Evaluation eval = stubEvaluation(1L, 42L, EvaluationStatus.DRAFT);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));
        when(scoreRepository.findByEvaluationId(1L)).thenReturn(java.util.List.of());

        assertThatThrownBy(() -> evaluationService.submit(1L, 42L))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("NO_SCORES");
    }

    private Evaluation stubEvaluation(Long id, Long evaluatorId, EvaluationStatus status) {
        var period = new kg.gfh.kpi.entity.EvaluationPeriod();
        period.setId(1L);
        period.setStartDate(java.time.LocalDate.of(2026, 1, 1));
        period.setEndDate(java.time.LocalDate.of(2026, 1, 31));

        var evaluatee = new kg.gfh.kpi.entity.User();
        evaluatee.setId(10L);
        evaluatee.setFullName("Employee");

        var evaluator = new kg.gfh.kpi.entity.User();
        evaluator.setId(evaluatorId);
        evaluator.setFullName("Evaluator");

        var eval = new Evaluation();
        eval.setId(id);
        eval.setPeriod(period);
        eval.setEvaluatee(evaluatee);
        eval.setEvaluator(evaluator);
        eval.setStatus(status);
        return eval;
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd backend && mvn test -Dtest=EvaluationServiceTest
```

Expected: 3 tests, all green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/controller/EvaluationController.java \
        backend/src/test/java/kg/gfh/kpi/service/EvaluationServiceTest.java
git commit -m "feat(evaluation): add EvaluationController + unit tests for access control and state machine"
```
