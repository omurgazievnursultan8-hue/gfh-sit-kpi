package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import org.springframework.stereotype.Service;

/**
 * Stub — real implementation added in M3-BE-06 (WebSocket STOMP).
 */
@Service
public class NotificationService {

    public void notifyPeriodActivated(EvaluationPeriod period) {}

    public void notifyEvaluationSubmitted(Evaluation evaluation) {}

    public void notifyReactionSubmitted(Evaluation evaluation, ReactionType reactionType) {}

    public void notifyAppealFiled(Evaluation evaluation, Appeal appeal) {}

    public void notifyAppealUpheld(Evaluation evaluation) {}

    public void notifyAppealOverturned(Evaluation evaluation) {}

    public void notifyAppealAutoAgreed(Evaluation evaluation) {}

    public void sendDeadlineReminders(EvaluationPeriod period) {}
}
