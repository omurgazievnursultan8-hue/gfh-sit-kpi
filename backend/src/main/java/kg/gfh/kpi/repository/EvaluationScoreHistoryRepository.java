package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.EvaluationScoreHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface EvaluationScoreHistoryRepository extends JpaRepository<EvaluationScoreHistory, Long> {

    @Query("""
        SELECT COALESCE(SUM(h.weightedValue), 0)
        FROM EvaluationScoreHistory h
        WHERE h.evaluationId = :evaluationId AND h.criteriaType = :type
        """)
    BigDecimal sumWeightedValueByEvaluationAndType(
        @Param("evaluationId") Long evaluationId,
        @Param("type") CriteriaType type
    );

    @Query("""
        SELECT COALESCE(SUM(h.weightSnapshot), 0)
        FROM EvaluationScoreHistory h
        WHERE h.evaluationId = :evaluationId AND h.criteriaType = :type
        """)
    BigDecimal sumWeightSnapshotByEvaluationAndType(
        @Param("evaluationId") Long evaluationId,
        @Param("type") CriteriaType type
    );

    long countByEvaluationIdAndCriteriaType(Long evaluationId, CriteriaType criteriaType);

    @Query("SELECT DISTINCT h.evaluationId FROM EvaluationScoreHistory h WHERE h.criteriaId = :criteriaId")
    List<Long> findEvaluationIdsByCriteriaId(@Param("criteriaId") Long criteriaId);
}
