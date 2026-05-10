package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.PersonalAnalyticsResponse;
import kg.gfh.kpi.dto.PersonalAnalyticsResponse.PeriodScore;
import kg.gfh.kpi.dto.ScorecardResponse;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import org.springframework.jdbc.core.RowCallbackHandler;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final double GOAL_SCORE = 90.0;

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

    private String buildPeriodLabel(String type, int year, int month) {
        return switch (type) {
            case "QUARTERLY" -> "Q" + ((month - 1) / 3 + 1) + " " + year;
            case "MONTHLY"   -> "M" + month + " " + year;
            default          -> "Год " + year;
        };
    }

    private String computeGrade(double score) {
        if (score >= GOAL_SCORE) return "A";
        if (score >= 80) return "A−";
        if (score >= 70) return "B+";
        if (score >= 60) return "B";
        if (score >= 50) return "C";
        return "D";
    }

    public ScorecardResponse getPersonalScorecard(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                "Пользователь не найден", "Колдонуучу табылган жок"));

        // 1. Find target evaluation: active period first, else latest scored
        record EvalRow(long id, long periodId, double score, String type, int year, int month) {}
        List<EvalRow> evalRows = jdbc.query("""
            SELECT e.id, e.period_id,
                   COALESCE(e.final_score, 0)::float        AS score,
                   ep.type,
                   EXTRACT(YEAR  FROM ep.start_date)::int   AS yr,
                   EXTRACT(MONTH FROM ep.start_date)::int   AS mo
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id = ?
              AND e.status NOT IN ('DRAFT')
              AND (ep.status = 'ACTIVE' OR e.final_score IS NOT NULL)
            ORDER BY CASE WHEN ep.status = 'ACTIVE' THEN 0 ELSE 1 END,
                     ep.start_date DESC
            LIMIT 1
            """,
            (rs, i) -> new EvalRow(
                rs.getLong("id"), rs.getLong("period_id"), rs.getDouble("score"),
                rs.getString("type"), rs.getInt("yr"), rs.getInt("mo")
            ), userId);

        if (evalRows.isEmpty()) return null;

        EvalRow ev = evalRows.get(0);
        String periodLabel = buildPeriodLabel(ev.type(), ev.year(), ev.month());
        double totalScore = ev.score();

        // 2. Rank in department
        Integer rank = null;
        if (user.getUnitId() != null) {
            List<Object[]> ranking = getDepartmentRanking(user.getUnitId(), ev.periodId());
            for (Object[] row : ranking) {
                if (((Long) row[0]).equals(userId)) {
                    rank = ((Long) row[3]).intValue();
                    break;
                }
            }
        }

        // 3. Previous evaluation for delta + prevPeriodLabel
        record PrevRow(long id, double score, String type, int year, int month) {}
        List<PrevRow> prevRows = jdbc.query("""
            SELECT e.id, e.final_score::float AS score, ep.type,
                   EXTRACT(YEAR  FROM ep.start_date)::int AS yr,
                   EXTRACT(MONTH FROM ep.start_date)::int AS mo
            FROM evaluations e
            JOIN evaluation_periods ep ON ep.id = e.period_id
            WHERE e.evaluatee_id = ?
              AND e.id != ?
              AND e.final_score IS NOT NULL
              AND e.status IN ('SUBMITTED','ACKNOWLEDGED','APPEALED','CLOSED')
            ORDER BY ep.start_date DESC LIMIT 1
            """,
            (rs, i) -> new PrevRow(rs.getLong("id"), rs.getDouble("score"),
                rs.getString("type"), rs.getInt("yr"), rs.getInt("mo")),
            userId, ev.id());

        Double vsPrevPeriod = null;
        String prevPeriodLabel = null;
        Map<Long, Double> prevScores = new HashMap<>();

        if (!prevRows.isEmpty()) {
            PrevRow prev = prevRows.get(0);
            vsPrevPeriod = totalScore - prev.score();
            prevPeriodLabel = buildPeriodLabel(prev.type(), prev.year(), prev.month());
            jdbc.query("""
                SELECT criteria_id, value::float AS val
                FROM evaluation_scores WHERE evaluation_id = ?
                """,
                (RowCallbackHandler) rs -> prevScores.put(rs.getLong("criteria_id"), rs.getDouble("val")),
                prev.id());
        }

        // 4. Criteria scores — type included in the same query to avoid a second round-trip
        Map<Long, String> criteriaTypes = new HashMap<>();
        List<ScorecardResponse.CriteriaScoreDto> allRows = jdbc.query("""
            SELECT es.criteria_id, c.name_ru, c.name_kg, c.weight::float,
                   c.type AS criteria_type, es.value::float AS score,
                   COALESCE(ou.name_ru, '') AS level_label
            FROM evaluation_scores es
            JOIN criteria c ON c.id = es.criteria_id
            LEFT JOIN org_units ou ON ou.id = c.org_unit_id
            WHERE es.evaluation_id = ?
            ORDER BY c.weight DESC
            """,
            (rs, i) -> {
                long cid = rs.getLong("criteria_id");
                double score = rs.getDouble("score");
                Double delta = prevScores.containsKey(cid)
                    ? score - prevScores.get(cid) : null;
                criteriaTypes.put(cid, rs.getString("criteria_type"));
                return new ScorecardResponse.CriteriaScoreDto(
                    cid,
                    rs.getString("name_ru"),
                    rs.getString("name_kg"),
                    rs.getDouble("weight"),
                    score,
                    rs.getDouble("weight"),
                    delta,
                    rs.getString("level_label")
                );
            }, ev.id());

        List<ScorecardResponse.CriteriaScoreDto> positiveCriteria = allRows.stream()
            .filter(c -> "POSITIVE".equals(criteriaTypes.get(c.criteriaId())))
            .toList();
        List<ScorecardResponse.CriteriaScoreDto> antiBonuses = allRows.stream()
            .filter(c -> "ANTI_BONUS".equals(criteriaTypes.get(c.criteriaId())))
            .toList();

        double antiBonusTotal = antiBonuses.stream()
            .mapToDouble(ScorecardResponse.CriteriaScoreDto::score).sum();

        return new ScorecardResponse(
            ev.periodId(), periodLabel, totalScore, computeGrade(totalScore),
            totalScore - GOAL_SCORE, vsPrevPeriod, prevPeriodLabel, rank,
            antiBonusTotal, positiveCriteria, antiBonuses
        );
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
