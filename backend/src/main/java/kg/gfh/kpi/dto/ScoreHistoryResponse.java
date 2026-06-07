package kg.gfh.kpi.dto;

import java.math.BigDecimal;

public record ScoreHistoryResponse(
    Long criteriaId,
    String nameRu,
    String nameKg,
    String type,
    BigDecimal rawValue,
    BigDecimal weightedValue,
    BigDecimal weightSnapshot
) {}
