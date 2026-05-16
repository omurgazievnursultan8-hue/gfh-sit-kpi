package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AdminStatsResponse;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
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
import java.util.Collections;
import java.util.List;

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

    public AdminStatsResponse getStats() {
        LocalDate today = LocalDate.now();
        return new AdminStatsResponse(
            userRepository.count(),
            userRepository.countByIsActiveTrue(),
            evaluationPeriodRepository.countByStatus(PeriodStatus.ACTIVE),
            evaluationRepository.countByStatus(EvaluationStatus.DRAFT),
            evaluationRepository.count(),
            appealRepository.countByStatus(AppealStatus.PENDING),
            auditLogRepository.countByTimestampAfter(LocalDateTime.now().minusHours(24)),
            criteriaRepository.countByActiveTrue(),
            delegationRepository.countActive(today),
            delegationRepository.countExpiringBy(today, today.plusDays(7)),
            orgUnitRepository.count()
        );
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
