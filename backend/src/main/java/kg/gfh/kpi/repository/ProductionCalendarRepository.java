package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.ProductionCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductionCalendarRepository extends JpaRepository<ProductionCalendar, Long> {
    Optional<ProductionCalendar> findByYearAndMonth(Integer year, Integer month);
}
