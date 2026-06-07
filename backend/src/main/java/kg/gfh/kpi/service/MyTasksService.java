package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.Appeal;
import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.EvaluationPeriod.PeriodStatus;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationPeriodRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Collects current-state obligations for the authenticated user, role-aware.
 * Source of truth = real domain state (DRAFT evals, PENDING appeals, DRAFT periods),
 * not the notifications log.
 */
@Service
@RequiredArgsConstructor
public class MyTasksService {

    private static final int PER_SOURCE_CAP = 25;
    private static final int TOTAL_CAP = 50;

    private final EvaluationRepository evaluationRepository;
    private final AppealRepository appealRepository;
    private final EvaluationPeriodRepository periodRepository;

    public record MyTask(
        String id,
        TaskType type,
        String titleRu,
        String titleKg,
        String link,
        LocalDateTime dueAt,
        Severity severity,
        String entityType,
        Long entityId,
        Long periodId
    ) {}

    public enum TaskType {
        PENDING_EVALUATION,
        PENDING_SELF_EVAL,
        RESPOND_APPEAL,
        ADMIN_OPEN_APPEAL,
        ADMIN_DRAFT_PERIOD
    }

    public enum Severity { OVERDUE, DUE_SOON, NORMAL }

    @Transactional(readOnly = true)
    public List<MyTask> collectFor(User user) {
        List<MyTask> tasks = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        collectPendingEvaluations(user, tasks, now);
        collectResponderAppeals(user, tasks, now);

        if (user.getRole() == Role.ADMIN) {
            collectAdminTasks(tasks);
        }

        tasks.sort(Comparator
            .comparing((MyTask t) -> severityRank(t.severity()))
            .thenComparing(t -> t.dueAt() == null ? LocalDateTime.MAX : t.dueAt()));

        return tasks.size() > TOTAL_CAP ? tasks.subList(0, TOTAL_CAP) : tasks;
    }

    private void collectPendingEvaluations(User user, List<MyTask> tasks, LocalDateTime now) {
        var page = evaluationRepository.findByEvaluatorIdAndStatus(
            user.getId(), EvaluationStatus.DRAFT,
            org.springframework.data.domain.PageRequest.of(0, PER_SOURCE_CAP));

        for (Evaluation e : page.getContent()) {
            boolean isSelf = e.getEvaluatee().getId().equals(user.getId());
            LocalDateTime deadline = e.getPeriod().getSubmissionDeadline();
            Severity sev = severityFromDeadline(deadline, now);

            Long periodId = e.getPeriod().getId();
            if (isSelf) {
                tasks.add(new MyTask(
                    "self-eval-" + e.getId(),
                    TaskType.PENDING_SELF_EVAL,
                    "Заполните самооценку",
                    "Өзүн өзү баалаңыз",
                    "/evaluations/" + e.getId(),
                    deadline, sev,
                    "EVALUATION", e.getId(), periodId
                ));
            } else {
                String name = e.getEvaluatee().getFullName();
                tasks.add(new MyTask(
                    "pending-eval-" + e.getId(),
                    TaskType.PENDING_EVALUATION,
                    "Оцените: " + name,
                    "Баалаңыз: " + name,
                    "/evaluations/" + e.getId(),
                    deadline, sev,
                    "EVALUATION", e.getId(), periodId
                ));
            }
        }
    }

    private void collectResponderAppeals(User user, List<MyTask> tasks, LocalDateTime now) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }
        List<Appeal> appeals = appealRepository.findPendingByEvaluatorId(user.getId());
        int count = 0;
        for (Appeal a : appeals) {
            if (count++ >= PER_SOURCE_CAP) break;
            Evaluation eval = evaluationRepository.findById(a.getEvaluationId()).orElse(null);
            String name = eval != null ? eval.getEvaluatee().getFullName() : "—";
            Long periodId = eval != null ? eval.getPeriod().getId() : null;
            tasks.add(new MyTask(
                "appeal-" + a.getId(),
                TaskType.RESPOND_APPEAL,
                "Ответьте на апелляцию: " + name,
                "Апелляцияга жооп бериңиз: " + name,
                "/evaluations/" + a.getEvaluationId(),
                a.getDeadline(),
                severityFromDeadline(a.getDeadline(), now),
                "APPEAL", a.getId(), periodId
            ));
        }
    }

    private void collectAdminTasks(List<MyTask> tasks) {
        long pendingAppeals = appealRepository.countByStatus(AppealStatus.PENDING);
        if (pendingAppeals > 0) {
            tasks.add(new MyTask(
                "admin-appeals",
                TaskType.ADMIN_OPEN_APPEAL,
                "Апелляции на рассмотрении: " + pendingAppeals,
                "Каралуудагы даттануулар: " + pendingAppeals,
                "/admin/appeals",
                null, Severity.NORMAL,
                "APPEAL", null, null
            ));
        }

        long draftPeriods = periodRepository.countByStatus(PeriodStatus.DRAFT);
        if (draftPeriods > 0) {
            tasks.add(new MyTask(
                "admin-draft-periods",
                TaskType.ADMIN_DRAFT_PERIOD,
                "Периоды требуют активации: " + draftPeriods,
                "Мезгилдер активдештирүүнү талап кылат: " + draftPeriods,
                "/admin/periods",
                null, Severity.NORMAL,
                "PERIOD", null, null
            ));
        }
    }

    private Severity severityFromDeadline(LocalDateTime deadline, LocalDateTime now) {
        if (deadline == null) return Severity.NORMAL;
        if (deadline.isBefore(now)) return Severity.OVERDUE;
        if (deadline.isBefore(now.plusDays(2))) return Severity.DUE_SOON;
        return Severity.NORMAL;
    }

    private int severityRank(Severity s) {
        return switch (s) {
            case OVERDUE -> 0;
            case DUE_SOON -> 1;
            case NORMAL -> 2;
        };
    }
}
