package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ScoreRequest(
    @NotNull Long criteriaId,
    @NotNull BigDecimal value,
    String note
) {}
