package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.DashboardEventResponse;
import kg.gfh.kpi.dto.PersonalAnalyticsResponse;
import kg.gfh.kpi.dto.ScorecardResponse;
import kg.gfh.kpi.dto.TeamResponse;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.AnalyticsService;
import kg.gfh.kpi.service.HierarchicalAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final HierarchicalAnalyticsService hierarchicalService;
    private final UserRepository userRepository;
    private final EvaluationRepository evaluationRepository;
    private final AppealRepository appealRepository;

    public record PendingSummary(long pendingEvaluations, long pendingAppeals) {}

    @GetMapping("/pending-summary")
    public PendingSummary pendingSummary(Authentication auth) {
        Long userId = resolveUserId(auth);
        Role role = userRepository.findById(userId).map(u -> u.getRole()).orElse(Role.EMPLOYEE);
        if (role == Role.ADMIN) {
            return new PendingSummary(
                    evaluationRepository.countByStatus(EvaluationStatus.DRAFT),
                    appealRepository.countByStatus(AppealStatus.PENDING)
            );
        }
        return new PendingSummary(
                evaluationRepository.countByEvaluatorIdAndStatus(userId, EvaluationStatus.DRAFT),
                appealRepository.countByEvaluatorIdAndStatus(userId, AppealStatus.PENDING)
        );
    }

    @GetMapping("/personal")
    public PersonalAnalyticsResponse personal(Authentication auth) {
        Long userId = resolveUserId(auth);
        return analyticsService.getPersonalAnalytics(userId);
    }

    @GetMapping("/personal/scorecard")
    public ResponseEntity<ScorecardResponse> scorecard(Authentication auth) {
        Long userId = resolveUserId(auth);
        ScorecardResponse result = analyticsService.getPersonalScorecard(userId);
        return result == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(result);
    }

    @GetMapping("/team")
    public TeamResponse team(Authentication auth) {
        Long userId = resolveUserId(auth);
        return analyticsService.getTeamAttention(userId);
    }

    @GetMapping("/events")
    public List<DashboardEventResponse> events(Authentication auth) {
        Long userId = resolveUserId(auth);
        return analyticsService.getDashboardEvents(userId);
    }

    @GetMapping("/hierarchical")
    public Object hierarchical(
            @RequestParam(required = false) Long orgUnitId,
            @RequestParam(defaultValue = "MONTHLY") String periodType,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return hierarchicalService.aggregate(orgUnitId, periodType, startDate, endDate);
    }

    @GetMapping("/ranking")
    public List<Object[]> ranking(
            @RequestParam Long orgUnitId,
            @RequestParam Long periodId) {
        return analyticsService.getDepartmentRanking(orgUnitId, periodId);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
