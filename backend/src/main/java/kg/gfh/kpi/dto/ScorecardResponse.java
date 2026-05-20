package kg.gfh.kpi.dto;

import java.util.List;

public record ScorecardResponse(
    Long periodId,
    String periodLabel,
    double totalScore,
    String grade,
    double vsGoal,
    Double vsPrevPeriod,
    String prevPeriodLabel,
    Integer rank,
    double antiBonusTotal,
    List<CriteriaScoreDto> criteria,
    List<CriteriaScoreDto> antiBonuses,
    String formula,
    double positiveSum,
    double antiBonusSum,
    String evaluatorName,
    String evaluatorUnit,
    String evaluatorPosition
) {
    public record CriteriaScoreDto(
        Long criteriaId,
        String nameRu,
        String nameKg,
        double weight,
        double score,
        double maxScore,
        Double delta,
        String levelLabel
    ) {}
}
