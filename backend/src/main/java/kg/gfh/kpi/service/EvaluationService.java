package kg.gfh.kpi.service;

import kg.gfh.kpi.annotation.Audited;
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

    public EvaluationPeriod findCurrentPeriod() {
        var list = periodRepository.findByStatus(EvaluationPeriod.PeriodStatus.ACTIVE);
        return list.isEmpty() ? null : list.get(0);
    }

    public List<EvaluationPeriod> listAllPeriods() {
        return periodRepository.findAllByOrderByCreatedAtDesc(org.springframework.data.domain.Pageable.unpaged()).getContent();
    }

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

    @Audited(action = "ACTIVATE_PERIOD", entityType = "EVALUATION_PERIOD")
    @Transactional
    public EvaluationPeriod activatePeriod(Long periodId) {
        EvaluationPeriod period = findPeriodById(periodId);
        if (period.getStatus() != PeriodStatus.DRAFT) {
            throw new ApiException("PERIOD_NOT_DRAFT", "Период не в статусе DRAFT",
                "Мезгил DRAFT статусунда эмес");
        }
        period.setStatus(PeriodStatus.ACTIVE);
        periodRepository.save(period);

        List<User> employees = userRepository.findByIsActiveTrue();
        for (User employee : employees) {
            Long evaluatorId = evaluatorResolver.resolve(employee.getId(), period.getStartDate());
            if (evaluatorId == null) {
                log.warn("No evaluator resolved for employee {} in period {}", employee.getId(), periodId);
                continue;
            }
            User evaluator = userRepository.findById(evaluatorId).orElse(null);
            if (evaluator == null) continue;

            Evaluation eval = new Evaluation();
            eval.setPeriod(period);
            eval.setEvaluatee(employee);
            eval.setEvaluator(evaluator);
            evaluationRepository.save(eval);
        }

        notificationService.notifyPeriodActivated(period);
        return period;
    }

    @Audited(action = "CLOSE_PERIOD", entityType = "EVALUATION_PERIOD")
    @Transactional
    public EvaluationPeriod closePeriod(Long periodId) {
        EvaluationPeriod period = findPeriodById(periodId);
        if (period.getStatus() != PeriodStatus.ACTIVE) {
            throw new ApiException("PERIOD_NOT_ACTIVE", "Период не активен", "Мезгил активдүү эмес");
        }
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
        findById(evaluationId);

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

        return positiveSum.subtract(antiBonusSum).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    // ── Submission ───────────────────────────────────────────────────────────

    @Audited(action = "SUBMIT_EVALUATION", entityType = "EVALUATION")
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

        YearMonth ym = YearMonth.of(
            eval.getPeriod().getStartDate().getYear(),
            eval.getPeriod().getStartDate().getMonth());
        int workingDays = calendarService.getWorkingDays(ym);

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

    // ── Helpers ──────────────────────────────────────────────────────────────

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
