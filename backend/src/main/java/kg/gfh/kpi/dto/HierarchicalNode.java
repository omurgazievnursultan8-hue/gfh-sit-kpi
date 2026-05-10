package kg.gfh.kpi.dto;

import java.math.BigDecimal;
import java.util.List;

public record HierarchicalNode(
    Long orgUnitId,
    String orgUnitNameRu,
    String orgUnitNameKg,
    String type,
    BigDecimal avgScore,
    BigDecimal minScore,
    BigDecimal maxScore,
    Integer employeeCount,
    Integer submittedCount,
    List<HierarchicalNode> children
) {}
