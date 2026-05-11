package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.EvaluationPeriodRequest;
import kg.gfh.kpi.dto.EvaluationResponse;
import kg.gfh.kpi.dto.ScoreRequest;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EvaluationController {

    private final EvaluationService evaluationService;
    private final UserRepository userRepository;

    @GetMapping("/periods/current")
    public Object getCurrentPeriod() {
        var period = evaluationService.findCurrentPeriod();
        if (period == null) return null;
        return new CurrentPeriod(
                period.getId(),
                period.getType().name(),
                period.getStartDate(),
                period.getEndDate(),
                period.getSubmissionDeadline(),
                period.getStatus().name()
        );
    }

    public record CurrentPeriod(
            Long id,
            String type,
            java.time.LocalDate startDate,
            java.time.LocalDate endDate,
            java.time.LocalDateTime submissionDeadline,
            String status
    ) {}

    @PostMapping("/periods")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public Object createPeriod(@Valid @RequestBody EvaluationPeriodRequest req, Authentication auth) {
        return evaluationService.createPeriod(req, resolveUserId(auth));
    }

    @PostMapping("/periods/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public Object activatePeriod(@PathVariable Long id) {
        return evaluationService.activatePeriod(id);
    }

    @PostMapping("/periods/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public Object closePeriod(@PathVariable Long id) {
        return evaluationService.closePeriod(id);
    }

    @GetMapping("/evaluations/my-tasks")
    public Page<EvaluationResponse> myPendingEvaluations(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return evaluationService.listForEvaluator(resolveUserId(auth), EvaluationStatus.DRAFT, PageRequest.of(page, size));
    }

    @GetMapping("/evaluations/my-history")
    public Page<EvaluationResponse> myEvaluationHistory(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return evaluationService.listForEmployee(resolveUserId(auth), PageRequest.of(page, size));
    }

    @PutMapping("/evaluations/{id}/scores")
    public EvaluationResponse saveScores(
            @PathVariable Long id,
            @Valid @RequestBody List<ScoreRequest> scores,
            Authentication auth) {
        return evaluationService.saveScores(id, scores, resolveUserId(auth));
    }

    @PostMapping("/evaluations/{id}/scores/preview")
    public BigDecimal dryRun(
            @PathVariable Long id,
            @RequestBody List<ScoreRequest> scores) {
        return evaluationService.dryRunScore(id, scores);
    }

    @PostMapping("/evaluations/{id}/submit")
    public EvaluationResponse submit(@PathVariable Long id, Authentication auth) {
        return evaluationService.submit(id, resolveUserId(auth));
    }

    @PutMapping("/evaluations/{id}/reassign")
    @PreAuthorize("hasRole('ADMIN')")
    public EvaluationResponse reassign(
            @PathVariable Long id,
            @RequestParam Long newEvaluatorId) {
        return evaluationService.reassign(id, newEvaluatorId);
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
