package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EvaluationScoreRepository extends JpaRepository<EvaluationScore, Long> {
    List<EvaluationScore> findByEvaluationId(Long evaluationId);
    Optional<EvaluationScore> findByEvaluationIdAndCriteriaId(Long evaluationId, Long criteriaId);

    @Modifying
    @Query("DELETE FROM EvaluationScore s WHERE s.evaluationId = :evaluationId")
    void deleteByEvaluationId(Long evaluationId);
}
