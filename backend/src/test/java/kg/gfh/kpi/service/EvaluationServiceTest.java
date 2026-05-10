package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluationServiceTest {

    @Mock EvaluationRepository evaluationRepository;
    @Mock EvaluationPeriodRepository periodRepository;
    @Mock EvaluationScoreRepository scoreRepository;
    @Mock EvaluationScoreHistoryRepository historyRepository;
    @Mock CriteriaRepository criteriaRepository;
    @Mock UserRepository userRepository;
    @Mock EvaluatorResolver evaluatorResolver;
    @Mock RatingService ratingService;
    @Mock ProductionCalendarService calendarService;
    @Mock NotificationService notificationService;

    @InjectMocks EvaluationService evaluationService;

    @Test
    void saveScores_wrongEvaluator_throwsAccessDenied() {
        Evaluation eval = stubEvaluation(1L, 99L, EvaluationStatus.DRAFT);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));

        assertThatThrownBy(() -> evaluationService.saveScores(1L, List.of(), 42L))
            .isInstanceOf(ApiException.class)
            .extracting(t -> ((ApiException) t).getCode())
            .isEqualTo("ACCESS_DENIED");
    }

    @Test
    void submit_alreadySubmitted_throwsNotEditable() {
        Evaluation eval = stubEvaluation(1L, 42L, EvaluationStatus.SUBMITTED);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));

        assertThatThrownBy(() -> evaluationService.submit(1L, 42L))
            .isInstanceOf(ApiException.class)
            .extracting(t -> ((ApiException) t).getCode())
            .isEqualTo("EVALUATION_NOT_EDITABLE");
    }

    @Test
    void submit_noScores_throwsNoScores() {
        Evaluation eval = stubEvaluation(1L, 42L, EvaluationStatus.DRAFT);
        when(evaluationRepository.findById(1L)).thenReturn(Optional.of(eval));
        when(scoreRepository.findByEvaluationId(1L)).thenReturn(List.of());

        assertThatThrownBy(() -> evaluationService.submit(1L, 42L))
            .isInstanceOf(ApiException.class)
            .extracting(t -> ((ApiException) t).getCode())
            .isEqualTo("NO_SCORES");
    }

    private Evaluation stubEvaluation(Long id, Long evaluatorId, EvaluationStatus status) {
        EvaluationPeriod period = new EvaluationPeriod();
        period.setId(1L);
        period.setStartDate(LocalDate.of(2026, 1, 1));
        period.setEndDate(LocalDate.of(2026, 1, 31));

        User evaluatee = new User();
        evaluatee.setId(10L);
        evaluatee.setFullName("Employee");

        User evaluator = new User();
        evaluator.setId(evaluatorId);
        evaluator.setFullName("Evaluator");

        Evaluation eval = new Evaluation();
        eval.setId(id);
        eval.setPeriod(period);
        eval.setEvaluatee(evaluatee);
        eval.setEvaluator(evaluator);
        eval.setStatus(status);
        return eval;
    }
}
