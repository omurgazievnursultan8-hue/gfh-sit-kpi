package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.ProductionCalendarRequest;
import kg.gfh.kpi.dto.ProductionCalendarResponse;
import kg.gfh.kpi.entity.ProductionCalendar;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.ProductionCalendarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionCalendarService {

    private final ProductionCalendarRepository repo;

    public List<ProductionCalendarResponse> findAll() {
        return repo.findAll(Sort.by("year", "month")).stream()
            .map(ProductionCalendarResponse::from)
            .toList();
    }

    @Cacheable(value = "productionCalendar", key = "#yearMonth.toString()")
    public int getWorkingDays(YearMonth yearMonth) {
        return repo.findByYearAndMonth(yearMonth.getYear(), yearMonth.getMonthValue())
            .map(ProductionCalendar::getWorkingDays)
            .orElseThrow(() -> new ApiException("CALENDAR_NOT_FOUND",
                "Производственный календарь не настроен для " + yearMonth,
                "Өндүрүштүк календарь " + yearMonth + " үчүн орнотулган жок"));
    }

    @Transactional
    @CacheEvict(value = "productionCalendar", allEntries = true)
    public ProductionCalendarResponse upsert(ProductionCalendarRequest req, Long actorId) {
        ProductionCalendar cal = repo.findByYearAndMonth(req.year(), req.month())
            .orElseGet(ProductionCalendar::new);
        cal.setYear(req.year());
        cal.setMonth(req.month());
        cal.setWorkingDays(req.workingDays());
        cal.setCreatedBy(actorId);
        return ProductionCalendarResponse.from(repo.save(cal));
    }
}
