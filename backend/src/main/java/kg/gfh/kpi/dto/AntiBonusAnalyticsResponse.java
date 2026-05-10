package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

public record AntiBonusAnalyticsResponse(
    List<TopEmployee> top10,
    List<DistributionBucket> distribution,
    List<PeriodDynamics> dynamics
) {
    public record TopEmployee(
        Long userId,
        String fullName,
        String orgUnitName,
        Long incidentCount,
        BigDecimal totalDeduction
    ) {}

    public record DistributionBucket(
        String label,
        Integer rangeFrom,
        Integer rangeTo,
        Long employeeCount
    ) {}

    public record PeriodDynamics(
        Long periodId,
        String periodStart,
        String criteriaNameRu,
        BigDecimal avgRawValue,
        Long incidentCount
    ) {}
}
