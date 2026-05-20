package kg.gfh.kpi.service;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.dto.AppealSummaryResponse;
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

    private Evaluation findEvaluation(Long id) {
        return evaluationRepository.findById(id)
            .orElseThrow(() -> new ApiException("EVALUATION_NOT_FOUND",
                "Оценка не найдена", "Баалоо табылган жок"));
    }
}
