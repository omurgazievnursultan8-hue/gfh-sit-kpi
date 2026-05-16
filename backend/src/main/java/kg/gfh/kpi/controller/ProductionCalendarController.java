package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.CalendarDayRequest;
import kg.gfh.kpi.dto.CalendarDayResponse;
import kg.gfh.kpi.dto.ProductionCalendarRequest;
import kg.gfh.kpi.dto.ProductionCalendarResponse;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.CalendarDayService;
import kg.gfh.kpi.service.ProductionCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class ProductionCalendarController {

    private final ProductionCalendarService service;
    private final CalendarDayService dayService;
    private final UserRepository userRepository;

    private Long actorId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }

    /* ── Month-level working days ─────────────────────────────────── */

    @GetMapping
    public List<ProductionCalendarResponse> findAll() {
        return service.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProductionCalendarResponse upsert(
            @Valid @RequestBody ProductionCalendarRequest req,
            Authentication auth) {
        return service.upsert(req, actorId(auth));
    }

    /* ── Day-level entries (holidays, transfers) ──────────────────── */

    @GetMapping("/days")
    public List<CalendarDayResponse> findDays(@RequestParam int year) {
        return dayService.findByYear(year);
    }

    @PostMapping("/days")
    @PreAuthorize("hasRole('ADMIN')")
    public CalendarDayResponse upsertDay(
            @Valid @RequestBody CalendarDayRequest req,
            Authentication auth) {
        return dayService.upsert(req, actorId(auth));
    }

    @DeleteMapping("/days/{day}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteDay(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate day) {
        dayService.delete(day);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/days/import")
    @PreAuthorize("hasRole('ADMIN')")
    public List<CalendarDayResponse> importHolidays(
            @RequestParam int year,
            Authentication auth) {
        return dayService.importHolidays(year, actorId(auth));
    }
}
