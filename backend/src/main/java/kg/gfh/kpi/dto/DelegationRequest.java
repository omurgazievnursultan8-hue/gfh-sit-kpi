package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DelegationRequest(
    @NotNull Long evaluateeId,
    @NotNull Long delegatedToId,
    @NotNull LocalDate validFrom,
    @NotNull LocalDate validTo,
    String reason
) {}
