# M1-BE-02: Spring Security + JWT

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement JWT-based authentication using httpOnly cookies, CSRF double-submit cookie pattern, access/refresh token rotation, and configurable idle-timeout auto-logout.

**Architecture:** Access token (15 min) and refresh token (7 days) stored in separate httpOnly `SameSite=Strict` cookies. CSRF protection via Double Submit Cookie (CSRF token in regular cookie + `X-CSRF-TOKEN` header). A `JwtAuthenticationFilter` validates the access token on every request. On expiry the frontend silently calls `/api/v1/auth/refresh` which rotates the refresh token. Idle timeout is enforced client-side (covered in FE task); the backend invalidates the refresh token on logout.

**Tech Stack:** Spring Security 6, JJWT 0.12.x, Spring Boot 3.x.

**Depends on:** m1-auth/be-01-db-schema.md

---

### Task 1: JPA entities for M1

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/User.java`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/OrgUnit.java`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/RefreshToken.java`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/AuditLog.java`
- Create: `backend/src/main/java/kg/gfh/kpi/enums/Role.java`
- Create: `backend/src/main/java/kg/gfh/kpi/enums/OrgUnitType.java`

- [ ] **Step 1: Create Role enum**

`backend/src/main/java/kg/gfh/kpi/enums/Role.java`:
```java
package kg.gfh.kpi.enums;

public enum Role {
    ADMIN, CHAIRMAN, DEPUTY_CHAIRMAN, HEAD_OF_DEPARTMENT, HEAD_OF_DEPARTMENT_UNIT, EMPLOYEE
}
```

- [ ] **Step 2: Create OrgUnitType enum**

`backend/src/main/java/kg/gfh/kpi/enums/OrgUnitType.java`:
```java
package kg.gfh.kpi.enums;

public enum OrgUnitType {
    BLOCK, DEPARTMENT, UNIT
}
```

- [ ] **Step 3: Create User entity**

`backend/src/main/java/kg/gfh/kpi/entity/User.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import kg.gfh.kpi.enums.Role;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "users")
@Getter @Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private String position;

    @Column(name = "unit_id")
    private Long unitId;

    @Column(name = "manager_id")
    private Long managerId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "password_updated_at")
    private LocalDateTime passwordUpdatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "password_history", columnDefinition = "jsonb")
    private List<String> passwordHistory;

    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Version
    private Long version;

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

- [ ] **Step 4: Create OrgUnit entity**

`backend/src/main/java/kg/gfh/kpi/entity/OrgUnit.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import kg.gfh.kpi.enums.OrgUnitType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "org_units")
@Getter @Setter
public class OrgUnit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_kg", nullable = false)
    private String nameKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrgUnitType type;

    @Column(name = "parent_id")
    private Long parentId;

    @Column(name = "head_user_id")
    private Long headUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Version
    private Long version;
}
```

- [ ] **Step 5: Create RefreshToken entity**

`backend/src/main/java/kg/gfh/kpi/entity/RefreshToken.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "refresh_tokens")
@Getter @Setter
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(name = "ip_address")
    private String ipAddress;
}
```

- [ ] **Step 6: Commit entities**

```bash
git add src/main/java/kg/gfh/kpi/
git commit -m "feat(entity): add User, OrgUnit, RefreshToken JPA entities and enums"
```

---

### Task 2: JwtService

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/security/JwtService.java`
- Create: `backend/src/test/java/kg/gfh/kpi/security/JwtServiceTest.java`

- [ ] **Step 1: Write failing tests**

`backend/src/test/java/kg/gfh/kpi/security/JwtServiceTest.java`:
```java
package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService("test-secret-that-is-long-enough-32chars", 15, 7);
    }

    @Test
    void generateAndValidateAccessToken() {
        String token = jwtService.generateAccessToken(42L, "user@test.com");
        assertThat(jwtService.isTokenValid(token)).isTrue();
        assertThat(jwtService.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtService.extractEmail(token)).isEqualTo("user@test.com");
    }

    @Test
    void expiredTokenIsInvalid() {
        JwtService shortLivedService = new JwtService("test-secret-that-is-long-enough-32chars", 0, 7);
        String token = shortLivedService.generateAccessToken(1L, "a@b.com");
        assertThat(shortLivedService.isTokenValid(token)).isFalse();
    }

    @Test
    void generateRefreshTokenIsNotEmpty() {
        String raw = jwtService.generateRefreshTokenRaw();
        assertThat(raw).isNotBlank().hasSizeGreaterThan(32);
    }

    @Test
    void hashRefreshTokenIsDeterministic() {
        String hash1 = jwtService.hashToken("my-token");
        String hash2 = jwtService.hashToken("my-token");
        assertThat(hash1).isEqualTo(hash2);
    }
}
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
mvn test -Dtest=JwtServiceTest 2>&1 | tail -5
```

