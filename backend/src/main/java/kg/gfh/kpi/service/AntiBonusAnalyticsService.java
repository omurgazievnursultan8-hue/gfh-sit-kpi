package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse;
import kg.gfh.kpi.dto.AntiBonusAnalyticsResponse.*;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AntiBonusAnalyticsService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = "antiBonusAnalytics", key = "#orgUnitId + '_' + #periodType")
    public AntiBonusAnalyticsResponse getAnalytics(Long orgUnitId, String periodType) {
        return new AntiBonusAnalyticsResponse(
            getTop10(orgUnitId, periodType),
            getDistribution(orgUnitId, periodType),
            getDynamics(orgUnitId, periodType)
        );
    }

    private List<TopEmployee> getTop10(Long orgUnitId, String periodType) {
        String unitFilter = orgUnitId != null ? "AND u.unit_id = ?" : "";
        Object[] params = orgUnitId != null
            ? new Object[]{periodType, orgUnitId}
            : new Object[]{periodType};

        return jdbc.query("""
            SELECT u.id, u.full_name,
                   ou.name_ru as org_unit_name,
                   COUNT(h.id) as incident_count,
                   COALESCE(SUM(h.weighted_value), 0) as total_deduction
            FROM evaluation_score_history h
            JOIN evaluations e ON e.id = h.evaluation_id
            JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            JOIN users u ON u.id = e.evaluatee_id
            LEFT JOIN org_units ou ON ou.id = u.unit_id
            WHERE h.criteria_type = 'ANTI_BONUS'
            """ + unitFilter + """
            GROUP BY u.id, u.full_name, ou.name_ru
            ORDER BY total_deduction DESC
            LIMIT 10
            """,
            (rs, i) -> new TopEmployee(
                rs.getLong("id"), rs.getString("full_name"),
                rs.getString("org_unit_name"),
                rs.getLong("incident_count"),
                rs.getBigDecimal("total_deduction")
            ), params);
    }

    private List<DistributionBucket> getDistribution(Long orgUnitId, String periodType) {
        String unitFilter = orgUnitId != null ? "AND u.unit_id = ?" : "";
        List<DistributionBucket> buckets = new ArrayList<>();

        for (int from = 0; from < 100; from += 10) {
            int to = from + 10;
            String label = from + "–" + to + "%";

            List<Object> paramList = new ArrayList<>();
            paramList.add(periodType);
            paramList.add(from);
            paramList.add(to);
            if (orgUnitId != null) paramList.add(orgUnitId);

            Long count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT e.evaluatee_id)
                FROM evaluations e
                JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
                JOIN users u ON u.id = e.evaluatee_id
                WHERE e.final_score >= ? AND e.final_score < ?
                  AND e.final_score IS NOT NULL
                """ + unitFilter,
                Long.class, paramList.toArray());

            buckets.add(new DistributionBucket(label, from, to, count != null ? count : 0L));
        }
        return buckets;
    }

    private List<PeriodDynamics> getDynamics(Long orgUnitId, String periodType) {
        String unitFilter = orgUnitId != null ? "AND u.unit_id = ?" : "";
        Object[] params = orgUnitId != null
            ? new Object[]{periodType, orgUnitId}
            : new Object[]{periodType};

        return jdbc.query("""
            SELECT ep.id as period_id,
                   ep.start_date::text as period_start,
                   c.name_ru as criteria_name_ru,
                   AVG(h.raw_value) as avg_raw_value,
                   COUNT(h.id) as incident_count
            FROM evaluation_score_history h
            JOIN evaluations e ON e.id = h.evaluation_id
            JOIN evaluation_periods ep ON ep.id = e.period_id AND ep.type = ?
            JOIN criteria c ON c.id = h.criteria_id
            JOIN users u ON u.id = e.evaluatee_id
            WHERE h.criteria_type = 'ANTI_BONUS'
            """ + unitFilter + """
            GROUP BY ep.id, ep.start_date, c.id, c.name_ru
            ORDER BY ep.start_date DESC
            LIMIT 12
            """,
            (rs, i) -> new PeriodDynamics(
                rs.getLong("period_id"),
                rs.getString("period_start"),
                rs.getString("criteria_name_ru"),
                rs.getBigDecimal("avg_raw_value"),
                rs.getLong("incident_count")
            ), params);
    }
}
