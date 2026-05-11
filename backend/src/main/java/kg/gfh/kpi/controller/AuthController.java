package kg.gfh.kpi.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kg.gfh.kpi.dto.LoginRequest;
import kg.gfh.kpi.dto.LoginResponse;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.LoginRateLimiter;
import kg.gfh.kpi.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginRateLimiter rateLimiter;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        String ip = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryConsume(ip)) {
            throw new ApiException("RATE_LIMIT_EXCEEDED",
                    "Слишком много попыток входа. Подождите 15 минут.",
                    "Кирүү аракеттери өтө көп. 15 мүнөт күтүңүз.");
        }
        String ua = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.login(request, ip, ua, response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefresh = extractCookie(request, "refresh_token");
        String ip = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        authService.refresh(rawRefresh, ip, userAgent, response);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/me")
    public LoginResponse me(Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        User u = userRepository.findByEmail(ud.getUsername())
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND", "Пользователь не найден", "Колдонуучу табылган жок"));
        boolean passwordExpired = u.getPasswordUpdatedAt() != null
                && u.getPasswordUpdatedAt().isBefore(java.time.LocalDateTime.now().minusDays(90));
        return new LoginResponse(u.getId(), u.getEmail(), u.getFullName(), u.getRole().name(), passwordExpired, false);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        String rawRefresh = extractCookie(request, "refresh_token");
        authService.logout(rawRefresh, response);
        return ResponseEntity.ok().build();
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst().orElse(null);
    }
}
