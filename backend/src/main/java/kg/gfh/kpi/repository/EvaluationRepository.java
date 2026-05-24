package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EvaluationRepository extends JpaRepository<Evaluation, Long>, JpaSpecificationExecutor<Evaluation> {

    long countByCreatedAtAfter(LocalDateTime cutoff);
    long countByStatusAndCreatedAtAfter(EvaluationStatus status, LocalDateTime cutoff);
    long countByStatusNotAndCreatedAtAfter(EvaluationStatus status, LocalDateTime cutoff);


    Optional<Evaluation> findByPeriodIdAndEvaluateeId(Long periodId, Long evaluateeId);

    List<Evaluation> findByPeriodIdAndStatus(Long periodId, EvaluationStatus status);

    Page<Evaluation> findByEvaluatorIdAndStatus(Long evaluatorId, EvaluationStatus status, Pageable pageable);

    Page<Evaluation> findByEvaluatorId(Long evaluatorId, Pageable pageable);

    Page<Evaluation> findByEvaluateeId(Long evaluateeId, Pageable pageable);

    @Query("SELECT e FROM Evaluation e WHERE e.period.id = :periodId AND e.evaluator.id = :evaluatorId")
    List<Evaluation> findByPeriodAndEvaluator(
        @Param("periodId") Long periodId,
        @Param("evaluatorId") Long evaluatorId
    );

    long countByPeriodIdAndStatus(Long periodId, EvaluationStatus status);
    long countByStatus(EvaluationStatus status);
    long countByEvaluatorIdAndStatus(Long evaluatorId, EvaluationStatus status);
    long countByPeriodId(Long periodId);
    long countByPeriodIdAndStatusNot(Long periodId, EvaluationStatus status);
    long countByPeriodIdAndEvaluatorId(Long periodId, Long evaluatorId);
    long countByPeriodIdAndEvaluatorIdAndStatusNot(Long periodId, Long evaluatorId, EvaluationStatus status);

    @Query("SELECT COUNT(e) FROM Evaluation e " +
        "WHERE e.status = :draft AND e.period.status = :active " +
        "AND e.period.submissionDeadline < :now")
    long countOverdueInActivePeriods(@Param("draft") EvaluationStatus draft,
                                      @Param("active") PeriodStatus active,
                                      @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(e) FROM Evaluation e WHERE e.period.status = :active")
    long countInActivePeriods(@Param("active") PeriodStatus active);

    @Query("SELECT COUNT(e) FROM Evaluation e " +
        "WHERE e.period.status = :active AND e.status <> :draft")
    long countCompletedInActivePeriods(@Param("active") PeriodStatus active,
                                        @Param("draft") EvaluationStatus draft);

    @Query("SELECT AVG(e.finalScore) FROM Evaluation e " +
        "WHERE e.period.status = :active AND e.status <> :draft " +
        "AND e.finalScore IS NOT NULL")
    Double avgFinalScoreActivePeriods(@Param("active") PeriodStatus active,
                                       @Param("draft") EvaluationStatus draft);

    @Query("SELECT COUNT(e) FROM Evaluation e " +
        "WHERE e.period.status = :active AND e.status <> :draft " +
        "AND e.finalScore IS NOT NULL")
    long countRatedInActivePeriods(@Param("active") PeriodStatus active,
                                    @Param("draft") EvaluationStatus draft);
}
