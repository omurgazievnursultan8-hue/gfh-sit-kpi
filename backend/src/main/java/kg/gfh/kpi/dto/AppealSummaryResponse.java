package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Appeal.AppealStatus;

import java.time.LocalDateTime;

public record AppealSummaryResponse(
    Long id,
    Long evaluationId,
    String evaluateeName,
    String reason,
    AppealStatus status,
    LocalDateTime deadline,
    LocalDateTime createdAt,
    LocalDateTime resolvedAt
) {}
