package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CalendarDayRequest;
import kg.gfh.kpi.dto.CalendarDayResponse;
import kg.gfh.kpi.entity.CalendarDay;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CalendarDayRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CalendarDayService {

    private final CalendarDayRepository repo;

    /** Fixed-date Kyrgyz Republic public holidays (movable Islamic holidays excluded). */
    private static final Map<MonthDay, String[]> FIXED_HOLIDAYS = Map.ofEntries(
        Map.entry(MonthDay.of(1, 1),   new String[]{"Новый год", "Жаңы жыл"}),
        Map.entry(MonthDay.of(1, 7),   new String[]{"Рождество Христово", "Рождество"}),
        Map.entry(MonthDay.of(2, 23),  new String[]{"День защитника Отечества", "Ата Мекенди коргоочулардын күнү"}),
        Map.entry(MonthDay.of(3, 8),   new String[]{"Международный женский день", "Эл аралык аялдар күнү"}),
        Map.entry(MonthDay.of(3, 21),  new String[]{"Нооруз", "Нооруз майрамы"}),
        Map.entry(MonthDay.of(5, 1),   new String[]{"Праздник весны и труда", "Жаз жана эмгек майрамы"}),
        Map.entry(MonthDay.of(5, 5),   new String[]{"День Конституции", "Конституция күнү"}),
        Map.entry(MonthDay.of(5, 9),   new String[]{"День Победы", "Жеңиш күнү"}),
        Map.entry(MonthDay.of(8, 31),  new String[]{"День независимости", "Эгемендүүлүк күнү"}),
        Map.entry(MonthDay.of(11, 7),  new String[]{"День истории и памяти предков", "Тарых жана ата-бабаларды эскерүү күнү"})
    );

    public List<CalendarDayResponse> findByYear(int year) {
        return repo.findByDayBetweenOrderByDay(LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31))
            .stream().map(CalendarDayResponse::from).toList();
    }

    @Transactional
    public CalendarDayResponse upsert(CalendarDayRequest req, Long actorId) {
        CalendarDay day = repo.findByDay(req.day()).orElseGet(CalendarDay::new);
        day.setDay(req.day());
        day.setDayType(req.dayType());
        day.setDescriptionRu(req.descriptionRu());
        day.setDescriptionKg(req.descriptionKg());
        day.setCreatedBy(actorId);
        return CalendarDayResponse.from(repo.save(day));
    }

    @Transactional
    public void delete(LocalDate day) {
        if (!repo.existsByDay(day)) {
            throw new ApiException("CALENDAR_DAY_NOT_FOUND",
                "День " + day + " не найден в календаре",
                "Календарда " + day + " күнү табылган жок");
        }
        repo.deleteByDay(day);
    }

    /** Imports the fixed-date KR public holidays for the given year, skipping days already present. */
    @Transactional
    public List<CalendarDayResponse> importHolidays(int year, Long actorId) {
        FIXED_HOLIDAYS.forEach((md, names) -> {
            LocalDate date = md.atYear(year);
            if (!repo.existsByDay(date)) {
                CalendarDay day = new CalendarDay();
                day.setDay(date);
                day.setDayType(CalendarDay.DayType.HOLIDAY);
                day.setDescriptionRu(names[0]);
                day.setDescriptionKg(names[1]);
                day.setCreatedBy(actorId);
                repo.save(day);
            }
        });
        return findByYear(year);
    }
}
