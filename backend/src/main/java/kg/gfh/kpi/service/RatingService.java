package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.RatingFormula;
import kg.gfh.kpi.repository.EvaluationScoreHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RatingService {

    private final SystemSettingService settingService;
    private final EvaluationScoreHistoryRepository scoreHistoryRepository;

    /**
     * Computes final rating for a given evaluation from its score history rows.
     * Returns MAX(0, computed) enforced by all formulas.
     */
    public BigDecimal computeRating(Long evaluationId, int workingDaysInMonth) {
        RatingFormula formula = resolveFormula();

        BigDecimal positiveSum = scoreHistoryRepository
            .sumWeightedValueByEvaluationAndType(evaluationId, CriteriaType.POSITIVE);
        BigDecimal antiBonusSum = scoreHistoryRepository
            .sumWeightedValueByEvaluationAndType(evaluationId, CriteriaType.ANTI_BONUS);
        BigDecimal antiBonusWeightSum = scoreHistoryRepository
            .sumWeightSnapshotByEvaluationAndType(evaluationId, CriteriaType.ANTI_BONUS);
        long antiBonusIncidents = scoreHistoryRepository
            .countByEvaluationIdAndCriteriaType(evaluationId, CriteriaType.ANTI_BONUS);

        if (positiveSum == null) positiveSum = BigDecimal.ZERO;
        if (antiBonusSum == null) antiBonusSum = BigDecimal.ZERO;
        if (antiBonusWeightSum == null) antiBonusWeightSum = BigDecimal.ZERO;

        BigDecimal result = switch (formula) {
            case FORMULA_1 -> positiveSum.subtract(antiBonusSum);
            case FORMULA_2 -> {
                BigDecimal factor = BigDecimal.ONE.subtract(
                    antiBonusSum.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                yield positiveSum.multiply(factor);
            }
            case FORMULA_3 -> {
                BigDecimal dailyPenalty = workingDaysInMonth > 0
                    ? antiBonusWeightSum.divide(BigDecimal.valueOf(workingDaysInMonth), 4, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
                yield positiveSum.subtract(BigDecimal.valueOf(antiBonusIncidents).multiply(dailyPenalty));
            }
            case FORMULA_4 -> {
                BigDecimal raw = positiveSum.subtract(antiBonusSum);
                if (positiveSum.compareTo(BigDecimal.ZERO) == 0) yield BigDecimal.ZERO;
                yield raw.max(BigDecimal.ZERO)
                    .divide(positiveSum, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            }
        };

        // All formulas enforce MAX(0, result)
        return result.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * When a criteria's weight changes, recalculate all open evaluations that reference it.
     * Actual recalculation delegated to EvaluationService in M3.
     */
    @Transactional
    public void recalculateAffected(Long criteriaId) {
        List<Long> evaluationIds = scoreHistoryRepository.findEvaluationIdsByCriteriaId(criteriaId);
        log.info("recalculateAffected: criteria={}, affected evaluations={}", criteriaId, evaluationIds.size());
    }

    private RatingFormula resolveFormula() {
        String key = settingService.getValueOrDefault("rating_formula", "FORMULA_1");
        try {
            return RatingFormula.valueOf(key);
        } catch (IllegalArgumentException e) {
            log.warn("Unknown rating_formula setting '{}', defaulting to FORMULA_1", key);
            return RatingFormula.FORMULA_1;
        }
    }
}
