package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.CalendarDay;

import java.time.LocalDate;

public record CalendarDayResponse(
    Long id,
    LocalDate day,
    CalendarDay.DayType dayType,
    String descriptionRu,
    String descriptionKg
) {
    public static CalendarDayResponse from(CalendarDay d) {
        return new CalendarDayResponse(
            d.getId(), d.getDay(), d.getDayType(),
            d.getDescriptionRu(), d.getDescriptionKg());
    }
}
