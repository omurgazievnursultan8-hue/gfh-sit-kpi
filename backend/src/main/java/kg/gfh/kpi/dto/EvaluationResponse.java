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
