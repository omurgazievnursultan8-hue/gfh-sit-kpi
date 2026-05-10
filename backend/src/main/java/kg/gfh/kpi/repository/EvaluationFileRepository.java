package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationFileRepository extends JpaRepository<EvaluationFile, Long> {
    List<EvaluationFile> findByEvaluationId(Long evaluationId);
    long countByEvaluationId(Long evaluationId);
}
