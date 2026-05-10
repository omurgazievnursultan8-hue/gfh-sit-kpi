package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.PersonalAnalyticsResponse;
import kg.gfh.kpi.dto.PersonalAnalyticsResponse.PeriodScore;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;

    @Cacheable(value = "personalAnalytics", key = "#userId")
    public PersonalAnalyticsResponse getPersonalAnalytics(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок"));

        List<PeriodScore> history = jdbc.query("""
            SELECT e.period_id, ep.type, ep.start_date::text, ep.end_date::text, e.final_score,
                   (SELECT AVG(e2.final_score)
                    FROM evaluations e2
                    JOIN users u2 ON u2.id = e2.evaluatee_id
                    JOIN users u1 ON u1.id = ? AND u1.org_unit_id = u2.org_unit_id
                    WHERE e2.period_id = e.period_id
                      AND e2.final_score IS NOT NULL
                      AND e2.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
                   ) AS dept_avg
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id = ?
              AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
              AND e.final_score IS NOT NULL
            ORDER BY ep.start_date DESC
            LIMIT 24
            """,
            (rs, i) -> new PeriodScore(
                rs.getLong("period_id"),
                rs.getString("type"),
                rs.getString("start_date"),
                rs.getString("end_date"),
                rs.getBigDecimal("final_score"),
                rs.getBigDecimal("dept_avg")
            ), userId, userId);

        BigDecimal currentScore = history.isEmpty() ? null : history.get(0).score();

        BigDecimal deptAvg = jdbc.queryForObject("""
            SELECT AVG(e2.final_score)
            FROM evaluations e2
            JOIN users u2 ON u2.id = e2.evaluatee_id
            JOIN users u1 ON u1.org_unit_id = u2.org_unit_id AND u1.id = ?
            WHERE e2.period_id = (
                SELECT MAX(e3.period_id) FROM evaluations e3 WHERE e3.evaluatee_id = ?
            ) AND e2.final_score IS NOT NULL
            """, BigDecimal.class, userId, userId);

        BigDecimal companyAvg = jdbc.queryForObject("""
            SELECT AVG(e.final_score) FROM evaluations e
            WHERE e.period_id = (
                SELECT MAX(e2.period_id) FROM evaluations e2 WHERE e2.evaluatee_id = ?
            ) AND e.final_score IS NOT NULL
            """, BigDecimal.class, userId);

        return new PersonalAnalyticsResponse(userId, user.getFullName(), history,
            currentScore, deptAvg, companyAvg);
    }

    @Cacheable(value = "departmentRanking", key = "#orgUnitId + '_' + #periodId")
    public List<Object[]> getDepartmentRanking(Long orgUnitId, Long periodId) {
        return jdbc.query("""
            SELECT u.id, u.full_name, e.final_score,
                   RANK() OVER (ORDER BY e.final_score DESC NULLS LAST) as rank
            FROM evaluations e
            JOIN users u ON u.id = e.evaluatee_id
            WHERE u.org_unit_id = ?
              AND e.period_id = ?
              AND e.final_score IS NOT NULL
            ORDER BY e.final_score DESC
            """,
            (rs, i) -> new Object[]{
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getBigDecimal("final_score"),
                rs.getLong("rank")
            }, orgUnitId, periodId);
    }
}
