package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PositionRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @NotNull Long unitId,
    @Size(max = 32) String code,
    Integer displayOrder,
    Boolean isActive
) {}
