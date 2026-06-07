package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.Appeal.AppealStatus;
import kg.gfh.kpi.entity.Evaluation.EvaluationStatus;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.AppealRepository;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.NotificationRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.MyTasksService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final UserRepository userRepository;
    private final EvaluationRepository evaluationRepository;
    private final AppealRepository appealRepository;
    private final NotificationRepository notificationRepository;
    private final MyTasksService myTasksService;

    @GetMapping("/counters")
    public Counters counters(Authentication auth) {
        User u = resolveUser(auth);
        long pendingEvaluations = evaluationRepository.countByEvaluatorIdAndStatus(u.getId(), EvaluationStatus.DRAFT);
        long unreadNotifications = notificationRepository.countByUserIdAndReadFalse(u.getId());

        long openAppeals;
        if (u.getRole() == Role.ADMIN) {
            openAppeals = appealRepository.countByStatus(AppealStatus.PENDING);
        } else if (u.getRole() == Role.EMPLOYEE) {
            openAppeals = 0;
        } else {
            openAppeals = appealRepository.countByEvaluatorIdAndStatus(u.getId(), AppealStatus.PENDING);
        }

        return new Counters(pendingEvaluations, openAppeals, unreadNotifications);
    }

    public record Counters(long pendingEvaluations, long openAppeals, long unreadNotifications) {}

    @GetMapping("/tasks")
    public List<MyTasksService.MyTask> tasks(Authentication auth) {
        return myTasksService.collectFor(resolveUser(auth));
    }

    private User resolveUser(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow();
    }
}
