package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.EvaluationScore;

import java.math.BigDecimal;

public record ScoreResponse(
    Long criteriaId,
    BigDecimal value,
    String note
) {
    public static ScoreResponse from(EvaluationScore s) {
        return new ScoreResponse(s.getCriteria().getId(), s.getValue(), s.getNote());
    }
}
