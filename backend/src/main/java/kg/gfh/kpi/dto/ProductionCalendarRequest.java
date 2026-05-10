package kg.gfh.kpi.dto;

import jakarta.validation.constraints.*;

public record ProductionCalendarRequest(
    @NotNull @Min(2020) @Max(2100) Integer year,
    @NotNull @Min(1) @Max(12) Integer month,
    @NotNull @Min(0) @Max(31) Integer workingDays
) {}
