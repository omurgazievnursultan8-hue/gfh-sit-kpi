package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.ProductionCalendarRequest;
import kg.gfh.kpi.dto.ProductionCalendarResponse;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ProductionCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class ProductionCalendarController {

    private final ProductionCalendarService service;
    private final UserRepository userRepository;

    @GetMapping
    public List<ProductionCalendarResponse> findAll() {
        return service.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProductionCalendarResponse upsert(
            @Valid @RequestBody ProductionCalendarRequest req,
            Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        Long userId = userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
        return service.upsert(req, userId);
    }
}
