package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CriteriaRepository;
import kg.gfh.kpi.repository.OrgUnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CriteriaServiceTest {

    @Mock CriteriaRepository criteriaRepository;
    @Mock OrgUnitRepository orgUnitRepository;
    @InjectMocks CriteriaService criteriaService;

    @BeforeEach
    void setUp() {
        when(criteriaRepository.sumWeightByTypeAndScope(any(), any(), any()))
            .thenReturn(BigDecimal.ZERO);
    }

    @Test
    void create_positiveWithinLimit_succeeds() {
        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), isNull(), isNull()))
            .thenReturn(BigDecimal.valueOf(60));

        Criteria saved = new Criteria();
        saved.setId(1L);
        saved.setNameRu("Test");
        saved.setNameKg("Test KG");
        saved.setType(CriteriaType.POSITIVE);
        saved.setWeight(BigDecimal.valueOf(30));
        when(criteriaRepository.save(any())).thenReturn(saved);

        var req = new CriteriaRequest("Test", "Test KG", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatCode(() -> criteriaService.create(req)).doesNotThrowAnyException();
    }

    @Test
    void create_positiveExceedsLimit_throwsApiException() {
        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), isNull(), isNull()))
            .thenReturn(BigDecimal.valueOf(80));

        var req = new CriteriaRequest("Test", "Test KG", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatThrownBy(() -> criteriaService.create(req))
            .isInstanceOf(ApiException.class)
            .extracting(e -> ((ApiException) e).getCode())
            .isEqualTo("WEIGHT_SUM_EXCEEDS_100");
    }

    @Test
    void create_antiBonusSkipsWeightValidation_succeeds() {
        Criteria saved = new Criteria();
        saved.setId(2L);
        saved.setNameRu("Anti");
        saved.setNameKg("Anti KG");
        saved.setType(CriteriaType.ANTI_BONUS);
        saved.setWeight(BigDecimal.valueOf(150));
        when(criteriaRepository.save(any())).thenReturn(saved);

        var req = new CriteriaRequest("Anti", "Anti KG", CriteriaType.ANTI_BONUS,
            BigDecimal.valueOf(150), null, false);

        assertThatCode(() -> criteriaService.create(req)).doesNotThrowAnyException();
        verify(criteriaRepository, never()).sumWeightByTypeAndScope(any(), any(), any());
    }

    @Test
    void update_frozenCriteriaChangingWeight_throwsApiException() {
        Criteria frozen = new Criteria();
        frozen.setId(1L);
        frozen.setType(CriteriaType.POSITIVE);
        frozen.setWeight(BigDecimal.valueOf(20));
        frozen.setFrozen(true);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(frozen));

        var req = new CriteriaRequest("X", "X", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatThrownBy(() -> criteriaService.update(1L, req))
            .isInstanceOf(ApiException.class)
            .extracting(e -> ((ApiException) e).getCode())
            .isEqualTo("CRITERIA_FROZEN");
    }

    @Test
    void update_frozenCriteriaSameWeight_succeeds() {
        Criteria frozen = new Criteria();
        frozen.setId(1L);
        frozen.setNameRu("X");
        frozen.setNameKg("X");
        frozen.setType(CriteriaType.POSITIVE);
        frozen.setWeight(BigDecimal.valueOf(20));
        frozen.setFrozen(true);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(frozen));
        when(criteriaRepository.save(any())).thenReturn(frozen);

        var req = new CriteriaRequest("X Updated", "X Updated", CriteriaType.POSITIVE,
            BigDecimal.valueOf(20), null, false);

        assertThatCode(() -> criteriaService.update(1L, req)).doesNotThrowAnyException();
    }

    @Test
    void reactivate_wouldExceedWeight_throwsApiException() {
        Criteria inactive = new Criteria();
        inactive.setId(1L);
        inactive.setType(CriteriaType.POSITIVE);
        inactive.setWeight(BigDecimal.valueOf(40));
        inactive.setActive(false);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(inactive));

        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), any(), isNull()))
            .thenReturn(BigDecimal.valueOf(70));

        assertThatThrownBy(() -> criteriaService.reactivate(1L))
            .isInstanceOf(ApiException.class)
            .extracting(e -> ((ApiException) e).getCode())
            .isEqualTo("WEIGHT_SUM_EXCEEDS_100");
    }
}
