package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.repository.EvaluationScoreHistoryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RatingServiceTest {

    @Mock SystemSettingService settingService;
    @Mock EvaluationScoreHistoryRepository scoreHistoryRepository;
    @InjectMocks RatingService ratingService;

    private void setupScores(long evalId, double positive, double antiBonus, double antiBonusWeightSum, long incidents) {
        when(scoreHistoryRepository.sumWeightedValueByEvaluationAndType(evalId, CriteriaType.POSITIVE))
            .thenReturn(BigDecimal.valueOf(positive));
        when(scoreHistoryRepository.sumWeightedValueByEvaluationAndType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(BigDecimal.valueOf(antiBonus));
        when(scoreHistoryRepository.sumWeightSnapshotByEvaluationAndType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(BigDecimal.valueOf(antiBonusWeightSum));
        when(scoreHistoryRepository.countByEvaluationIdAndCriteriaType(evalId, CriteriaType.ANTI_BONUS))
            .thenReturn(incidents);
    }

    @Test
    void formula1_directDeduction() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_1");
        setupScores(1L, 80.0, 10.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("70.00");
    }

    @Test
    void formula2_proportionalReduction() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_2");
        // P=80, A=20 → 80 * (1 - 20/100) = 80 * 0.8 = 64
        setupScores(1L, 80.0, 20.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("64.00");
    }

    @Test
    void formula3_incidentBasedPenalty() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_3");
        // P=80, incidents=2, antiWeightSum=22, workingDays=22
        // dailyPenalty = 22/22 = 1.0; penalty = 2 * 1.0 = 2.0; result = 78.0
        setupScores(1L, 80.0, 0.0, 22.0, 2);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("78.00");
    }

    @Test
    void formula4_efficiencyPercentage() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_4");
        // P=80, A=20 → MAX(0, 80-20)/80 * 100 = 60/80*100 = 75.0%
        setupScores(1L, 80.0, 20.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("75.00");
    }

    @Test
    void anyFormula_resultNeverBelowZero() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("FORMULA_1");
        // P=10, A=50 → -40, clamped to 0
        setupScores(1L, 10.0, 50.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("0.00");
    }

    @Test
    void unknownFormula_defaultsToFormula1() {
        when(settingService.getValueOrDefault("rating_formula", "FORMULA_1")).thenReturn("INVALID");
        setupScores(1L, 80.0, 10.0, 0.0, 0);

        BigDecimal result = ratingService.computeRating(1L, 22);
        assertThat(result).isEqualByComparingTo("70.00");
    }
}
