package kg.gfh.kpi.dto;

import java.time.LocalDateTime;

public record AppealPendingResponse(
    Long id,
    Long evaluationId,
    String evaluateeName,
    String reason,
    LocalDateTime deadline,
    LocalDateTime createdAt
) {}