Expected: `BUILD FAILURE` — `JwtService` does not exist yet.

- [ ] **Step 3: Implement JwtService**

`backend/src/main/java/kg/gfh/kpi/security/JwtService.java`:
```java
package kg.gfh.kpi.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey key;
    private final long accessTokenMinutes;
    private final long refreshTokenDays;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-minutes:15}") long accessTokenMinutes,
            @Value("${jwt.refresh-token-days:7}") long refreshTokenDays) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenMinutes = accessTokenMinutes;
        this.refreshTokenDays = refreshTokenDays;
    }

    public String generateAccessToken(Long userId, String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(new Date(now))
                .expiration(new Date(now + accessTokenMinutes * 60 * 1000))
                .signWith(key)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        return Long.parseLong(getClaims(token).getSubject());
    }

    public String extractEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    public String generateRefreshTokenRaw() {
        byte[] bytes = new byte[48];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }

    public long refreshTokenDays() {
        return refreshTokenDays;
    }

    private Claims getClaims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
mvn test -Dtest=JwtServiceTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`, 4 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kg/gfh/kpi/security/JwtService.java \
        src/test/java/kg/gfh/kpi/security/JwtServiceTest.java
git commit -m "feat(security): add JwtService with access/refresh token generation and hashing"
```

---

### Task 3: JwtAuthenticationFilter + SecurityConfig

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/security/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/kg/gfh/kpi/security/SecurityConfig.java`
- Create: `backend/src/main/java/kg/gfh/kpi/security/UserDetailsServiceImpl.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/UserRepository.java`

- [ ] **Step 1: Create UserRepository**

`backend/src/main/java/kg/gfh/kpi/repository/UserRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Page<User> findAll(Pageable pageable);
    boolean existsByEmail(String email);
}
```

- [ ] **Step 2: Create UserDetailsServiceImpl**

`backend/src/main/java/kg/gfh/kpi/security/UserDetailsServiceImpl.java`:
```java
package kg.gfh.kpi.security;

import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPasswordHash(),
                user.isActive(),
                true, true,
                user.getLockedUntil() == null || user.getLockedUntil().isBefore(java.time.LocalDateTime.now()),
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
```

- [ ] **Step 3: Create JwtAuthenticationFilter**

`backend/src/main/java/kg/gfh/kpi/security/JwtAuthenticationFilter.java`:
```java
package kg.gfh.kpi.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String token = extractTokenFromCookie(request);
        if (token != null && jwtService.isTokenValid(token)) {
            String email = jwtService.extractEmail(token);
            var userDetails = userDetailsService.loadUserByUsername(email);
            var auth = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
            auth.setDetails(new org.springframework.security.web.authentication
                    .WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }

    private String extractTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "access_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
```

- [ ] **Step 4: Create SecurityConfig**

`backend/src/main/java/kg/gfh/kpi/security/SecurityConfig.java`:
```java
package kg.gfh.kpi.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.*;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/password/forgot",
                    "/api/v1/auth/password/reset",
                    "/actuator/health",
                    "/actuator/info",
                    "/swagger-ui/**",
                    "/v3/api-docs/**"
                ).permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kg/gfh/kpi/security/ \
        src/main/java/kg/gfh/kpi/repository/UserRepository.java
git commit -m "feat(security): add JWT filter, SecurityConfig with httpOnly cookie + CSRF, UserDetailsService"
```

---

### Task 4: Auth controller (login, logout, refresh)

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AuthController.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AuthService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/RefreshTokenRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/LoginRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/LoginResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/exception/ApiError.java`
- Create: `backend/src/main/java/kg/gfh/kpi/exception/GlobalExceptionHandler.java`

- [ ] **Step 1: Create DTOs and ApiError**

`backend/src/main/java/kg/gfh/kpi/dto/LoginRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank @Email String email,
    @NotBlank String password
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/LoginResponse.java`:
```java
package kg.gfh.kpi.dto;

