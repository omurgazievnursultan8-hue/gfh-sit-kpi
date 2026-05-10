# M2-BE-02: CriteriaService — Scope Inheritance, Weight Validation, Freeze, Reactivation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `CriteriaService` with full CRUD, scope inheritance (global vs org-unit-specific), weight sum validation (POSITIVE criteria for a given scope must sum to ≤100%), freeze logic (criteria with existing scores cannot change weight), and safe reactivation.

**Architecture:** Criteria are scoped either globally (`org_unit_id = null`) or per org unit. When evaluating, effective criteria = org-unit-specific criteria (if any) + global criteria not overridden by org-unit criteria. Weight validation checks sum within a type+scope combination. `is_frozen` is set automatically when any `evaluation_score_history` row references the criteria; weight update is rejected for frozen criteria.

**Tech Stack:** Spring Boot 3.x, Spring Data JPA, PostgreSQL 15.

**Depends on:** m2-criteria/be-01-db-schema.md

---

### Task 1: Criteria entity + repository

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/Criteria.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/CriteriaRepository.java`

- [ ] **Step 1: Create Criteria entity**

`backend/src/main/java/kg/gfh/kpi/entity/Criteria.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "criteria")
@Getter @Setter
public class Criteria {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_kg", nullable = false)
    private String nameKg;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CriteriaType type;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "org_unit_id")
    private OrgUnit orgUnit;

    @Column(name = "is_auto_calculated", nullable = false)
    private boolean autoCalculated = false;

    @Column(name = "is_frozen", nullable = false)
    private boolean frozen = false;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public enum CriteriaType { POSITIVE, ANTI_BONUS }
}
```

- [ ] **Step 2: Create CriteriaRepository**

`backend/src/main/java/kg/gfh/kpi/repository/CriteriaRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface CriteriaRepository extends JpaRepository<Criteria, Long> {

    Page<Criteria> findByIsActiveTrue(Pageable pageable);

    List<Criteria> findByTypeAndOrgUnitIdAndIsActiveTrue(CriteriaType type, Long orgUnitId);

    List<Criteria> findByTypeAndOrgUnitIsNullAndIsActiveTrue(CriteriaType type);

    @Query("""
        SELECT COALESCE(SUM(c.weight), 0)
        FROM Criteria c
        WHERE c.type = :type
          AND c.isActive = true
          AND (:orgUnitId IS NULL AND c.orgUnit IS NULL
               OR c.orgUnit.id = :orgUnitId)
          AND (:excludeId IS NULL OR c.id <> :excludeId)
        """)
    BigDecimal sumWeightByTypeAndScope(
        @Param("type") CriteriaType type,
        @Param("orgUnitId") Long orgUnitId,
        @Param("excludeId") Long excludeId
    );

    boolean existsByIdAndFrozenTrue(Long id);
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/Criteria.java \
        backend/src/main/java/kg/gfh/kpi/repository/CriteriaRepository.java
git commit -m "feat(criteria): add Criteria entity and repository with scope/weight queries"
```

---

### Task 2: CriteriaService + DTOs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java`

- [ ] **Step 1: Create DTOs**

`backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.*;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;

public record CriteriaRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @NotNull CriteriaType type,
    @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal weight,
    Long orgUnitId,
    boolean autoCalculated
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CriteriaResponse(
    Long id,
    String nameRu,
    String nameKg,
    CriteriaType type,
    BigDecimal weight,
    Long orgUnitId,
    String orgUnitName,
    boolean autoCalculated,
    boolean frozen,
    boolean active,
    LocalDateTime createdAt
) {
    public static CriteriaResponse from(Criteria c) {
        return new CriteriaResponse(
            c.getId(), c.getNameRu(), c.getNameKg(), c.getType(), c.getWeight(),
            c.getOrgUnit() != null ? c.getOrgUnit().getId() : null,
            c.getOrgUnit() != null ? c.getOrgUnit().getName() : null,
            c.isAutoCalculated(), c.isFrozen(), c.isActive(), c.getCreatedAt()
        );
    }
}
```

- [ ] **Step 2: Create CriteriaService**

`backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.dto.CriteriaResponse;
import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CriteriaRepository;
import kg.gfh.kpi.repository.OrgUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CriteriaService {

    private final CriteriaRepository criteriaRepository;
    private final OrgUnitRepository orgUnitRepository;

    public Page<CriteriaResponse> listActive(Pageable pageable) {
        return criteriaRepository.findByIsActiveTrue(pageable).map(CriteriaResponse::from);
    }

    @Transactional
    public CriteriaResponse create(CriteriaRequest req) {
        validateWeightSum(req.type(), req.orgUnitId(), req.weight(), null);

        Criteria c = new Criteria();
        c.setNameRu(req.nameRu());
        c.setNameKg(req.nameKg());
        c.setType(req.type());
        c.setWeight(req.weight());
        c.setAutoCalculated(req.autoCalculated());
        if (req.orgUnitId() != null) {
            c.setOrgUnit(orgUnitRepository.findById(req.orgUnitId())
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                    "Подразделение не найдено", "Бөлүм табылган жок")));
        }
        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    @Transactional
    public CriteriaResponse update(Long id, CriteriaRequest req) {
        Criteria c = findById(id);

        if (c.isFrozen() && !c.getWeight().equals(req.weight())) {
            throw new ApiException("CRITERIA_FROZEN",
                "Вес критерия заморожен — по нему уже есть оценки",
                "Критерийдин салмагы тоңдурулган — боюнча баалоолор бар");
        }

        validateWeightSum(req.type(), req.orgUnitId(), req.weight(), id);

        c.setNameRu(req.nameRu());
        c.setNameKg(req.nameKg());
        c.setType(req.type());
        c.setWeight(req.weight());
        c.setAutoCalculated(req.autoCalculated());

        OrgUnit orgUnit = req.orgUnitId() != null
            ? orgUnitRepository.findById(req.orgUnitId())
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                    "Подразделение не найдено", "Бөлүм табылган жок"))
            : null;
        c.setOrgUnit(orgUnit);

        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    @Transactional
    public void deactivate(Long id) {
        Criteria c = findById(id);
        c.setActive(false);
        criteriaRepository.save(c);
    }

    @Transactional
    public CriteriaResponse reactivate(Long id) {
        Criteria c = findById(id);
        // Re-check weight sum would not exceed 100% after reactivation
        validateWeightSum(c.getType(), c.getOrgUnit() != null ? c.getOrgUnit().getId() : null,
            c.getWeight(), null);
        c.setActive(true);
        return CriteriaResponse.from(criteriaRepository.save(c));
    }

    private void validateWeightSum(CriteriaType type, Long orgUnitId, BigDecimal newWeight, Long excludeId) {
        // Weight validation only applies to POSITIVE criteria
        if (type != CriteriaType.POSITIVE) return;

        BigDecimal existing = criteriaRepository.sumWeightByTypeAndScope(type, orgUnitId, excludeId);
        BigDecimal total = existing.add(newWeight);
        if (total.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new ApiException("WEIGHT_SUM_EXCEEDS_100",
                String.format("Сумма весов превысит 100%% (текущая: %.2f%%, новая: %.2f%%)", existing, newWeight),
                String.format("Салмактардын суммасы 100%%дан ашат (учурдагы: %.2f%%, жаңы: %.2f%%)", existing, newWeight));
        }
    }

    private Criteria findById(Long id) {
        return criteriaRepository.findById(id)
            .orElseThrow(() -> new ApiException("CRITERIA_NOT_FOUND",
                "Критерий не найден", "Критерий табылган жок"));
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/CriteriaRequest.java \
        backend/src/main/java/kg/gfh/kpi/dto/CriteriaResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/CriteriaService.java
git commit -m "feat(criteria): add CriteriaService with weight validation, freeze check, and reactivation"
```

---

### Task 3: CriteriaController + tests

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/controller/CriteriaController.java`
- Create: `backend/src/test/java/kg/gfh/kpi/service/CriteriaServiceTest.java`

- [ ] **Step 1: Create CriteriaController**

`backend/src/main/java/kg/gfh/kpi/controller/CriteriaController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.dto.CriteriaResponse;
import kg.gfh.kpi.service.CriteriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/criteria")
@RequiredArgsConstructor
public class CriteriaController {

    private final CriteriaService criteriaService;

    @GetMapping
    public Page<CriteriaResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return criteriaService.listActive(PageRequest.of(page, size));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CriteriaResponse> create(@Valid @RequestBody CriteriaRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(criteriaService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CriteriaResponse update(@PathVariable Long id, @Valid @RequestBody CriteriaRequest req) {
        return criteriaService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        criteriaService.deactivate(id);
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public CriteriaResponse reactivate(@PathVariable Long id) {
        return criteriaService.reactivate(id);
    }
}
```

- [ ] **Step 2: Write CriteriaService unit tests**

`backend/src/test/java/kg/gfh/kpi/service/CriteriaServiceTest.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.CriteriaRequest;
import kg.gfh.kpi.entity.Criteria;
import kg.gfh.kpi.entity.Criteria.CriteriaType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.CriteriaRepository;
import kg.gfh.kpi.repository.OrgUnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CriteriaServiceTest {

    @Mock CriteriaRepository criteriaRepository;
    @Mock OrgUnitRepository orgUnitRepository;
    @InjectMocks CriteriaService criteriaService;

    @BeforeEach
    void setUp() {
        // Default: no existing weight
        when(criteriaRepository.sumWeightByTypeAndScope(any(), any(), any()))
            .thenReturn(BigDecimal.ZERO);
    }

    @Test
    void create_positiveWithinLimit_succeeds() {
        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), isNull(), isNull()))
            .thenReturn(BigDecimal.valueOf(60));

        Criteria saved = new Criteria();
        saved.setId(1L);
        saved.setNameRu("Test");
        saved.setNameKg("Test KG");
        saved.setType(CriteriaType.POSITIVE);
        saved.setWeight(BigDecimal.valueOf(30));
        when(criteriaRepository.save(any())).thenReturn(saved);

        var req = new CriteriaRequest("Test", "Test KG", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatCode(() -> criteriaService.create(req)).doesNotThrowAnyException();
    }

    @Test
    void create_positiveExceedsLimit_throwsApiException() {
        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), isNull(), isNull()))
            .thenReturn(BigDecimal.valueOf(80));

        var req = new CriteriaRequest("Test", "Test KG", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatThrownBy(() -> criteriaService.create(req))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("WEIGHT_SUM_EXCEEDS_100");
    }

    @Test
    void create_antiBonusSkipsWeightValidation_succeeds() {
        Criteria saved = new Criteria();
        saved.setId(2L);
        saved.setNameRu("Anti");
        saved.setNameKg("Anti KG");
        saved.setType(CriteriaType.ANTI_BONUS);
        saved.setWeight(BigDecimal.valueOf(150));
        when(criteriaRepository.save(any())).thenReturn(saved);

        var req = new CriteriaRequest("Anti", "Anti KG", CriteriaType.ANTI_BONUS,
            BigDecimal.valueOf(150), null, false);

        // Anti-bonus has no weight ceiling — should not throw
        assertThatCode(() -> criteriaService.create(req)).doesNotThrowAnyException();
        verify(criteriaRepository, never()).sumWeightByTypeAndScope(any(), any(), any());
    }

    @Test
    void update_frozenCriteriaChangingWeight_throwsApiException() {
        Criteria frozen = new Criteria();
        frozen.setId(1L);
        frozen.setType(CriteriaType.POSITIVE);
        frozen.setWeight(BigDecimal.valueOf(20));
        frozen.setFrozen(true);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(frozen));

        var req = new CriteriaRequest("X", "X", CriteriaType.POSITIVE,
            BigDecimal.valueOf(30), null, false);

        assertThatThrownBy(() -> criteriaService.update(1L, req))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("CRITERIA_FROZEN");
    }

    @Test
    void update_frozenCriteriaSameWeight_succeeds() {
        Criteria frozen = new Criteria();
        frozen.setId(1L);
        frozen.setNameRu("X");
        frozen.setNameKg("X");
        frozen.setType(CriteriaType.POSITIVE);
        frozen.setWeight(BigDecimal.valueOf(20));
        frozen.setFrozen(true);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(frozen));
        when(criteriaRepository.save(any())).thenReturn(frozen);

        var req = new CriteriaRequest("X Updated", "X Updated", CriteriaType.POSITIVE,
            BigDecimal.valueOf(20), null, false);

        assertThatCode(() -> criteriaService.update(1L, req)).doesNotThrowAnyException();
    }

    @Test
    void reactivate_wouldExceedWeight_throwsApiException() {
        Criteria inactive = new Criteria();
        inactive.setId(1L);
        inactive.setType(CriteriaType.POSITIVE);
        inactive.setWeight(BigDecimal.valueOf(40));
        inactive.setActive(false);
        when(criteriaRepository.findById(1L)).thenReturn(Optional.of(inactive));

        // 70% already occupied
        when(criteriaRepository.sumWeightByTypeAndScope(eq(CriteriaType.POSITIVE), any(), isNull()))
            .thenReturn(BigDecimal.valueOf(70));

        assertThatThrownBy(() -> criteriaService.reactivate(1L))
            .isInstanceOf(ApiException.class)
            .hasMessageContaining("WEIGHT_SUM_EXCEEDS_100");
    }
}
```

- [ ] **Step 3: Run tests**

```bash
cd backend && mvn test -Dtest=CriteriaServiceTest
```

Expected: 6 tests, all green.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/controller/CriteriaController.java \
        backend/src/test/java/kg/gfh/kpi/service/CriteriaServiceTest.java
git commit -m "feat(criteria): add CriteriaController + unit tests for weight validation and freeze logic"
```
