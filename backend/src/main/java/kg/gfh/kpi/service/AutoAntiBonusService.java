package kg.gfh.kpi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;

/**
 * Computes raw values for auto-calculated anti-bonus criteria.
 *
 * Formula: (absenceDays / workingDaysInMonth) * 100
 * Result is absence as percentage of working time, capped at 100.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutoAntiBonusService {

    private final ProductionCalendarService calendarService;

    @Cacheable(value = "autoAntiBonusRate", key = "#yearMonth.toString() + '_' + #absenceDays")
    public BigDecimal computeAutoValue(int absenceDays, YearMonth yearMonth) {
        int workingDays = calendarService.getWorkingDays(yearMonth);

        if (workingDays == 0) {
            log.warn("Working days is 0 for {}, returning 0 anti-bonus", yearMonth);
            return BigDecimal.ZERO;
        }

        BigDecimal rate = BigDecimal.valueOf(absenceDays)
            .divide(BigDecimal.valueOf(workingDays), 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));

        return rate.min(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }
}
