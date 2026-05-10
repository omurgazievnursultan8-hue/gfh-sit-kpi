package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodType;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EvaluationPeriodRequest(
    @NotNull PeriodType type,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    @NotNull LocalDateTime submissionDeadline
) {}
