package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import kg.gfh.kpi.enums.OrgUnitType;

public record OrgUnitRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @NotNull OrgUnitType type,
    Long parentId,
    Long headUserId,
    @Size(max = 32) String code,
    @Size(max = 64) String nameRuShort,
    @Size(max = 64) String nameKgShort,
    Integer displayOrder
) {}
