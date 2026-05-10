package kg.gfh.kpi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutoAntiBonusServiceTest {

    @Mock ProductionCalendarService calendarService;
    @InjectMocks AutoAntiBonusService service;

    private final YearMonth JAN_2026 = YearMonth.of(2026, 1);

    @Test
    void compute_absenceDaysPartial() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        // 2 days absent out of 22 working days = 9.09%
        BigDecimal result = service.computeAutoValue(2, JAN_2026);
        assertThat(result).isEqualByComparingTo("9.09");
    }

    @Test
    void compute_noAbsence_returnsZero() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        assertThat(service.computeAutoValue(0, JAN_2026)).isEqualByComparingTo("0.00");
    }

    @Test
    void compute_fullAbsence_cappedAt100() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        // Even 30 absence days out of 22 working days is capped at 100
        assertThat(service.computeAutoValue(30, JAN_2026)).isEqualByComparingTo("100.00");
    }

    @Test
    void compute_zeroWorkingDays_returnsZero() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(0);
        assertThat(service.computeAutoValue(5, JAN_2026)).isEqualByComparingTo("0.00");
    }
}
