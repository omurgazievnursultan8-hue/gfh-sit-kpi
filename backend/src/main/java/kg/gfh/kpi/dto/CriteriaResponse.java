package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CriteriaResponse(
    Long id,
    String nameRu,
    String nameKg,
    CriteriaType type,
    BigDecimal weight,
    Long orgUnitId,
    String orgUnitNameRu,
    String orgUnitNameKg,
    boolean autoCalculated,
    boolean frozen,
    boolean active,
    LocalDateTime createdAt
) {
    public static CriteriaResponse from(Criteria c) {
        return new CriteriaResponse(
            c.getId(), c.getNameRu(), c.getNameKg(), c.getType(), c.getWeight(),
            c.getOrgUnit() != null ? c.getOrgUnit().getId() : null,
            c.getOrgUnit() != null ? c.getOrgUnit().getNameRu() : null,
            c.getOrgUnit() != null ? c.getOrgUnit().getNameKg() : null,
            c.isAutoCalculated(), c.isFrozen(), c.isActive(), c.getCreatedAt()
        );
    }
}
