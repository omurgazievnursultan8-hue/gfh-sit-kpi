package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EvaluationPeriodRepository extends JpaRepository<EvaluationPeriod, Long> {
    List<EvaluationPeriod> findByStatus(PeriodStatus status);
    Page<EvaluationPeriod> findAllByOrderByCreatedAtDesc(Pageable pageable);
    long countByStatus(PeriodStatus status);
}
