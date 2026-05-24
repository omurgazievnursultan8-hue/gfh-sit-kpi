package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AdminAppealResponse;
import kg.gfh.kpi.dto.AppealPendingResponse;
import kg.gfh.kpi.dto.AppealSummaryResponse;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AppealService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/appeals")
@RequiredArgsConstructor
public class AppealController {

    private final AppealService appealService;
    private final UserRepository userRepository;

    @PostMapping
    public Object fileAppeal(@RequestBody Map<String, Object> body, Authentication auth) {
        Long userId = resolveUserId(auth);
        Long evaluationId = Long.parseLong(body.get("evaluationId").toString());
        String reason = (String) body.get("reason");
        return appealService.fileAppeal(evaluationId, userId, reason);
    }

    @PostMapping("/{id}/respond")
    public Object respond(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Long userId = resolveUserId(auth);
        AppealStatus decision = AppealStatus.valueOf(body.get("decision"));
        String response = body.get("response");
        return appealService.respond(id, userId, decision, response);
    }

    @GetMapping("/pending")
    public List<AppealPendingResponse> getPendingAppeals(Authentication auth) {
        Long userId = resolveUserId(auth);
        return appealService.getPendingAppealsForEvaluator(userId);
    }

    @GetMapping
    public List<AppealSummaryResponse> getMyAppeals(Authentication auth) {
        Long userId = resolveUserId(auth);
        return appealService.getAppealsForEvaluator(userId);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public Page<AdminAppealResponse> listAll(
            @RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long evaluateeId,
            @RequestParam(required = false) Long evaluatorId,
            @RequestParam(required = false) Long respondedById,
            @RequestParam(required = false) AppealStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {
        String[] parts = sort.split(",", 2);
        String field = parts[0];
        Sort.Direction dir = parts.length > 1 && parts[1].equalsIgnoreCase("asc")
            ? Sort.Direction.ASC : Sort.Direction.DESC;
        return appealService.listForAdmin(periodId, evaluateeId, evaluatorId, respondedById,
            status, q, from, to, PageRequest.of(page, size, Sort.by(dir, field)));
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
