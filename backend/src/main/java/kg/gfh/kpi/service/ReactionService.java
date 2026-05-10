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
