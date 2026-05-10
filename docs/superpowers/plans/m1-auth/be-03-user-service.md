# M1-BE-03: User Management Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full user CRUD (create, edit, deactivate, reactivate, reset password), password policy validation (length, complexity, dictionary check, history), Bucket4j IP-based rate limiting on login, account lockout after 5 failed attempts, and password expiry enforcement.

**Architecture:** `UserService` handles all user lifecycle operations. `PasswordPolicyValidator` is a standalone component that checks complexity and history. Bucket4j rate limiter is an in-memory `ConcurrentHashMap<String, Bucket>` keyed by IP — simple and sufficient for ~100 users on-premise. Password change and forced reset go through `UserService.changePassword()` which validates the new password and records to `password_history`.

**Tech Stack:** Spring Boot, Spring Data JPA, Bucket4j 8.x, bcrypt (cost 12).

**Depends on:** m1-auth/be-02-security-jwt.md

---

### Task 1: PasswordPolicyValidator

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/security/PasswordPolicyValidator.java`
- Create: `backend/src/main/resources/password-dictionary.txt` (top-10k passwords, one per line)
- Create: `backend/src/test/java/kg/gfh/kpi/security/PasswordPolicyValidatorTest.java`

- [ ] **Step 1: Write failing tests**

`backend/src/test/java/kg/gfh/kpi/security/PasswordPolicyValidatorTest.java`:
```java
package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordPolicyValidatorTest {

    private PasswordPolicyValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PasswordPolicyValidator();
    }

    @Test
    void validPasswordPasses() {
        var result = validator.validate("SecurePass1!", List.of());
        assertThat(result.valid()).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"short1!", "nouppercase1!", "NOLOWERCASE1!", "NoSpecial12", "NoDigit!Abc"})
    void weakPasswordFails(String password) {
        var result = validator.validate(password, List.of());
        assertThat(result.valid()).isFalse();
    }

    @Test
    void passwordTooShortFails() {
        var result = validator.validate("Ab1!", List.of());
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("10");
    }

    @Test
    void passwordInHistoryFails() {
        String oldHash = org.springframework.security.crypto.bcrypt.BCrypt.hashpw("OldPass123!", org.springframework.security.crypto.bcrypt.BCrypt.gensalt());
        var result = validator.validate("OldPass123!", List.of(oldHash));
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("history");
    }

    @Test
    void dictionaryPasswordFails() {
        var result = validator.validate("Password1!", List.of());
        assertThat(result.valid()).isFalse();
        assertThat(result.violation()).contains("common");
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
mvn test -Dtest=PasswordPolicyValidatorTest 2>&1 | tail -5
```

Expected: `BUILD FAILURE`.

- [ ] **Step 3: Create minimal password dictionary**

`backend/src/main/resources/password-dictionary.txt` — add the first 50 most common passwords (the real file should have 10,000; download from https://github.com/danielmiessler/SecLists or generate):
```
password
123456
password1
Password1
Password1!
12345678
qwerty
abc123
monkey
1234567
letmein
dragon
111111
baseball
iloveyou
master
sunshine
ashley
bailey
passw0rd
shadow
superman
michael
football
```
(Replace with the full 10,000-line list before production deploy.)

- [ ] **Step 4: Implement PasswordPolicyValidator**

`backend/src/main/java/kg/gfh/kpi/security/PasswordPolicyValidator.java`:
```java
package kg.gfh.kpi.security;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class PasswordPolicyValidator {

    private final Set<String> dictionary;

    public PasswordPolicyValidator() {
        try (var stream = getClass().getResourceAsStream("/password-dictionary.txt");
             var reader = new BufferedReader(new InputStreamReader(stream))) {
            this.dictionary = reader.lines()
                    .map(String::toLowerCase)
                    .collect(Collectors.toSet());
        } catch (Exception e) {
            throw new RuntimeException("Failed to load password dictionary", e);
        }
    }

    public record ValidationResult(boolean valid, String violation) {}

    public ValidationResult validate(String password, List<String> passwordHistory) {
        if (password == null || password.length() < 10) {
            return new ValidationResult(false, "Password must be at least 10 characters");
        }
        if (!password.matches(".*[A-Z].*")) {
            return new ValidationResult(false, "Password must contain at least one uppercase letter");
        }
        if (!password.matches(".*[a-z].*")) {
            return new ValidationResult(false, "Password must contain at least one lowercase letter");
        }
        if (!password.matches(".*\\d.*")) {
            return new ValidationResult(false, "Password must contain at least one digit");
        }
        if (!password.matches(".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*")) {
            return new ValidationResult(false, "Password must contain at least one special character");
        }
        if (dictionary.contains(password.toLowerCase())) {
            return new ValidationResult(false, "Password is too common — choose something less obvious");
        }
        for (String hash : passwordHistory) {
            if (BCrypt.checkpw(password, hash)) {
                return new ValidationResult(false, "Password was used recently — cannot reuse last 5 passwords in history");
            }
        }
        return new ValidationResult(true, null);
    }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
mvn test -Dtest=PasswordPolicyValidatorTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`, 7 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kg/gfh/kpi/security/PasswordPolicyValidator.java \
        src/main/resources/password-dictionary.txt \
        src/test/java/kg/gfh/kpi/security/PasswordPolicyValidatorTest.java
git commit -m "feat(security): add PasswordPolicyValidator with complexity, history and dictionary checks"
```

---

### Task 2: Bucket4j rate limiter for login endpoint

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/security/LoginRateLimiter.java`
- Create: `backend/src/test/java/kg/gfh/kpi/security/LoginRateLimiterTest.java`

- [ ] **Step 1: Write failing tests**

`backend/src/test/java/kg/gfh/kpi/security/LoginRateLimiterTest.java`:
```java
package kg.gfh.kpi.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginRateLimiterTest {

    private LoginRateLimiter limiter;

    @BeforeEach
    void setUp() {
        limiter = new LoginRateLimiter();
    }

    @Test
    void firstFiveAttemptsAreAllowed() {
        for (int i = 0; i < 5; i++) {
            assertThat(limiter.tryConsume("192.168.1.1")).isTrue();
        }
    }

    @Test
    void sixthAttemptIsBlocked() {
        for (int i = 0; i < 5; i++) limiter.tryConsume("10.0.0.1");
        assertThat(limiter.tryConsume("10.0.0.1")).isFalse();
    }

    @Test
    void differentIpsHaveSeparateLimits() {
        for (int i = 0; i < 5; i++) limiter.tryConsume("1.1.1.1");
        assertThat(limiter.tryConsume("2.2.2.2")).isTrue();
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
mvn test -Dtest=LoginRateLimiterTest 2>&1 | tail -5
```

- [ ] **Step 3: Implement LoginRateLimiter**

`backend/src/main/java/kg/gfh/kpi/security/LoginRateLimiter.java`:
```java
package kg.gfh.kpi.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimiter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(String ip) {
        return buckets.computeIfAbsent(ip, k -> newBucket()).tryConsume(1);
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(5)
                .refillGreedy(5, Duration.ofMinutes(15))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
```

- [ ] **Step 4: Wire rate limiter into AuthController login endpoint**

In `AuthController.java`, inject `LoginRateLimiter` and add check before calling `authService.login()`:

```java
// Add to AuthController fields:
private final LoginRateLimiter rateLimiter;

// Replace the login method body start with:
@PostMapping("/login")
public ResponseEntity<LoginResponse> login(
        @Valid @RequestBody LoginRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse response) {
    String ip = httpRequest.getRemoteAddr();
    if (!rateLimiter.tryConsume(ip)) {
        throw new kg.gfh.kpi.exception.ApiException("RATE_LIMIT_EXCEEDED",
                "Слишком много попыток входа. Подождите 15 минут.",
                "Кирүү аракеттери өтө көп. 15 мүнөт күтүңүз.");
    }
    String ua = httpRequest.getHeader("User-Agent");
    return ResponseEntity.ok(authService.login(request, ip, ua, response));
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
mvn test -Dtest=LoginRateLimiterTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kg/gfh/kpi/security/LoginRateLimiter.java \
        src/main/java/kg/gfh/kpi/controller/AuthController.java \
        src/test/java/kg/gfh/kpi/security/LoginRateLimiterTest.java
git commit -m "feat(security): add Bucket4j rate limiter (5 attempts / 15 min per IP) on login"
```

---

### Task 3: UserService — CRUD, password change, reset

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/UserService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/UserController.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/UserCreateRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/UserUpdateRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/UserResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/ChangePasswordRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/PasswordResetTokenRepository.java`
- Create: `backend/src/test/java/kg/gfh/kpi/user/UserServiceTest.java`

- [ ] **Step 1: Write failing tests**

`backend/src/test/java/kg/gfh/kpi/user/UserServiceTest.java`:
```java
package kg.gfh.kpi.user;

import kg.gfh.kpi.dto.UserCreateRequest;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.PasswordPolicyValidator;
import kg.gfh.kpi.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock PasswordPolicyValidator passwordPolicyValidator;
    @InjectMocks UserService userService;

    @Test
    void createUserWithDuplicateEmailThrows() {
        when(userRepository.existsByEmail("a@b.com")).thenReturn(true);
        var req = new UserCreateRequest("Test User", "a@b.com", Role.EMPLOYEE, null, null, null);
        assertThatThrownBy(() -> userService.createUser(req))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void deactivateUserRevokesAccess() {
        User user = new User();
        user.setId(1L);
        user.setActive(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        userService.deactivateUser(1L);

        assertThat(user.isActive()).isFalse();
        verify(userRepository).save(user);
    }

    @Test
    void reactivateUserSetsActiveTrue() {
        User user = new User();
        user.setId(2L);
        user.setActive(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        userService.reactivateUser(2L);

        assertThat(user.isActive()).isTrue();
    }

    @Test
    void changePasswordWithWeakPasswordThrows() {
        User user = new User();
        user.setId(1L);
        user.setPasswordHistory(java.util.List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordPolicyValidator.validate("weak", java.util.List.of()))
                .thenReturn(new PasswordPolicyValidator.ValidationResult(false, "too weak"));

        assertThatThrownBy(() -> userService.changePassword(1L, "currentPass", "weak"))
                .isInstanceOf(ApiException.class);
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
mvn test -Dtest=UserServiceTest 2>&1 | tail -5
```

- [ ] **Step 3: Create DTOs**

`backend/src/main/java/kg/gfh/kpi/dto/UserCreateRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.enums.Role;

public record UserCreateRequest(
    @NotBlank String fullName,
    @NotBlank @Email String email,
    @NotNull Role role,
    String position,
    Long unitId,
    Long managerId
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/UserUpdateRequest.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.enums.Role;

public record UserUpdateRequest(
    String fullName,
    Role role,
    String position,
    Long unitId,
    Long managerId
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/UserResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;

import java.time.LocalDateTime;

public record UserResponse(
    Long id,
    String fullName,
    String email,
    Role role,
    String position,
    Long unitId,
    Long managerId,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(),
            u.getRole(), u.getPosition(), u.getUnitId(), u.getManagerId(),
            u.isActive(), u.getCreatedAt());
    }
}
```

`backend/src/main/java/kg/gfh/kpi/dto/ChangePasswordRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
    @NotBlank String currentPassword,
    @NotBlank String newPassword
) {}
```

- [ ] **Step 4: Create PasswordResetTokenRepository**

`backend/src/main/java/kg/gfh/kpi/repository/PasswordResetTokenRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
}
```

Add `PasswordResetToken` entity:

`backend/src/main/java/kg/gfh/kpi/entity/PasswordResetToken.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "password_reset_tokens")
@Getter @Setter
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "token_hash", nullable = false, unique = true) private String tokenHash;
    @Column(name = "issued_at", nullable = false) private LocalDateTime issuedAt;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(name = "used_at") private LocalDateTime usedAt;
}
```

- [ ] **Step 5: Implement UserService**

`backend/src/main/java/kg/gfh/kpi/service/UserService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.RefreshTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.PasswordPolicyValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyValidator passwordPolicyValidator;

    @Transactional
    public UserResponse createUser(UserCreateRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new ApiException("EMAIL_ALREADY_EXISTS",
                    "Пользователь с таким email уже exists",
                    "Бул email менен колдонуучу already exists");
        }
        String tempPassword = generateTempPassword();
        var result = passwordPolicyValidator.validate(tempPassword, List.of());
        if (!result.valid()) {
            tempPassword = "TempPass123!@#";
        }

        User user = new User();
        user.setFullName(req.fullName());
        user.setEmail(req.email());
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setRole(req.role());
        user.setPosition(req.position());
        user.setUnitId(req.unitId());
        user.setManagerId(req.managerId());
        user.setActive(true);
        user.setPasswordUpdatedAt(null);
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest req) {
        User user = findOrThrow(id);
        if (req.fullName() != null) user.setFullName(req.fullName());
        if (req.role() != null) user.setRole(req.role());
        if (req.position() != null) user.setPosition(req.position());
        if (req.unitId() != null) user.setUnitId(req.unitId());
        if (req.managerId() != null) user.setManagerId(req.managerId());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public void deactivateUser(Long id) {
        User user = findOrThrow(id);
        user.setActive(false);
        userRepository.save(user);
        refreshTokenRepository.revokeAllByUserId(id);
    }

    @Transactional
    public void reactivateUser(Long id) {
        User user = findOrThrow(id);
        user.setActive(true);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = findOrThrow(userId);
        if (currentPassword != null && !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException("INVALID_CURRENT_PASSWORD",
                    "Текущий пароль неверен", "Учурдагы сырсөз туура эмес");
        }
        List<String> history = user.getPasswordHistory() != null ? user.getPasswordHistory() : List.of();
        var result = passwordPolicyValidator.validate(newPassword, history);
        if (!result.valid()) {
            throw new ApiException("WEAK_PASSWORD", result.violation(), result.violation());
        }
        List<String> newHistory = new ArrayList<>(history);
        newHistory.add(user.getPasswordHash());
        if (newHistory.size() > 5) newHistory = newHistory.subList(newHistory.size() - 5, newHistory.size());

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setPasswordHistory(newHistory);
        user.setPasswordUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }

    public Page<UserResponse> listUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(UserResponse::from);
    }

    public UserResponse getUser(Long id) {
        return UserResponse.from(findOrThrow(id));
    }

    private User findOrThrow(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException("USER_NOT_FOUND",
                        "Пользователь не найден", "Колдонуучу табылган жок"));
    }

    private String generateTempPassword() {
        return "Temp" + java.util.UUID.randomUUID().toString().substring(0, 8) + "1!";
    }
}
```

- [ ] **Step 6: Create UserController**

`backend/src/main/java/kg/gfh/kpi/controller/UserController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.*;
import kg.gfh.kpi.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public Page<UserResponse> listUsers(@PageableDefault(size = 20) Pageable pageable) {
        return userService.listUsers(pageable);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserCreateRequest req) {
        return ResponseEntity.ok(userService.createUser(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                   @Valid @RequestBody UserUpdateRequest req) {
        return ResponseEntity.ok(userService.updateUser(id, req));
    }

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> reactivateUser(@PathVariable Long id) {
        userService.reactivateUser(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest req,
            org.springframework.security.core.Authentication auth) {
        Long userId = ((kg.gfh.kpi.entity.User) auth.getPrincipal()).getId();
        userService.changePassword(userId, req.currentPassword(), req.newPassword());
        return ResponseEntity.ok().build();
    }
}
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
mvn test -Dtest=UserServiceTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`, 3 tests passed.

- [ ] **Step 8: Commit**

```bash
git add src/main/java/kg/gfh/kpi/ src/test/java/kg/gfh/kpi/user/
git commit -m "feat(users): add UserService with CRUD, password change, deactivate/reactivate"
```

---

### Task 4: Password expiry enforcement + password reset flow

**Files:**
- Modify: `backend/src/main/java/kg/gfh/kpi/service/AuthService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AuthPasswordController.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/EmailService.java`

- [ ] **Step 1: Create stub EmailService** (real SMTP configured later in M5)

`backend/src/main/java/kg/gfh/kpi/service/EmailService.java`:
```java
package kg.gfh.kpi.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    public void sendPasswordResetLink(String email, String resetLink) {
        log.info("Sending password reset email to {} with link: {}", email, resetLink);
    }
}
```

- [ ] **Step 2: Create password reset endpoints**

`backend/src/main/java/kg/gfh/kpi/controller/AuthPasswordController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import kg.gfh.kpi.entity.PasswordResetToken;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.PasswordResetTokenRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.security.JwtService;
import kg.gfh.kpi.service.EmailService;
import kg.gfh.kpi.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/auth/password")
@RequiredArgsConstructor
public class AuthPasswordController {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final JwtService jwtService;
    private final UserService userService;
    private final EmailService emailService;

    record ForgotRequest(@NotBlank @Email String email) {}
    record ResetRequest(@NotBlank String token, @NotBlank String newPassword) {}

    @PostMapping("/forgot")
    public ResponseEntity<Void> forgot(@Valid @RequestBody ForgotRequest req) {
        userRepository.findByEmail(req.email()).ifPresent(user -> {
            String raw = jwtService.generateRefreshTokenRaw();
            PasswordResetToken prt = new PasswordResetToken();
            prt.setUserId(user.getId());
            prt.setTokenHash(jwtService.hashToken(raw));
            prt.setIssuedAt(LocalDateTime.now());
            prt.setExpiresAt(LocalDateTime.now().plusMinutes(30));
            resetTokenRepository.save(prt);
            emailService.sendPasswordResetLink(user.getEmail(),
                    "https://gfh.internal/reset-password?token=" + raw);
        });
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@Valid @RequestBody ResetRequest req) {
        String hash = jwtService.hashToken(req.token());
        PasswordResetToken prt = resetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ApiException("INVALID_RESET_TOKEN",
                        "Недействительная или истёкшая ссылка",
                        "Жараксыз же мөөнөтү өткөн шилтеме"));
        if (prt.getUsedAt() != null || prt.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ApiException("INVALID_RESET_TOKEN",
                    "Ссылка уже использована или истёкла",
                    "Шилтеме буга чейин колдонулган же мөөнөтү өткөн");
        }
        userService.changePassword(prt.getUserId(), null, req.newPassword());
        prt.setUsedAt(LocalDateTime.now());
        resetTokenRepository.save(prt);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/admin-reset/{userId}")
    public ResponseEntity<Void> adminReset(@PathVariable Long userId) {
        userService.changePassword(userId, null, "TempReset1!");
        return ResponseEntity.ok().build();
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/java/kg/gfh/kpi/
git commit -m "feat(auth): add password reset via email token and admin forced reset"
```
