package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Position;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PositionRepository extends JpaRepository<Position, Long> {
    List<Position> findByUnitIdOrderByDisplayOrderAscNameRuAsc(Long unitId);
    List<Position> findByUnitIdAndIsActiveTrueOrderByDisplayOrderAscNameRuAsc(Long unitId);
    boolean existsByCode(String code);
}
