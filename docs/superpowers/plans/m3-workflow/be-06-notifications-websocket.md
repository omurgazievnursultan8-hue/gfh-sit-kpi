# M3-BE-06: NotificationService + WebSocket STOMP over SockJS + JWT Auth in Handshake

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `NotificationService` (creates `notifications` DB rows and pushes real-time messages via WebSocket), configure Spring WebSocket with STOMP over SockJS, authenticate the WebSocket handshake using the JWT cookie, and expose REST endpoints to list/mark-read notifications.

**Architecture:** WebSocket config uses `@EnableWebSocketMessageBroker`. Client connects to `/ws` with SockJS fallback, subscribes to `/user/queue/notifications`. Server pushes to specific users via `SimpMessagingTemplate.convertAndSendToUser`. JWT in the handshake is validated in a custom `HandshakeInterceptor` that reads the `access_token` cookie and sets the user principal. Unread count endpoint supports the header badge.

**Tech Stack:** Spring Boot 3.x, Spring WebSocket, STOMP, SockJS.

**Depends on:** m3-workflow/be-05-quartz-scheduler.md

---

### Task 1: WebSocket config + handshake JWT auth

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/config/WebSocketConfig.java`
- Create: `backend/src/main/java/kg/gfh/kpi/security/JwtHandshakeInterceptor.java`

- [ ] **Step 1: Create JwtHandshakeInterceptor**

`backend/src/main/java/kg/gfh/kpi/security/JwtHandshakeInterceptor.java`:
```java
package kg.gfh.kpi.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import kg.gfh.kpi.service.JwtService;
import kg.gfh.kpi.service.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) return false;

        HttpServletRequest httpRequest = servletRequest.getServletRequest();
        String token = extractTokenFromCookie(httpRequest);

        if (token == null) {
            log.warn("WebSocket handshake rejected: no access_token cookie");
            return false;
        }

        try {
            String email = jwtService.extractEmail(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            if (!jwtService.isTokenValid(token, userDetails)) {
                log.warn("WebSocket handshake rejected: invalid token for {}", email);
                return false;
            }
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            attributes.put("principal", auth);
            log.debug("WebSocket handshake authenticated for {}", email);
            return true;
        } catch (Exception e) {
            log.warn("WebSocket handshake rejected: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {}

    private String extractTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
            .filter(c -> "access_token".equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);
    }
}
```

- [ ] **Step 2: Create WebSocketConfig**

`backend/src/main/java/kg/gfh/kpi/config/WebSocketConfig.java`:
```java
package kg.gfh.kpi.config;

import kg.gfh.kpi.security.JwtHandshakeInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtHandshakeInterceptor handshakeInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/user", "/topic");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
            .addInterceptors(handshakeInterceptor)
            .setAllowedOriginPatterns("*")
            .withSockJS();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/config/WebSocketConfig.java \
        backend/src/main/java/kg/gfh/kpi/security/JwtHandshakeInterceptor.java
git commit -m "feat(websocket): configure STOMP over SockJS with JWT cookie auth in handshake"
```

---

### Task 2: NotificationService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/Notification.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/NotificationRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/NotificationService.java`

- [ ] **Step 1: Create Notification entity**

`backend/src/main/java/kg/gfh/kpi/entity/Notification.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter
public class Notification {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "title_ru", nullable = false, length = 255)
    private String titleRu;

    @Column(name = "title_kg", nullable = false, length = 255)
    private String titleKg;

    @Column(name = "body_ru", columnDefinition = "TEXT")
    private String bodyRu;

    @Column(name = "body_kg", columnDefinition = "TEXT")
    private String bodyKg;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

`backend/src/main/java/kg/gfh/kpi/repository/NotificationRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
    void markAllReadForUser(Long userId);
}
```

- [ ] **Step 2: Create NotificationService**

`backend/src/main/java/kg/gfh/kpi/service/NotificationService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.*;
import kg.gfh.kpi.entity.EvaluationReaction.ReactionType;
import kg.gfh.kpi.repository.EvaluationRepository;
import kg.gfh.kpi.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EvaluationRepository evaluationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public void notifyPeriodActivated(EvaluationPeriod period) {
        List<Evaluation> evals = evaluationRepository.findByPeriodIdAndStatus(
            period.getId(), Evaluation.EvaluationStatus.DRAFT);
        for (Evaluation eval : evals) {
            // Notify evaluator
            push(eval.getEvaluator().getId(), "NEW_EVALUATION",
                "Новая оценка для заполнения",
                "Жаңы баалоо толтурулсун",
                "Необходимо оценить: " + eval.getEvaluatee().getFullName(),
                "Баалоо зарыл: " + eval.getEvaluatee().getFullName(),
                "EVALUATION", eval.getId());
        }
    }

    @Transactional
    public void notifyEvaluationSubmitted(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "EVALUATION_SUBMITTED",
            "Ваша оценка выставлена",
            "Сиздин баалооңуз коюлду",
            "Оценщик: " + eval.getEvaluator().getFullName() + ". Итог: " + eval.getFinalScore(),
            "Баалоочу: " + eval.getEvaluator().getFullName() + ". Жыйынтык: " + eval.getFinalScore(),
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyReactionSubmitted(Evaluation eval, ReactionType reaction) {
        push(eval.getEvaluator().getId(), "REACTION_SUBMITTED",
            "Сотрудник оставил реакцию",
            "Кызматкер реакция калтырды",
            eval.getEvaluatee().getFullName() + ": " + reaction.name(),
            eval.getEvaluatee().getFullName() + ": " + reaction.name(),
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealFiled(Evaluation eval, Appeal appeal) {
        push(eval.getEvaluator().getId(), "APPEAL_FILED",
            "Подана апелляция",
            "Апелляция берилди",
            "Сотрудник " + eval.getEvaluatee().getFullName() + " подал апелляцию",
            "Кызматкер " + eval.getEvaluatee().getFullName() + " апелляция берди",
            "APPEAL", appeal.getId());
    }

    @Transactional
    public void notifyAppealOverturned(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_OVERTURNED",
            "Апелляция удовлетворена",
            "Апелляция канааттандырылды",
            "Ваша оценка будет пересмотрена",
            "Сиздин баалооңуз кайра каралат",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealUpheld(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_UPHELD",
            "Апелляция отклонена",
            "Апелляция четке кагылды",
            "Оценщик подтвердил результат",
            "Баалоочу жыйынтыкты ырастады",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void notifyAppealAutoAgreed(Evaluation eval) {
        push(eval.getEvaluatee().getId(), "APPEAL_AUTO_AGREED",
            "Апелляция закрыта автоматически",
            "Апелляция автоматтык жабылды",
            "Оценщик не ответил в срок — оценка подтверждена",
            "Баалоочу мөөнөтүндө жооп бербеди — баалоо ырасталды",
            "EVALUATION", eval.getId());
    }

    @Transactional
    public void sendDeadlineReminders(EvaluationPeriod period) {
        List<Evaluation> drafts = evaluationRepository.findByPeriodIdAndStatus(
            period.getId(), Evaluation.EvaluationStatus.DRAFT);
        for (Evaluation eval : drafts) {
            push(eval.getEvaluator().getId(), "REMINDER",
                "Напоминание о сроке оценки",
                "Баалоо мөөнөтү жөнүндө эскертүү",
                "Срок: " + period.getSubmissionDeadline(),
                "Мөөнөт: " + period.getSubmissionDeadline(),
                "PERIOD", period.getId());
        }
    }

    private void push(Long userId, String type, String titleRu, String titleKg,
                      String bodyRu, String bodyKg, String entityType, Long entityId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitleRu(titleRu);
        n.setTitleKg(titleKg);
        n.setBodyRu(bodyRu);
        n.setBodyKg(bodyKg);
        n.setEntityType(entityType);
        n.setEntityId(entityId);
        notificationRepository.save(n);

        // Push via WebSocket to the specific user
        try {
            messagingTemplate.convertAndSendToUser(
                userId.toString(), "/queue/notifications", n);
        } catch (Exception e) {
            log.warn("WebSocket push failed for user {}: {}", userId, e.getMessage());
        }
    }
}
```

- [ ] **Step 3: Create NotificationController**

`backend/src/main/java/kg/gfh/kpi/controller/NotificationController.java`:
```java
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
        Long userId = resolveUserId(auth);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
            userId, PageRequest.of(page, size));
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        Long userId = resolveUserId(auth);
        long count = notificationRepository.countByUserIdAndReadFalse(userId);
        return Map.of("count", count);
    }

    @PostMapping("/mark-all-read")
    @Transactional
    public Map<String, String> markAllRead(Authentication auth) {
        Long userId = resolveUserId(auth);
        notificationRepository.markAllReadForUser(userId);
        return Map.of("status", "ok");
    }

    private Long resolveUserId(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        return userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/Notification.java \
        backend/src/main/java/kg/gfh/kpi/repository/NotificationRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/NotificationService.java \
        backend/src/main/java/kg/gfh/kpi/controller/NotificationController.java
git commit -m "feat(notifications): add NotificationService with WebSocket push and REST endpoints for unread count + mark-read"
```
