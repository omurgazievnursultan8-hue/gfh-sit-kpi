package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

public record PersonalAnalyticsResponse(
    Long userId,
    String fullName,
    List<PeriodScore> history,
    BigDecimal currentScore,
    BigDecimal departmentAvg,
    BigDecimal companyAvg
) {
    public record PeriodScore(
        Long periodId,
        String periodType,
        String startDate,
        String endDate,
        BigDecimal score,
        BigDecimal departmentAvg
    ) {}
}
