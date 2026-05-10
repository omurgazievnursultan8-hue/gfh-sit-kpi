package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.Notification;
import kg.gfh.kpi.repository.NotificationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @GetMapping
    public Page<Notification> list(
            Authentication auth,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
            resolveUserId(auth), PageRequest.of(page, size));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        long count = notificationRepository.countByUserIdAndReadFalse(resolveUserId(auth));
        return Map.of("count", count);
    }

    @PostMapping("/mark-all-read")
    @Transactional
    public Map<String, String> markAllRead(Authentication auth) {
        notificationRepository.markAllReadForUser(resolveUserId(auth));
        return Map.of("status", "ok");
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
