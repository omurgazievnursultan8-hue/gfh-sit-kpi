package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.enums.OrgUnitType;

public record OrgUnitRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @NotNull OrgUnitType type,
    Long parentId,
    Long headUserId
) {}
