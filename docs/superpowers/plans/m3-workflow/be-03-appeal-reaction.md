# M3-BE-03: AppealService + Reaction Logic (AGREE/DISAGREE, Auto-AGREE on Timeout, UPHELD/OVERTURNED)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `ReactionService` (employee reacts AGREE/DISAGREE to a submitted evaluation) and `AppealService` (file appeal on DISAGREE, evaluator responds UPHELD/OVERTURNED, Quartz auto-agrees on timeout). Both services send notifications.

**Architecture:** After evaluation is SUBMITTED, employee has N days (from `system_settings.appeal_deadline_days`) to react. DISAGREE → employee may file an appeal with a reason. Evaluator responds within `auto_agree_timeout_hours`; if no response by deadline, a Quartz job sets status to AUTO_AGREED. UPHELD = evaluator stands by their score (evaluation remains CLOSED). OVERTURNED = evaluator agrees to recalculate (score must be re-submitted; evaluation goes back to DRAFT with new scores).

**Tech Stack:** Spring Boot 3.x, Spring Data JPA, Quartz (appeal timeout job is in be-05).

**Depends on:** m3-workflow/be-02-evaluation-service.md

---

### Task 1: Reaction entity + service

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/EvaluationReaction.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluationReactionRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/ReactionService.java`

- [ ] **Step 1: Create EvaluationReaction entity**

`backend/src/main/java/kg/gfh/kpi/entity/EvaluationReaction.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "evaluation_reactions")
@Getter @Setter
public class EvaluationReaction {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false, unique = true)
    private Long evaluationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReactionType reaction;

    @Column
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum ReactionType { AGREE, DISAGREE }
}
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationReactionRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EvaluationReactionRepository extends JpaRepository<EvaluationReaction, Long> {
    Optional<EvaluationReaction> findByEvaluationId(Long evaluationId);
    boolean existsByEvaluationId(Long evaluationId);
}
```

- [ ] **Step 2: Create ReactionService**

`backend/src/main/java/kg/gfh/kpi/service/ReactionService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationReaction;
import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.EvaluationReactionRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ReactionService {

    private final EvaluationRepository evaluationRepository;
    private final EvaluationReactionRepository reactionRepository;
    private final NotificationService notificationService;

    @Transactional
    public EvaluationReaction react(Long evaluationId, Long employeeId,
                                    ReactionType reactionType, String comment) {
        Evaluation eval = findEvaluation(evaluationId);

        if (!eval.getEvaluatee().getId().equals(employeeId)) {
            throw new ApiException("ACCESS_DENIED",
                "Это не ваша оценка", "Бул сиздин баалооңуз эмес");
        }
        if (eval.getStatus() != EvaluationStatus.SUBMITTED) {
            throw new ApiException("EVALUATION_NOT_SUBMITTED",
                "Реакцию можно оставить только на отправленную оценку",
                "Реакцияны жөнөтүлгөн баалоого гана калтырса болот");
        }
        if (reactionRepository.existsByEvaluationId(evaluationId)) {
            throw new ApiException("REACTION_ALREADY_EXISTS",
                "Реакция уже зарегистрирована", "Реакция мурунтан катталган");
        }

        EvaluationReaction reaction = new EvaluationReaction();
        reaction.setEvaluationId(evaluationId);
        reaction.setReaction(reactionType);
        reaction.setComment(comment);
        reactionRepository.save(reaction);

        if (reactionType == ReactionType.AGREE) {
            eval.setStatus(EvaluationStatus.ACKNOWLEDGED);
        } else {
            eval.setStatus(EvaluationStatus.APPEALED);
        }
        evaluationRepository.save(eval);

        notificationService.notifyReactionSubmitted(eval, reactionType);
        return reaction;
    }

    private Evaluation findEvaluation(Long id) {
        return evaluationRepository.findById(id)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/EvaluationReaction.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationReactionRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/ReactionService.java
git commit -m "feat(reaction): add ReactionService that transitions evaluation to ACKNOWLEDGED or APPEALED"
```

---

### Task 2: Appeal entity + AppealService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/Appeal.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AppealService.java`

- [ ] **Step 1: Create Appeal entity**

`backend/src/main/java/kg/gfh/kpi/entity/Appeal.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "appeals")
@Getter @Setter
public class Appeal {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluation_id", nullable = false, unique = true)
    private Long evaluationId;

    @Column(name = "appellant_id", nullable = false)
    private Long appellantId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppealStatus status = AppealStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String response;

    @Column(name = "responded_by")
    private Long respondedBy;

    @Column(nullable = false)
    private LocalDateTime deadline;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    public enum AppealStatus { PENDING, UPHELD, OVERTURNED, AUTO_AGREED }
}
```

`backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppealRepository extends JpaRepository<Appeal, Long> {
    Optional<Appeal> findByEvaluationId(Long evaluationId);
    boolean existsByEvaluationId(Long evaluationId);
    List<Appeal> findByStatusAndDeadlineBefore(AppealStatus status, LocalDateTime now);
}
```

- [ ] **Step 2: Create AppealService**

`backend/src/main/java/kg/gfh/kpi/service/AppealService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.EvaluationScoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppealService {

    private final AppealRepository appealRepository;
    private final EvaluationRepository evaluationRepository;
    private final EvaluationScoreRepository scoreRepository;
    private final SystemSettingService settingService;
    private final NotificationService notificationService;

    @Transactional
    public Appeal fileAppeal(Long evaluationId, Long appellantId, String reason) {
        Evaluation eval = findEvaluation(evaluationId);

        if (eval.getStatus() != EvaluationStatus.APPEALED) {
            throw new ApiException("EVALUATION_NOT_IN_APPEALED_STATUS",
                "Апелляцию можно подать только при статусе APPEALED",
                "Апелляцияны APPEALED статусунда гана берүүгө болот");
        }
        if (!eval.getEvaluatee().getId().equals(appellantId)) {
            throw new ApiException("ACCESS_DENIED",
                "Апелляцию может подать только оцениваемый",
                "Апелляцияны баалоо объектиси гана бере алат");
        }
        if (appealRepository.existsByEvaluationId(evaluationId)) {
            throw new ApiException("APPEAL_ALREADY_EXISTS",
                "Апелляция уже подана", "Апелляция мурунтан берилген");
        }

        int timeoutHours = Integer.parseInt(
            settingService.getValueOrDefault("auto_agree_timeout_hours", "72"));

        Appeal appeal = new Appeal();
        appeal.setEvaluationId(evaluationId);
        appeal.setAppellantId(appellantId);
        appeal.setReason(reason);
        appeal.setDeadline(LocalDateTime.now().plusHours(timeoutHours));
        appealRepository.save(appeal);

        notificationService.notifyAppealFiled(eval, appeal);
        return appeal;
    }

    @Transactional
    public Appeal respond(Long appealId, Long evaluatorId, AppealStatus decision, String response) {
        Appeal appeal = appealRepository.findById(appealId)
            .orElseThrow(() -> new ApiException("APPEAL_NOT_FOUND",
                "Апелляция не найдена", "Апелляция табылган жок"));

        if (appeal.getStatus() != AppealStatus.PENDING) {
            throw new ApiException("APPEAL_ALREADY_RESOLVED",
                "Апелляция уже рассмотрена", "Апелляция мурунтан каралган");
        }
        if (decision != AppealStatus.UPHELD && decision != AppealStatus.OVERTURNED) {
            throw new ApiException("INVALID_APPEAL_DECISION",
                "Допустимые решения: UPHELD или OVERTURNED",
                "Уруксат берилген чечимдер: UPHELD же OVERTURNED");
        }

        appeal.setStatus(decision);
        appeal.setResponse(response);
        appeal.setRespondedBy(evaluatorId);
        appeal.setResolvedAt(LocalDateTime.now());
        appealRepository.save(appeal);

        Evaluation eval = findEvaluation(appeal.getEvaluationId());

        if (decision == AppealStatus.OVERTURNED) {
            // Revert evaluation to DRAFT so evaluator can re-score
            scoreRepository.deleteByEvaluationId(eval.getId());
            eval.setStatus(EvaluationStatus.DRAFT);
            eval.setFinalScore(null);
            eval.setSubmittedAt(null);
            evaluationRepository.save(eval);
            notificationService.notifyAppealOverturned(eval);
        } else {
            eval.setStatus(EvaluationStatus.CLOSED);
            evaluationRepository.save(eval);
            notificationService.notifyAppealUpheld(eval);
        }

        return appeal;
    }

    /**
     * Called by Quartz job to auto-agree pending appeals past their deadline.
     */
    @Transactional
    public void processExpiredAppeals() {
        List<Appeal> expired = appealRepository.findByStatusAndDeadlineBefore(
            AppealStatus.PENDING, LocalDateTime.now());
        for (Appeal appeal : expired) {
            appeal.setStatus(AppealStatus.AUTO_AGREED);
            appeal.setResolvedAt(LocalDateTime.now());
            appealRepository.save(appeal);

            Evaluation eval = findEvaluation(appeal.getEvaluationId());
            eval.setStatus(EvaluationStatus.CLOSED);
            evaluationRepository.save(eval);

            notificationService.notifyAppealAutoAgreed(eval);
            log.info("Auto-agreed appeal {} for evaluation {}", appeal.getId(), eval.getId());
        }
    }

    private Evaluation findEvaluation(Long id) {
        return evaluationRepository.findById(id)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
    }
}
```

- [ ] **Step 3: Create AppealController + ReactionController**

`backend/src/main/java/kg/gfh/kpi/controller/ReactionController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/evaluations/{evaluationId}/reaction")
@RequiredArgsConstructor
public class ReactionController {

    private final ReactionService reactionService;
    private final UserRepository userRepository;

    @PostMapping
    public Object react(
            @PathVariable Long evaluationId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        ReactionType type = ReactionType.valueOf(body.get("reaction"));
        String comment = body.get("comment");
        return reactionService.react(evaluationId, userId, type, comment);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

`backend/src/main/java/kg/gfh/kpi/controller/AppealController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AppealService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

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

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/Appeal.java \
        backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/AppealService.java \
        backend/src/main/java/kg/gfh/kpi/controller/ReactionController.java \
        backend/src/main/java/kg/gfh/kpi/controller/AppealController.java
git commit -m "feat(appeal): add AppealService with UPHELD/OVERTURNED/AUTO_AGREED logic and ReactionService"
```
