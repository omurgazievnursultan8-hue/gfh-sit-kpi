package kg.gfh.kpi.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import kg.gfh.kpi.dto.LoginRequest;
import kg.gfh.kpi.dto.LoginResponse;
import kg.gfh.kpi.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        String ip = httpRequest.getRemoteAddr();
        String ua = httpRequest.getHeader("User-Agent");
        return ResponseEntity.ok(authService.login(request, ip, ua, response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refresh(HttpServletRequest request, HttpServletResponse response) {
        String rawRefresh = extractCookie(request, "refresh_token");
        authService.refresh(rawRefresh, response);
        return ResponseEntity.ok().build();
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