public record LoginResponse(
    Long userId,
    String email,
    String role,
    boolean passwordExpired,
    boolean pdpaRequired
) {}
```

`backend/src/main/java/kg/gfh/kpi/exception/ApiError.java`:
```java
package kg.gfh.kpi.exception;

import java.util.Map;

public record ApiError(
    String code,
    String messageRu,
    String messageKg,
    Map<String, Object> details
) {}
```

- [ ] **Step 2: Create RefreshTokenRepository**

`backend/src/main/java/kg/gfh/kpi/repository/RefreshTokenRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = CURRENT_TIMESTAMP WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    void revokeAllByUserId(Long userId);
}
```

- [ ] **Step 3: Create AuthService**

`backend/src/main/java/kg/gfh/kpi/service/AuthService.java`:
```java
package kg.gfh.kpi.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import kg.gfh.kpi.dto.LoginRequest;
import kg.gfh.kpi.dto.LoginResponse;
import kg.gfh.kpi.entity.RefreshToken;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${jwt.access-token-minutes:15}")
    private long accessTokenMinutes;

    @Transactional
    public LoginResponse login(LoginRequest request, String ip, String userAgent,
                               HttpServletResponse response) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ApiException("INVALID_CREDENTIALS",
                        "Неверный email или пароль", "Email же сырсөз туура эмес"));

        if (!user.isActive()) {
            throw new ApiException("ACCOUNT_DISABLED",
                    "Аккаунт деактивирован", "Аккаунт өчүрүлгөн");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new ApiException("ACCOUNT_LOCKED",
                    "Аккаунт заблокирован до " + user.getLockedUntil(),
                    "Аккаунт " + user.getLockedUntil() + " чейин бөгөттөлгөн");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new ApiException("INVALID_CREDENTIALS",
                    "Неверный email или пароль", "Email же сырсөз туура эмес");
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String rawRefresh = jwtService.generateRefreshTokenRaw();
        String hashRefresh = jwtService.hashToken(rawRefresh);

        RefreshToken rt = new RefreshToken();
        rt.setUserId(user.getId());
        rt.setTokenHash(hashRefresh);
        rt.setIssuedAt(LocalDateTime.now());
        rt.setExpiresAt(LocalDateTime.now().plusDays(jwtService.refreshTokenDays()));
        rt.setUserAgent(userAgent);
        rt.setIpAddress(ip);
        refreshTokenRepository.save(rt);

        setTokenCookies(response, accessToken, rawRefresh);

        boolean passwordExpired = user.getPasswordUpdatedAt() != null &&
                user.getPasswordUpdatedAt().isBefore(LocalDateTime.now().minusDays(90));

        return new LoginResponse(user.getId(), user.getEmail(),
                user.getRole().name(), passwordExpired, false);
    }

    @Transactional
    public void logout(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken != null) {
            String hash = jwtService.hashToken(rawRefreshToken);
            refreshTokenRepository.findByTokenHash(hash).ifPresent(rt -> {
                rt.setRevokedAt(LocalDateTime.now());
                refreshTokenRepository.save(rt);
            });
        }
        clearTokenCookies(response);
    }

    @Transactional
    public void refresh(String rawRefreshToken, HttpServletResponse response) {
        if (rawRefreshToken == null) {
            throw new ApiException("INVALID_REFRESH_TOKEN",
                    "Refresh token отсутствует", "Refresh token жок");
        }
        String hash = jwtService.hashToken(rawRefreshToken);
        RefreshToken rt = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException("INVALID_REFRESH_TOKEN",
                        "Недействительный refresh token", "Жараксыз refresh token"));

        if (rt.getRevokedAt() != null) {
            refreshTokenRepository.revokeAllByUserId(rt.getUserId());
            clearTokenCookies(response);
            throw new ApiException("TOKEN_REUSE_DETECTED",
                    "Обнаружено повторное использование токена",
                    "Токенди кайра колдонуу аныкталды");
        }

        if (rt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("REFRESH_TOKEN_EXPIRED",
                    "Refresh token истёк", "Refresh token мөөнөтү бүттү");
        }

        rt.setRevokedAt(LocalDateTime.now());
        rt.setUsedAt(LocalDateTime.now());
        refreshTokenRepository.save(rt);

        User user = userRepository.findById(rt.getUserId()).orElseThrow();
        String newAccess = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String newRawRefresh = jwtService.generateRefreshTokenRaw();

        RefreshToken newRt = new RefreshToken();
        newRt.setUserId(user.getId());
        newRt.setTokenHash(jwtService.hashToken(newRawRefresh));
        newRt.setIssuedAt(LocalDateTime.now());
        newRt.setExpiresAt(LocalDateTime.now().plusDays(jwtService.refreshTokenDays()));
        refreshTokenRepository.save(newRt);

        setTokenCookies(response, newAccess, newRawRefresh);
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= 5) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(30));
            user.setFailedLoginAttempts(0);
        }
        userRepository.save(user);
    }

    private void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        addCookie(response, "access_token", accessToken, (int)(accessTokenMinutes * 60));
        addCookie(response, "refresh_token", refreshToken,
                (int)(jwtService.refreshTokenDays() * 24 * 3600));
    }

    private void clearTokenCookies(HttpServletResponse response) {
        addCookie(response, "access_token", "", 0);
        addCookie(response, "refresh_token", "", 0);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Strict");
        response.addCookie(cookie);
    }
}
```

- [ ] **Step 4: Create ApiException and GlobalExceptionHandler**

`backend/src/main/java/kg/gfh/kpi/exception/ApiException.java`:
```java
package kg.gfh.kpi.exception;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final String code;
    private final String messageRu;
    private final String messageKg;

    public ApiException(String code, String messageRu, String messageKg) {
        super(messageRu);
        this.code = code;
        this.messageRu = messageRu;
        this.messageKg = messageKg;
    }
}
```

`backend/src/main/java/kg/gfh/kpi/exception/GlobalExceptionHandler.java`:
```java
package kg.gfh.kpi.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex) {
        return ResponseEntity.badRequest().body(
            new ApiError(ex.getCode(), ex.getMessageRu(), ex.getMessageKg(), Map.of()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> details = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage));
        return ResponseEntity.badRequest().body(
            new ApiError("VALIDATION_ERROR", "Ошибка валидации", "Текшерүү катасы", details));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneral(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            new ApiError("INTERNAL_ERROR", "Внутренняя ошибка сервера",
                    "Сервердин ички катасы", Map.of()));
    }
}
```

- [ ] **Step 5: Create AuthController**

`backend/src/main/java/kg/gfh/kpi/controller/AuthController.java`:
```java
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
```

- [ ] **Step 6: Write integration test for login/logout/refresh**

`backend/src/test/java/kg/gfh/kpi/auth/AuthIntegrationTest.java`:
```java
package kg.gfh.kpi.auth;

