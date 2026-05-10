package kg.gfh.kpi.controller;

import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;
    private final UserRepository userRepository;

    @GetMapping("/periods/{id}/excel")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN','DEPUTY_CHAIRMAN')")
    public ResponseEntity<byte[]> periodExcel(@PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        byte[] data = reportService.generatePeriodSummaryExcel(id, userId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"period-" + id + "-report.xlsx\"")
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(data);
    }

    @GetMapping("/periods/{id}/pdf")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN','DEPUTY_CHAIRMAN')")
    public ResponseEntity<byte[]> periodPdf(@PathVariable Long id, Authentication auth) {
        Long userId = resolveUserId(auth);
        byte[] data = reportService.generatePeriodSummaryPdf(id, userId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"period-" + id + "-report.pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(data);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
