package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.EvaluationPeriod;
import org.springframework.stereotype.Service;

/**
 * Stub — real implementation added in M3-BE-06 (WebSocket STOMP).
 */
@Service
public class NotificationService {

    public void notifyPeriodActivated(EvaluationPeriod period) {}

    public void notifyEvaluationSubmitted(Evaluation evaluation) {}
}