import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("gfh_test").withUsername("gfh").withPassword("gfh");

    @org.springframework.test.context.DynamicPropertySource
    static void props(org.springframework.test.context.DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired MockMvc mockMvc;
    @Autowired UserRepository userRepository;
    @Autowired PasswordEncoder passwordEncoder;

    @BeforeEach
    void seed() {
        userRepository.deleteAll();
        User u = new User();
        u.setEmail("admin@gfh.kg");
        u.setFullName("Admin User");
        u.setPasswordHash(passwordEncoder.encode("Secret123!"));
        u.setRole(Role.ADMIN);
        u.setActive(true);
        u.setPasswordUpdatedAt(LocalDateTime.now());
        userRepository.save(u);
    }

    @Test
    void loginWithValidCredentialsReturns200AndSetsCookies() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@gfh.kg\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@gfh.kg"))
                .andExpect(cookie().exists("access_token"))
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("access_token", true))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void loginWithWrongPasswordReturns400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@gfh.kg\",\"password\":\"wrong\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }
}
```

- [ ] **Step 7: Run integration test**

```bash
mvn test -Dtest=AuthIntegrationTest 2>&1 | tail -10
```

Expected: `BUILD SUCCESS`, 2 tests passed.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/kg/gfh/kpi/ src/test/java/kg/gfh/kpi/auth/
git commit -m "feat(auth): add login/logout/refresh endpoints with httpOnly cookie JWT and token rotation"
```
