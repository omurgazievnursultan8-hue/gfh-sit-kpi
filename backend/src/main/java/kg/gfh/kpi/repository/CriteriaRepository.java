package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface CriteriaRepository extends JpaRepository<Criteria, Long> {

    long countByCreatedAtAfter(LocalDateTime cutoff);


    Page<Criteria> findByActiveTrue(Pageable pageable);

    List<Criteria> findByTypeAndOrgUnitIdAndActiveTrue(CriteriaType type, Long orgUnitId);

    List<Criteria> findByTypeAndOrgUnitIsNullAndActiveTrue(CriteriaType type);

    @Query("""
        SELECT COALESCE(SUM(c.weight), 0)
        FROM Criteria c
        WHERE c.type = :type
          AND c.active = true
          AND (:orgUnitId IS NULL AND c.orgUnit IS NULL
               OR c.orgUnit.id = :orgUnitId)
          AND (:excludeId IS NULL OR c.id <> :excludeId)
        """)
    BigDecimal sumWeightByTypeAndScope(
        @Param("type") CriteriaType type,
        @Param("orgUnitId") Long orgUnitId,
        @Param("excludeId") Long excludeId
    );

    boolean existsByIdAndFrozenTrue(Long id);

    long countByActiveTrue();
    long countByActiveTrueAndCreatedAtAfter(LocalDateTime cutoff);
    long countByActiveFalseAndCreatedAtAfter(LocalDateTime cutoff);
}
