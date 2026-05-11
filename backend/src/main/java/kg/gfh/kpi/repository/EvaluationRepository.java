package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long> {

    Optional<Evaluation> findByPeriodIdAndEvaluateeId(Long periodId, Long evaluateeId);

    List<Evaluation> findByPeriodIdAndStatus(Long periodId, EvaluationStatus status);

    Page<Evaluation> findByEvaluatorIdAndStatus(Long evaluatorId, EvaluationStatus status, Pageable pageable);

    Page<Evaluation> findByEvaluateeId(Long evaluateeId, Pageable pageable);

    @Query("SELECT e FROM Evaluation e WHERE e.period.id = :periodId AND e.evaluator.id = :evaluatorId")
    List<Evaluation> findByPeriodAndEvaluator(
        @Param("periodId") Long periodId,
        @Param("evaluatorId") Long evaluatorId
    );

    long countByPeriodIdAndStatus(Long periodId, EvaluationStatus status);
    long countByStatus(EvaluationStatus status);
    long countByEvaluatorIdAndStatus(Long evaluatorId, EvaluationStatus status);
}
