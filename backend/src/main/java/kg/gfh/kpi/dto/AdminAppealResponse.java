package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record AdminAppealResponse(
    Long id,
    Long evaluationId,
    Long periodId,
    PeriodType periodType,
    LocalDate periodStartDate,
    LocalDate periodEndDate,
    Long evaluateeId,
    String evaluateeName,
    Long evaluatorId,
    String evaluatorName,
    String reason,
    AppealStatus status,
    String response,
    Long respondedById,
    String respondedByName,
    BigDecimal finalScore,
    LocalDateTime deadline,
    LocalDateTime createdAt,
    LocalDateTime resolvedAt
) {}
