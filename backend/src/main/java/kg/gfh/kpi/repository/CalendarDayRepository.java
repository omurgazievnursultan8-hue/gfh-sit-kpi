package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.CalendarDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CalendarDayRepository extends JpaRepository<CalendarDay, Long> {

    List<CalendarDay> findByDayBetweenOrderByDay(LocalDate from, LocalDate to);

    Optional<CalendarDay> findByDay(LocalDate day);

    boolean existsByDay(LocalDate day);

    void deleteByDay(LocalDate day);
}
