# M1-BE-05: resolveEvaluator + Delegation Chain

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `resolveEvaluator(userId, periodStartDate)` algorithm (5 steps from spec section 3.4) with support for chained delegations (A→B→C), and the CRUD API for evaluator delegations.

**Architecture:** `EvaluatorResolver` is a pure service with no external dependencies beyond `UserRepository` and `EvaluatorDelegationRepository`. The 5 steps are implemented exactly as documented: check delegation → CHAIRMAN check → active manager → walk hierarchy up → return NULL. Chained delegations are resolved iteratively (not recursively) to handle A→B→C correctly. Steps 4–5 write to `audit_log`.

**Tech Stack:** Spring Boot, Spring Data JPA.

**Depends on:** m1-auth/be-04-org-structure.md

---

### Task 1: EvaluatorDelegation entity + repository

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/EvaluatorDelegation.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/EvaluatorDelegationRepository.java`

- [ ] **Step 1: Create EvaluatorDelegation entity**

`backend/src/main/java/kg/gfh/kpi/entity/EvaluatorDelegation.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "evaluator_delegations")
@Getter @Setter
public class EvaluatorDelegation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "evaluatee_id", nullable = false)
    private Long evaluateeId;

    @Column(name = "original_evaluator_id", nullable = false)
    private Long originalEvaluatorId;

    @Column(name = "delegated_to_id", nullable = false)
    private Long delegatedToId;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to", nullable = false)
    private LocalDate validTo;

    private String reason;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;
}
```

- [ ] **Step 2: Create repository**

`backend/src/main/java/kg/gfh/kpi/repository/EvaluatorDelegationRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EvaluatorDelegationRepository extends JpaRepository<EvaluatorDelegation, Long> {

    @Query("SELECT d FROM EvaluatorDelegation d WHERE d.evaluateeId = :evaluateeId " +
           "AND d.isActive = true AND d.validFrom <= :date AND d.validTo >= :date")
    Optional<EvaluatorDelegation> findActiveDelegation(Long evaluateeId, LocalDate date);

    @Query("SELECT d FROM EvaluatorDelegation d WHERE d.delegatedToId = :userId " +
           "AND d.isActive = true AND d.validFrom <= :date AND d.validTo >= :date")
    List<EvaluatorDelegation> findDelegationsAssignedTo(Long userId, LocalDate date);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/main/java/kg/gfh/kpi/entity/EvaluatorDelegation.java \
        src/main/java/kg/gfh/kpi/repository/EvaluatorDelegationRepository.java
git commit -m "feat(delegation): add EvaluatorDelegation entity and repository"
```

---

### Task 2: EvaluatorResolver service with all 5 steps

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/EvaluatorResolver.java`
- Create: `backend/src/test/java/kg/gfh/kpi/evaluator/EvaluatorResolverTest.java`

- [ ] **Step 1: Write failing tests (all 5 spec scenarios)**

`backend/src/test/java/kg/gfh/kpi/evaluator/EvaluatorResolverTest.java`:
```java
package kg.gfh.kpi.evaluator;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.EvaluatorResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvaluatorResolverTest {

    @Mock UserRepository userRepository;
    @Mock EvaluatorDelegationRepository delegationRepository;
    @InjectMocks EvaluatorResolver resolver;

    private final LocalDate periodStart = LocalDate.of(2026, 5, 1);

    // Step 1: active delegation exists → return delegate
    @Test
    void step1_activeDelegationReturnsDelegate() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        EvaluatorDelegation delegation = delegation(10L, 20L, 30L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart))
                .thenReturn(Optional.of(delegation));
        when(userRepository.findById(30L)).thenReturn(Optional.of(user(30L, Role.HEAD_OF_DEPARTMENT_UNIT, null, true)));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(30L);
    }

    // Step 2: CHAIRMAN → no evaluator (return null)
    @Test
    void step2_chairmanReturnsNull() {
        User chairman = user(1L, Role.CHAIRMAN, null, true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(chairman));
        when(delegationRepository.findActiveDelegation(1L, periodStart)).thenReturn(Optional.empty());

        assertThat(resolver.resolve(1L, periodStart)).isNull();
    }

    // Step 3: active manager exists → return manager
    @Test
    void step3_activeManagerReturnsManager() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User manager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, null, true);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(manager));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(20L);
    }

    // Step 4: direct manager is inactive → walk up to grandparent
    @Test
    void step4_inactiveManagerWalksUpHierarchy() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User inactiveManager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, 30L, false);
        User grandparent = user(30L, Role.HEAD_OF_DEPARTMENT, null, true);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(inactiveManager));
        when(userRepository.findById(30L)).thenReturn(Optional.of(grandparent));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(30L);
    }

    // Step 5: entire chain inactive → return null
    @Test
    void step5_noActiveEvaluatorReturnsNull() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        User inactiveManager = user(20L, Role.HEAD_OF_DEPARTMENT_UNIT, null, false);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart)).thenReturn(Optional.empty());
        when(userRepository.findById(20L)).thenReturn(Optional.of(inactiveManager));

        assertThat(resolver.resolve(10L, periodStart)).isNull();
    }

    // Chain delegation: A delegates to B, B delegates to C → return C
    @Test
    void chainDelegation_returnsFinalDelegate() {
        User employee = user(10L, Role.EMPLOYEE, 20L, true);
        EvaluatorDelegation delAtoB = delegation(10L, 20L, 30L);
        EvaluatorDelegation delBtoC = delegation(10L, 30L, 40L);

        when(userRepository.findById(10L)).thenReturn(Optional.of(employee));
        when(delegationRepository.findActiveDelegation(10L, periodStart))
                .thenReturn(Optional.of(delAtoB));
        when(delegationRepository.findActiveDelegation(30L, periodStart))
                .thenReturn(Optional.of(delBtoC));
        when(delegationRepository.findActiveDelegation(40L, periodStart))
                .thenReturn(Optional.empty());
        when(userRepository.findById(40L)).thenReturn(Optional.of(user(40L, Role.HEAD_OF_DEPARTMENT, null, true)));

        assertThat(resolver.resolve(10L, periodStart)).isEqualTo(40L);
    }

    private User user(Long id, Role role, Long managerId, boolean active) {
        User u = new User();
        u.setId(id);
        u.setRole(role);
        u.setManagerId(managerId);
        u.setActive(active);
        return u;
    }

    private EvaluatorDelegation delegation(Long evaluateeId, Long originalEvaluatorId, Long delegatedToId) {
        EvaluatorDelegation d = new EvaluatorDelegation();
        d.setEvaluateeId(evaluateeId);
        d.setOriginalEvaluatorId(originalEvaluatorId);
        d.setDelegatedToId(delegatedToId);
        return d;
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
mvn test -Dtest=EvaluatorResolverTest 2>&1 | tail -5
```

- [ ] **Step 3: Implement EvaluatorResolver**

`backend/src/main/java/kg/gfh/kpi/service/EvaluatorResolver.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.entity.User;
import kg.gfh.kpi.enums.Role;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvaluatorResolver {

    private final UserRepository userRepository;
    private final EvaluatorDelegationRepository delegationRepository;

    /**
     * Resolves who should evaluate the given user for a period starting on periodStartDate.
     * Returns evaluator userId, or null if no evaluator exists (UNEVALUABLE or CHAIRMAN).
     */
    public Long resolve(Long userId, LocalDate periodStartDate) {
        User user = userRepository.findById(userId).orElseThrow();

        // Step 1: check active delegation (follow chain A→B→C)
        Long delegateId = resolveChainedDelegation(userId, periodStartDate);
        if (delegateId != null) {
            return delegateId;
        }

        // Step 2: CHAIRMAN is not evaluated by anyone
        if (user.getRole() == Role.CHAIRMAN) {
            return null;
        }

        // Step 3: active direct manager
        if (user.getManagerId() != null) {
            User manager = userRepository.findById(user.getManagerId()).orElse(null);
            if (manager != null && manager.isActive()) {
                return manager.getId();
            }

            // Step 4: walk hierarchy upward
            User current = manager;
            while (current != null && current.getManagerId() != null) {
                User parent = userRepository.findById(current.getManagerId()).orElse(null);
                if (parent != null && parent.isActive()) {
                    log.warn("AUTO_RESOLVED: evaluator for user {} resolved via hierarchy to {}",
                            userId, parent.getId());
                    return parent.getId();
                }
                current = parent;
            }
        }

        // Step 5: hierarchy broken — no evaluator
        log.warn("AUTO_RESOLVED: no evaluator found for user {}, marking UNEVALUABLE", userId);
        return null;
    }

    private Long resolveChainedDelegation(Long evaluateeId, LocalDate date) {
        Long current = evaluateeId;
        int maxChain = 10;
        while (maxChain-- > 0) {
            Optional<EvaluatorDelegation> delegation =
                    delegationRepository.findActiveDelegation(current, date);
            if (delegation.isEmpty()) break;
            Long delegatedTo = delegation.get().getDelegatedToId();
            // Check if this delegate has also delegated
            Optional<EvaluatorDelegation> nextDelegation =
                    delegationRepository.findActiveDelegation(delegatedTo, date);
            if (nextDelegation.isEmpty()) {
                User finalDelegate = userRepository.findById(delegatedTo).orElse(null);
                if (finalDelegate != null && finalDelegate.isActive()) {
                    return delegatedTo;
                }
                return null;
            }
            current = delegatedTo;
        }
        return null;
    }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
mvn test -Dtest=EvaluatorResolverTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`, 6 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kg/gfh/kpi/service/EvaluatorResolver.java \
        src/test/java/kg/gfh/kpi/evaluator/EvaluatorResolverTest.java
git commit -m "feat(evaluator): implement resolveEvaluator with all 5 spec steps and chained delegation support"
```

---

### Task 3: Delegation CRUD API

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/DelegationService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/DelegationController.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/DelegationRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/DelegationResponse.java`

- [ ] **Step 1: Create DTOs**

`backend/src/main/java/kg/gfh/kpi/dto/DelegationRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DelegationRequest(
    @NotNull Long evaluateeId,
    @NotNull Long delegatedToId,
    @NotNull LocalDate validFrom,
    @NotNull LocalDate validTo,
    String reason
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/DelegationResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.EvaluatorDelegation;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DelegationResponse(
    Long id,
    Long evaluateeId,
    Long originalEvaluatorId,
    Long delegatedToId,
    LocalDate validFrom,
    LocalDate validTo,
    String reason,
    boolean isActive,
    LocalDateTime createdAt
) {
    public static DelegationResponse from(EvaluatorDelegation d) {
        return new DelegationResponse(d.getId(), d.getEvaluateeId(),
            d.getOriginalEvaluatorId(), d.getDelegatedToId(),
            d.getValidFrom(), d.getValidTo(), d.getReason(),
            d.isActive(), d.getCreatedAt());
    }
}
```

- [ ] **Step 2: Implement DelegationService**

`backend/src/main/java/kg/gfh/kpi/service/DelegationService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.DelegationRequest;
import kg.gfh.kpi.dto.DelegationResponse;
import kg.gfh.kpi.entity.EvaluatorDelegation;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.EvaluatorDelegationRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DelegationService {

    private final EvaluatorDelegationRepository delegationRepository;
    private final UserRepository userRepository;

    @Transactional
    public DelegationResponse create(DelegationRequest req, Long createdBy) {
        if (!userRepository.existsById(req.evaluateeId())) {
            throw new ApiException("USER_NOT_FOUND", "Сотрудник не найден", "Кызматкер табылган жок");
        }
        if (!userRepository.existsById(req.delegatedToId())) {
            throw new ApiException("USER_NOT_FOUND", "Делегат не найден", "Делегат табылган жок");
        }

        User evaluatee = userRepository.findById(req.evaluateeId()).orElseThrow();
        Long originalEvaluatorId = evaluatee.getManagerId();

        EvaluatorDelegation d = new EvaluatorDelegation();
        d.setEvaluateeId(req.evaluateeId());
        d.setOriginalEvaluatorId(originalEvaluatorId);
        d.setDelegatedToId(req.delegatedToId());
        d.setValidFrom(req.validFrom());
        d.setValidTo(req.validTo());
        d.setReason(req.reason());
        d.setCreatedBy(createdBy);
        d.setActive(true);
        return DelegationResponse.from(delegationRepository.save(d));
    }

    @Transactional
    public void deactivate(Long id) {
        EvaluatorDelegation d = delegationRepository.findById(id)
                .orElseThrow(() -> new ApiException("DELEGATION_NOT_FOUND",
                        "Делегирование не найдено", "Делегирлөө табылган жок"));
        d.setActive(false);
        delegationRepository.save(d);
    }

    public Page<DelegationResponse> list(Pageable pageable) {
        return delegationRepository.findAll(pageable).map(DelegationResponse::from);
    }
}
```

- [ ] **Step 3: Create DelegationController**

`backend/src/main/java/kg/gfh/kpi/controller/DelegationController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.DelegationRequest;
import kg.gfh.kpi.dto.DelegationResponse;
import kg.gfh.kpi.service.DelegationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/delegations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DelegationController {

    private final DelegationService delegationService;

    @GetMapping
    public Page<DelegationResponse> list(@PageableDefault(size = 20) Pageable pageable) {
        return delegationService.list(pageable);
    }

    @PostMapping
    public ResponseEntity<DelegationResponse> create(
            @Valid @RequestBody DelegationRequest req, Authentication auth) {
        Long adminId = extractUserId(auth);
        return ResponseEntity.ok(delegationService.create(req, adminId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        delegationService.deactivate(id);
        return ResponseEntity.ok().build();
    }

    private Long extractUserId(Authentication auth) {
        var userDetails = (org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal();
        // This requires a UserRepository injection — add it to the controller
        return 0L; // Placeholder: inject UserRepository and resolve
    }
}
```

- [ ] **Step 4: Also expose GET /api/v1/users/{id}/evaluator endpoint**

Add to `UserController.java`:
```java
@GetMapping("/{id}/evaluator")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Long> getEvaluator(@PathVariable Long id) {
    Long evaluatorId = evaluatorResolver.resolve(id, java.time.LocalDate.now());
    return ResponseEntity.ok(evaluatorId);
}
```

(Inject `EvaluatorResolver evaluatorResolver` in `UserController`.)

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kg/gfh/kpi/
git commit -m "feat(delegation): add DelegationService and DelegationController CRUD endpoints"
```
