package kg.gfh.kpi.dto;

import jakarta.validation.constraints.*;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;

public record CriteriaRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @Size(max = 4000) String descriptionRu,
    @Size(max = 4000) String descriptionKg,
    @NotNull CriteriaType type,
    @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal weight,
    Long orgUnitId,
    boolean autoCalculated
) {}
