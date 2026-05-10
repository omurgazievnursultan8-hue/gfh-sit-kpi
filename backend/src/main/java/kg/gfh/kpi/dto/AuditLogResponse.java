package kg.gfh.kpi.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
    Long id,
    Long actorId,
    String actorEmail,
    String action,
    String entityType,
    Long entityId,
    String details,
    String ipAddress,
    LocalDateTime createdAt
) {}
