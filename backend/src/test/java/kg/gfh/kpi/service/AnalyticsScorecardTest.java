package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.ScorecardResponse;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsScorecardTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getPersonalScorecard_returnsNullWhenNoEvaluation() {
        User user = new User();
        user.setId(1L);
        user.setFullName("Тест Пользователь");

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(jdbc.query(anyString(), any(RowMapper.class), any()))
            .thenReturn(List.of());

        ScorecardResponse result = analyticsService.getPersonalScorecard(1L);

        assertThat(result).isNull();
    }
}
