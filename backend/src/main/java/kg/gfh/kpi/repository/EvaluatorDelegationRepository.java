package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EvaluatorDelegationRepository extends JpaRepository<EvaluatorDelegation, Long> {

    @Query("SELECT d FROM EvaluatorDelegation d WHERE d.evaluateeId = :evaluateeId " +
           "AND d.isActive = true AND d.validFrom <= :date AND d.validTo >= :date")
    Optional<EvaluatorDelegation> findActiveDelegation(Long evaluateeId, LocalDate date);

    @Query("SELECT d FROM EvaluatorDelegation d WHERE d.delegatedToId = :userId " +
           "AND d.isActive = true AND d.validFrom <= :date AND d.validTo >= :date")
    List<EvaluatorDelegation> findDelegationsAssignedTo(Long userId, LocalDate date);

    @Query("SELECT COUNT(d) FROM EvaluatorDelegation d WHERE d.isActive = true " +
           "AND d.validFrom <= :date AND d.validTo >= :date")
    long countActive(LocalDate date);

    @Query("SELECT COUNT(d) FROM EvaluatorDelegation d WHERE d.isActive = true " +
           "AND d.validTo >= :today AND d.validTo <= :horizon")
    long countExpiringBy(LocalDate today, LocalDate horizon);
}
