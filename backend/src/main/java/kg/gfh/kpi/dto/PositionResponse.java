package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Position;

public record PositionResponse(
    Long id,
    String nameRu,
    String nameKg,
    Long unitId,
    String code,
    Integer displayOrder,
    boolean isActive
) {
    public static PositionResponse from(Position p) {
        return new PositionResponse(p.getId(), p.getNameRu(), p.getNameKg(),
            p.getUnitId(), p.getCode(), p.getDisplayOrder(), p.isActive());
    }
}
