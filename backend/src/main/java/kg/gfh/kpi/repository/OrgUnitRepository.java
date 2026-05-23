package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrgUnitRepository extends JpaRepository<OrgUnit, Long> {
    List<OrgUnit> findByType(OrgUnitType type);
    List<OrgUnit> findByParentId(Long parentId);
    long countByType(OrgUnitType type);
    long countByCreatedAtAfter(LocalDateTime cutoff);
    long countByTypeAndCreatedAtAfter(OrgUnitType type, LocalDateTime cutoff);
}
