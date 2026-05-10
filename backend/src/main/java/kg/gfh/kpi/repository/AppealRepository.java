package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppealRepository extends JpaRepository<Appeal, Long> {
    Optional<Appeal> findByEvaluationId(Long evaluationId);
    boolean existsByEvaluationId(Long evaluationId);
    List<Appeal> findByStatusAndDeadlineBefore(AppealStatus status, LocalDateTime now);
    long countByStatus(AppealStatus status);

    @Query("SELECT a FROM Appeal a WHERE a.evaluationId IN " +
           "(SELECT e.id FROM Evaluation e WHERE e.evaluator.id = :evaluatorId) " +
           "AND a.status = kg.gfh.kpi.entity.Appeal.AppealStatus.PENDING")
    List<Appeal> findPendingByEvaluatorId(@Param("evaluatorId") Long evaluatorId);
}
