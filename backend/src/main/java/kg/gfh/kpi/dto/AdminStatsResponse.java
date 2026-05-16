package kg.gfh.kpi.dto;

public record AdminStatsResponse(
    long totalUsers,
    long activeUsers,
    long activeEvaluationPeriods,
    long pendingEvaluations,
    long totalEvaluations,
    long openAppeals,
    long auditLogsLast24h,
    long criteriaActive,
    long delegationsActive,
    long delegationsExpiringSoon,
    long orgUnitsCount
) {}
