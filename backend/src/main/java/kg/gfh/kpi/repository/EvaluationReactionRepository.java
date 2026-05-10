package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EvaluationReactionRepository extends JpaRepository<EvaluationReaction, Long> {
    Optional<EvaluationReaction> findByEvaluationId(Long evaluationId);
    boolean existsByEvaluationId(Long evaluationId);
}
