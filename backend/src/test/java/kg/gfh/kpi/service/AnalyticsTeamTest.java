package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.TeamResponse;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsTeamTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getTeamAttention_returnsEmptyWhenNoDirectReports() {
        when(jdbc.queryForList(anyString(), eq(42L))).thenReturn(List.of());

        TeamResponse result = analyticsService.getTeamAttention(42L);

        assertThat(result.attention()).isEmpty();
        assertThat(result.bestPerformer()).isNull();
        assertThat(result.totalCount()).isEqualTo(0);
    }
}
