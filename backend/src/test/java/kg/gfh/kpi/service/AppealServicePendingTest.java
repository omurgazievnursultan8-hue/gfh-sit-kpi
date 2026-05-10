package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppealServicePendingTest {

    @Mock AppealRepository appealRepository;
    @Mock EvaluationRepository evaluationRepository;
    @Mock SystemSettingService settingService;
    @Mock NotificationService notificationService;
    @InjectMocks AppealService appealService;

    @Test
    void getPendingAppealsForEvaluator_returnsMappedDtos() {
        Long evaluatorId = 10L;
        LocalDateTime deadline = LocalDateTime.of(2026, 5, 20, 0, 0);
        LocalDateTime createdAt = LocalDateTime.of(2026, 5, 1, 9, 0);

        Appeal appeal = new Appeal();
        appeal.setId(1L);
        appeal.setEvaluationId(42L);
        appeal.setReason("Несогласен с оценкой");
        appeal.setDeadline(deadline);
        appeal.setCreatedAt(createdAt);

        User evaluatee = new User();
        evaluatee.setFullName("Айтурган Касымалиев");

        Evaluation eval = new Evaluation();
        eval.setId(42L);
        eval.setEvaluatee(evaluatee);

        when(appealRepository.findPendingByEvaluatorId(evaluatorId)).thenReturn(List.of(appeal));
        when(evaluationRepository.findById(42L)).thenReturn(Optional.of(eval));

        List<AppealPendingResponse> result = appealService.getPendingAppealsForEvaluator(evaluatorId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).id()).isEqualTo(1L);
        assertThat(result.get(0).evaluateeName()).isEqualTo("Айтурган Касымалиев");
        assertThat(result.get(0).deadline()).isEqualTo(deadline);
    }

    @Test
    void getPendingAppealsForEvaluator_emptyWhenNone() {
        when(appealRepository.findPendingByEvaluatorId(99L)).thenReturn(List.of());

        List<AppealPendingResponse> result = appealService.getPendingAppealsForEvaluator(99L);

        assertThat(result).isEmpty();
    }
}
