package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AdminStatsResponse;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import kg.gfh.kpi.enums.OrgUnitType;
import kg.gfh.kpi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final EvaluationPeriodRepository evaluationPeriodRepository;
    private final EvaluationRepository evaluationRepository;
    private final AppealRepository appealRepository;
    private final AuditLogRepository auditLogRepository;
    private final CriteriaRepository criteriaRepository;
    private final EvaluatorDelegationRepository delegationRepository;
    private final OrgUnitRepository orgUnitRepository;

    @Value("${app.log.error-file:/app/logs/error.log}")
    private String errorLogFile;

    public AdminStatsResponse getStats(String range) {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = cutoffFor(range);

        long activePeriodTotal = evaluationRepository.countInActivePeriods(PeriodStatus.ACTIVE);
        long activePeriodCompleted = evaluationRepository.countCompletedInActivePeriods(
            PeriodStatus.ACTIVE, EvaluationStatus.DRAFT);
        double completionRate = activePeriodTotal > 0
            ? (activePeriodCompleted * 100.0) / activePeriodTotal
            : 0.0;

        long overdue = evaluationRepository.countOverdueInActivePeriods(
            EvaluationStatus.DRAFT, PeriodStatus.ACTIVE, now);

        Double avgScore = evaluationRepository.avgFinalScoreActivePeriods(
            PeriodStatus.ACTIVE, EvaluationStatus.DRAFT);
        double avgRating = avgScore != null ? avgScore : 0.0;
        long ratedCount = evaluationRepository.countRatedInActivePeriods(
            PeriodStatus.ACTIVE, EvaluationStatus.DRAFT);

        Optional<EvaluationPeriod> nextPeriod = evaluationPeriodRepository
            .findFirstByStatusAndEndDateGreaterThanEqualOrderByEndDateAsc(PeriodStatus.ACTIVE, today);
        LocalDate nextDeadlineDate = nextPeriod.map(EvaluationPeriod::getEndDate).orElse(null);
        String nextDeadlineLabel = nextPeriod
            .map(p -> p.getType().name() + " " + p.getStartDate() + ".." + p.getEndDate())
            .orElse(null);
        long daysUntilNext = nextDeadlineDate != null
            ? ChronoUnit.DAYS.between(today, nextDeadlineDate)
            : 0L;

        return new AdminStatsResponse(
            userRepository.count(),
            userRepository.countByIsActiveTrue(),
            evaluationPeriodRepository.countByStatus(PeriodStatus.ACTIVE),
            evaluationPeriodRepository.count(),
            evaluationRepository.countByStatus(EvaluationStatus.DRAFT),
            evaluationRepository.count(),
            appealRepository.countByStatus(AppealStatus.PENDING),
            appealRepository.count(),
            auditLogRepository.countByTimestampAfter(LocalDateTime.now().minusHours(24)),
            criteriaRepository.countByActiveTrue(),
            criteriaRepository.count(),
            delegationRepository.countActive(today),
            delegationRepository.countExpiringBy(today, today.plusDays(7)),
            orgUnitRepository.count(),
            orgUnitRepository.countByType(OrgUnitType.BLOCK),
            orgUnitRepository.countByType(OrgUnitType.DEPARTMENT),
            orgUnitRepository.countByType(OrgUnitType.UNIT),
            userRepository.countByCreatedAtAfter(cutoff),
            evaluationPeriodRepository.countByCreatedAtAfter(cutoff),
            evaluationRepository.countByCreatedAtAfter(cutoff),
            appealRepository.countByCreatedAtAfter(cutoff),
            criteriaRepository.countByCreatedAtAfter(cutoff),
            orgUnitRepository.countByCreatedAtAfter(cutoff),
            userRepository.countByIsActiveTrueAndCreatedAtAfter(cutoff),
            userRepository.countByIsActiveFalseAndCreatedAtAfter(cutoff),
            evaluationPeriodRepository.countByStatusAndCreatedAtAfter(PeriodStatus.ACTIVE, cutoff),
            evaluationPeriodRepository.countByStatusNotAndCreatedAtAfter(PeriodStatus.ACTIVE, cutoff),
            evaluationRepository.countByStatusAndCreatedAtAfter(EvaluationStatus.DRAFT, cutoff),
            evaluationRepository.countByStatusNotAndCreatedAtAfter(EvaluationStatus.DRAFT, cutoff),
            appealRepository.countByStatusAndCreatedAtAfter(AppealStatus.PENDING, cutoff),
            appealRepository.countByStatusNotAndCreatedAtAfter(AppealStatus.PENDING, cutoff),
            criteriaRepository.countByActiveTrueAndCreatedAtAfter(cutoff),
            criteriaRepository.countByActiveFalseAndCreatedAtAfter(cutoff),
            orgUnitRepository.countByTypeAndCreatedAtAfter(OrgUnitType.BLOCK, cutoff),
            orgUnitRepository.countByTypeAndCreatedAtAfter(OrgUnitType.DEPARTMENT, cutoff),
            orgUnitRepository.countByTypeAndCreatedAtAfter(OrgUnitType.UNIT, cutoff),
            completionRate,
            overdue,
            avgRating,
            ratedCount,
            nextDeadlineDate,
            nextDeadlineLabel,
            daysUntilNext
        );
    }

    private static LocalDateTime cutoffFor(String range) {
        LocalDateTime now = LocalDateTime.now();
        if (range == null) return now.minusDays(30);
        return switch (range) {
            case "week"      -> now.minusDays(7);
            case "trimester" -> now.minusDays(90);
            case "half"      -> now.minusDays(180);
            case "year"      -> now.minusDays(365);
            default          -> now.minusDays(30);
        };
    }

    public List<String> getLastErrorLogLines(int count) {
        try {
            java.nio.file.Path path = Paths.get(errorLogFile);
            if (!Files.exists(path)) return List.of("Log file not found: " + errorLogFile);
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            int from = Math.max(0, lines.size() - count);
            return lines.subList(from, lines.size());
        } catch (IOException e) {
            log.warn("Cannot read error log file: {}", e.getMessage());
            return Collections.singletonList("Cannot read log: " + e.getMessage());
        }
    }
}
