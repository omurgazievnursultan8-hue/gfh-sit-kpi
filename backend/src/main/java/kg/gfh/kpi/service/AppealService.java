package kg.gfh.kpi.service;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.dto.AdminAppealResponse;
import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.dto.AppealSummaryResponse;
import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.EvaluationScoreRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppealService {

    private final AppealRepository appealRepository;
    private final EvaluationRepository evaluationRepository;
    private final EvaluationScoreRepository scoreRepository;
    private final UserRepository userRepository;
    private final SystemSettingService settingService;
    private final NotificationService notificationService;

    @Audited(action = "FILE_APPEAL", entityType = "EVALUATION")
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

    @Audited(action = "RESPOND_APPEAL", entityType = "APPEAL")
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

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public List<AppealSummaryResponse> getAppealsForEvaluator(Long evaluatorId) {
        return appealRepository.findByEvaluatorId(evaluatorId).stream()
            .map(a -> {
                Evaluation eval = findEvaluation(a.getEvaluationId());
                return new AppealSummaryResponse(
                    a.getId(),
                    a.getEvaluationId(),
                    eval.getEvaluatee().getFullName(),
                    a.getReason(),
                    a.getStatus(),
                    a.getDeadline(),
                    a.getCreatedAt(),
                    a.getResolvedAt()
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public Page<AdminAppealResponse> listForAdmin(
        Long periodId, Long evaluateeId, Long evaluatorId, Long respondedById,
        AppealStatus status, String q, LocalDateTime from, LocalDateTime to,
        Pageable pageable
    ) {
        Specification<Appeal> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (respondedById != null) ps.add(cb.equal(root.get("respondedBy"), respondedById));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));

            boolean needsEvalJoin = periodId != null || evaluateeId != null
                || evaluatorId != null || (q != null && !q.isBlank());
            if (needsEvalJoin) {
                Subquery<Long> sq = query.subquery(Long.class);
                Root<Evaluation> e = sq.from(Evaluation.class);
                sq.select(e.get("id"));
                List<Predicate> ep = new ArrayList<>();
                if (periodId != null) ep.add(cb.equal(e.get("period").get("id"), periodId));
                if (evaluateeId != null) ep.add(cb.equal(e.get("evaluatee").get("id"), evaluateeId));
                if (evaluatorId != null) ep.add(cb.equal(e.get("evaluator").get("id"), evaluatorId));
                if (q != null && !q.isBlank()) {
                    String like = "%" + q.toLowerCase() + "%";
                    ep.add(cb.or(
                        cb.like(cb.lower(e.get("evaluatee").get("fullName")), like),
                        cb.like(cb.lower(e.get("evaluator").get("fullName")), like)
                    ));
                }
                sq.where(cb.and(ep.toArray(new Predicate[0])));
                ps.add(root.get("evaluationId").in(sq));
            }
            return ps.isEmpty() ? cb.conjunction() : cb.and(ps.toArray(new Predicate[0]));
        };
        return appealRepository.findAll(spec, pageable).map(this::toAdminResponse);
    }

    private AdminAppealResponse toAdminResponse(Appeal a) {
        Evaluation eval = findEvaluation(a.getEvaluationId());
        String respondedByName = null;
        if (a.getRespondedBy() != null) {
            respondedByName = userRepository.findById(a.getRespondedBy())
                .map(User::getFullName).orElse(null);
        }
        return new AdminAppealResponse(
            a.getId(),
            a.getEvaluationId(),
            eval.getPeriod() != null ? eval.getPeriod().getId() : null,
            eval.getPeriod() != null ? eval.getPeriod().getType() : null,
            eval.getPeriod() != null ? eval.getPeriod().getStartDate() : null,
            eval.getPeriod() != null ? eval.getPeriod().getEndDate() : null,
            eval.getEvaluatee().getId(),
            eval.getEvaluatee().getFullName(),
            eval.getEvaluator() != null ? eval.getEvaluator().getId() : null,
            eval.getEvaluator() != null ? eval.getEvaluator().getFullName() : null,
            a.getReason(),
            a.getStatus(),
            a.getResponse(),
            a.getRespondedBy(),
            respondedByName,
            eval.getFinalScore(),
            a.getDeadline(),
            a.getCreatedAt(),
            a.getResolvedAt()
        );
    }

    private Evaluation findEvaluation(Long id) {
        return evaluationRepository.findById(id)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
    }
}
