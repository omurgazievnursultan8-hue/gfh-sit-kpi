package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kg.gfh.kpi.entity.CalendarDay;

import java.time.LocalDate;

public record CalendarDayRequest(
    @NotNull LocalDate day,
    @NotNull CalendarDay.DayType dayType,
    @Size(max = 255) String descriptionRu,
    @Size(max = 255) String descriptionKg
) {}
