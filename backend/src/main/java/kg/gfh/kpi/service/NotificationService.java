package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.*;
import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EvaluationRepository evaluationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void notifyPeriodActivated(EvaluationPeriod period) {
        List<Evaluation> evals = evaluationRepository.findByPeriodIdAndStatus(
            period.getId(), Evaluation.EvaluationStatus.DRAFT);
        for (Evaluation eval : evals) {
            push(eval.getEvaluator().getId(), "NEW_EVALUATION",
                "Новая оценка для заполнения",
                "Жаңы баалоо толтурулсун",
                "Необходимо оценить: " + eval.getEvaluatee().getFullName(),
                "Баалоо зарыл: " + eval.getEvaluatee().getFullName(),
                "EVALUATION", eval.getId());
        }
    }

    @Transactional
    public void notifyEvaluationSubmitted(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "EVALUATION_SUBMITTED",
            "Ваша оценка выставлена",
            "Сиздин баалооңуз коюлду",
            "Оценщик: " + eval.getEvaluator().getFullName() + ". Итог: " + eval.getFinalScore(),
            "Баалоочу: " + eval.getEvaluator().getFullName() + ". Жыйынтык: " + eval.getFinalScore(),
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyReactionSubmitted(Evaluation eval, ReactionType reaction) {
        push(eval.getEvaluator().getId(), "REACTION_SUBMITTED",
            "Сотрудник оставил реакцию",
            "Кызматкер реакция калтырды",
            eval.getEvaluatee().getFullName() + ": " + reaction.name(),
            eval.getEvaluatee().getFullName() + ": " + reaction.name(),
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealFiled(Evaluation eval, Appeal appeal) {
        push(eval.getEvaluator().getId(), "APPEAL_FILED",
            "Подана апелляция",
            "Апелляция берилди",
            "Сотрудник " + eval.getEvaluatee().getFullName() + " подал апелляцию",
            "Кызматкер " + eval.getEvaluatee().getFullName() + " апелляция берди",
            "APPEAL", appeal.getId());
    }

    @Transactional
    public void notifyAppealOverturned(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_OVERTURNED",
            "Апелляция удовлетворена",
            "Апелляция канааттандырылды",
            "Ваша оценка будет пересмотрена",
            "Сиздин баалооңуз кайра каралат",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealUpheld(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_UPHELD",
            "Апелляция отклонена",
            "Апелляция четке кагылды",
            "Оценщик подтвердил результат",
            "Баалоочу жыйынтыкты ырастады",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealAutoAgreed(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_AUTO_AGREED",
            "Апелляция закрыта автоматически",
            "Апелляция автоматтык жабылды",
            "Оценщик не ответил в срок — оценка подтверждена",
            "Баалоочу мөөнөтүндө жооп бербеди — баалоо ырасталды",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void sendDeadlineReminders(EvaluationPeriod period) {
        List<Evaluation> drafts = evaluationRepository.findByPeriodIdAndStatus(
            period.getId(), Evaluation.EvaluationStatus.DRAFT);
        for (Evaluation eval : drafts) {
            push(eval.getEvaluator().getId(), "REMINDER",
                "Напоминание о сроке оценки",
                "Баалоо мөөнөтү жөнүндө эскертүү",
                "Срок: " + period.getSubmissionDeadline(),
                "Мөөнөт: " + period.getSubmissionDeadline(),
                "PERIOD", period.getId());
        }
    }

    private void push(Long userId, String type,
                      String titleRu, String titleKg,
                      String bodyRu, String bodyKg,
                      String entityType, Long entityId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitleRu(titleRu);
        n.setTitleKg(titleKg);
        n.setBodyRu(bodyRu);
        n.setBodyKg(bodyKg);
        n.setEntityType(entityType);
        n.setEntityId(entityId);
        notificationRepository.save(n);

        try {
            messagingTemplate.convertAndSendToUser(
                userId.toString(), "/queue/notifications", n);
        } catch (Exception e) {
            log.warn("WebSocket push failed for user {}: {}", userId, e.getMessage());
        }
    }
}
