package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.DashboardEventResponse;
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
class AnalyticsEventsTest {

    @Mock JdbcTemplate jdbc;
    @Mock UserRepository userRepository;
    @InjectMocks AnalyticsService analyticsService;

    @Test
    void getDashboardEvents_returnsEmptyWhenNoAuditEntries() {
        User user = new User();
        user.setId(5L);
        user.setEmail("test@gfh.kg");

        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class)))
            .thenReturn(List.of());

        List<DashboardEventResponse> result = analyticsService.getDashboardEvents(5L);

        assertThat(result).isEmpty();
    }
}
