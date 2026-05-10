package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.ProductionCalendar;

public record ProductionCalendarResponse(Long id, Integer year, Integer month, Integer workingDays) {
    public static ProductionCalendarResponse from(ProductionCalendar c) {
        return new ProductionCalendarResponse(c.getId(), c.getYear(), c.getMonth(), c.getWorkingDays());
    }
}
