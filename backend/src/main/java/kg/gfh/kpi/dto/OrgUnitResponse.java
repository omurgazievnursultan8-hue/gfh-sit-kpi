package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;

import java.time.LocalDateTime;
import java.util.List;

public record OrgUnitResponse(
    Long id,
    String nameRu,
    String nameKg,
    OrgUnitType type,
    Long parentId,
    Long headUserId,
    String code,
    String nameRuShort,
    String nameKgShort,
    Integer displayOrder,
    LocalDateTime archivedAt,
    Integer headcountDirect,
    Integer headcountTotal,
    List<OrgUnitResponse> children
) {
    public static OrgUnitResponse from(OrgUnit u) {
        return new OrgUnitResponse(u.getId(), u.getNameRu(), u.getNameKg(),
            u.getType(), u.getParentId(), u.getHeadUserId(),
            u.getCode(), u.getNameRuShort(), u.getNameKgShort(),
            u.getDisplayOrder(), u.getArchivedAt(), 0, 0, List.of());
    }
}
