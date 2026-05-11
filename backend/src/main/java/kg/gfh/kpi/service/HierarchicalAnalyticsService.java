package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.HierarchicalNode;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HierarchicalAnalyticsService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = "hierarchicalAnalytics",
        key = "#orgUnitId + '_' + #periodType + '_' + #startDate + '_' + #endDate")
    public List<HierarchicalNode> aggregate(Long orgUnitId, String periodType,
                                             String startDate, String endDate) {
        List<Map<String, Object>> units = jdbc.queryForList(
            "SELECT id, name_ru, name_kg, type, parent_id FROM org_units ORDER BY id");

        List<Object> params = new ArrayList<>();
        params.add(periodType);
        String dateFilter = "";
        if (startDate != null && endDate != null) {
            dateFilter = "AND ep.start_date >= ?::date AND ep.end_date <= ?::date";
            params.add(startDate);
            params.add(endDate);
        }

        String sql = """
            SELECT u.unit_id AS org_unit_id,
                   COUNT(DISTINCT u.id) as employee_count,
                   COUNT(e.id) FILTER (WHERE e.final_score IS NOT NULL) as submitted_count,
                   AVG(e.final_score) as avg_score,
                   MIN(e.final_score) as min_score,
                   MAX(e.final_score) as max_score
            FROM users u
            LEFT JOIN evaluations e ON e.evaluatee_id = u.id
            LEFT JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            """ + dateFilter + """

            WHERE u.is_active = true AND u.unit_id IS NOT NULL
            GROUP BY u.unit_id
            """;

        List<Map<String, Object>> scores = jdbc.queryForList(sql, params.toArray());
        Map<Long, Map<String, Object>> scoreMap = scores.stream()
            .collect(Collectors.toMap(
                r -> ((Number) r.get("org_unit_id")).longValue(),
                r -> r
            ));

        Map<Long, ArrayList<HierarchicalNode>> childrenMap = units.stream()
            .collect(Collectors.toMap(
                u -> ((Number) u.get("id")).longValue(),
                u -> new ArrayList<>()
            ));

        Map<Long, HierarchicalNode> nodeMap = units.stream().collect(
            Collectors.toMap(
                u -> ((Number) u.get("id")).longValue(),
                u -> {
                    Long unitId = ((Number) u.get("id")).longValue();
                    Map<String, Object> s = scoreMap.getOrDefault(unitId, Map.of());
                    return new HierarchicalNode(
                        unitId,
                        (String) u.get("name_ru"),
                        (String) u.get("name_kg"),
                        (String) u.get("type"),
                        s.isEmpty() ? null : (BigDecimal) s.get("avg_score"),
                        s.isEmpty() ? null : (BigDecimal) s.get("min_score"),
                        s.isEmpty() ? null : (BigDecimal) s.get("max_score"),
                        s.isEmpty() ? 0 : ((Number) s.get("employee_count")).intValue(),
                        s.isEmpty() ? 0 : ((Number) s.get("submitted_count")).intValue(),
                        childrenMap.get(unitId)
                    );
                }
            )
        );

        List<HierarchicalNode> roots = new ArrayList<>();
        for (Map<String, Object> unit : units) {
            Long id = ((Number) unit.get("id")).longValue();
            Object parentId = unit.get("parent_id");
            if (parentId == null) {
                roots.add(nodeMap.get(id));
            } else {
                ArrayList<HierarchicalNode> siblings = childrenMap.get(((Number) parentId).longValue());
                if (siblings != null) siblings.add(nodeMap.get(id));
            }
        }

        if (orgUnitId != null) {
            HierarchicalNode target = nodeMap.get(orgUnitId);
            return target != null ? List.of(target) : List.of();
        }
        return roots;
    }
}
