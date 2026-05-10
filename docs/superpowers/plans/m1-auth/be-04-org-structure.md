# M1-BE-04: Org Structure Service

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CRUD for org_units (Blocks → Departments → Units) with cycle detection on every `parent_id` change, and a `GET /api/v1/org/structure` endpoint that returns the full tree for ADMIN and CHAIRMAN.

**Architecture:** `OrgUnitService` validates acyclism by walking `parent_id` upward in-memory (graph is small — max ~30 units). On each create/update the service loads all units and traverses ancestors to ensure no cycle forms. `OrgUnitController` exposes CRUD and the tree endpoint.

**Tech Stack:** Spring Boot, Spring Data JPA, Spring Security `@PreAuthorize`.

**Depends on:** m1-auth/be-03-user-service.md

---

### Task 1: OrgUnitService with acyclism validation

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/OrgUnitService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/OrgUnitRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/OrgUnitRequest.java`
- Create: `backend/src/main/java/kg/gfh/kpi/dto/OrgUnitResponse.java`
- Create: `backend/src/test/java/kg/gfh/kpi/org/OrgUnitServiceTest.java`

- [ ] **Step 1: Write failing tests**

`backend/src/test/java/kg/gfh/kpi/org/OrgUnitServiceTest.java`:
```java
package kg.gfh.kpi.org;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import kg.gfh.kpi.service.OrgUnitService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrgUnitServiceTest {

    @Mock OrgUnitRepository orgUnitRepository;
    @InjectMocks OrgUnitService orgUnitService;

    @Test
    void detectsDirectCycle() {
        // Unit A (id=1) has parent B (id=2). Setting B's parent to A creates a cycle.
        OrgUnit unitA = orgUnit(1L, null);
        OrgUnit unitB = orgUnit(2L, 1L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(unitA, unitB));
        when(orgUnitRepository.findById(2L)).thenReturn(Optional.of(unitB));

        assertThatThrownBy(() -> orgUnitService.setParent(2L, 1L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cycle");
    }

    @Test
    void detectsIndirectCycle() {
        // A→B→C. Setting A's parent to C creates a 3-node cycle.
        OrgUnit a = orgUnit(1L, null);
        OrgUnit b = orgUnit(2L, 1L);
        OrgUnit c = orgUnit(3L, 2L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(a, b, c));
        when(orgUnitRepository.findById(1L)).thenReturn(Optional.of(a));

        assertThatThrownBy(() -> orgUnitService.setParent(1L, 3L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("cycle");
    }

    @Test
    void validReparentDoesNotThrow() {
        OrgUnit a = orgUnit(1L, null);
        OrgUnit b = orgUnit(2L, null);
        OrgUnit c = orgUnit(3L, 2L);
        when(orgUnitRepository.findAll()).thenReturn(List.of(a, b, c));
        when(orgUnitRepository.findById(3L)).thenReturn(Optional.of(c));

        // Moving C under A is fine — no cycle
        orgUnitService.setParent(3L, 1L);
    }

    private OrgUnit orgUnit(Long id, Long parentId) {
        OrgUnit u = new OrgUnit();
        u.setId(id);
        u.setParentId(parentId);
        u.setNameRu("Unit " + id);
        u.setNameKg("Unit " + id);
        u.setType(OrgUnitType.UNIT);
        return u;
    }
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
mvn test -Dtest=OrgUnitServiceTest 2>&1 | tail -5
```

- [ ] **Step 3: Create OrgUnitRepository**

`backend/src/main/java/kg/gfh/kpi/repository/OrgUnitRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrgUnitRepository extends JpaRepository<OrgUnit, Long> {
    List<OrgUnit> findByType(OrgUnitType type);
    List<OrgUnit> findByParentId(Long parentId);
}
```

- [ ] **Step 4: Create DTOs**

`backend/src/main/java/kg/gfh/kpi/dto/OrgUnitRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import kg.gfh.kpi.enums.OrgUnitType;

public record OrgUnitRequest(
    @NotBlank String nameRu,
    @NotBlank String nameKg,
    @NotNull OrgUnitType type,
    Long parentId,
    Long headUserId
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/OrgUnitResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.enums.OrgUnitType;

import java.util.List;

public record OrgUnitResponse(
    Long id,
    String nameRu,
    String nameKg,
    OrgUnitType type,
    Long parentId,
    Long headUserId,
    List<OrgUnitResponse> children
) {
    public static OrgUnitResponse from(OrgUnit u) {
        return new OrgUnitResponse(u.getId(), u.getNameRu(), u.getNameKg(),
            u.getType(), u.getParentId(), u.getHeadUserId(), List.of());
    }
}
```

- [ ] **Step 5: Implement OrgUnitService**

`backend/src/main/java/kg/gfh/kpi/service/OrgUnitService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.OrgUnitRequest;
import kg.gfh.kpi.dto.OrgUnitResponse;
import kg.gfh.kpi.entity.OrgUnit;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.OrgUnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrgUnitService {

    private final OrgUnitRepository orgUnitRepository;

    @Transactional
    public OrgUnitResponse createUnit(OrgUnitRequest req) {
        if (req.parentId() != null) {
            validateNoNewCycle(null, req.parentId());
        }
        OrgUnit unit = new OrgUnit();
        unit.setNameRu(req.nameRu());
        unit.setNameKg(req.nameKg());
        unit.setType(req.type());
        unit.setParentId(req.parentId());
        unit.setHeadUserId(req.headUserId());
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    @Transactional
    public OrgUnitResponse updateUnit(Long id, OrgUnitRequest req) {
        OrgUnit unit = findOrThrow(id);
        if (req.parentId() != null && !req.parentId().equals(unit.getParentId())) {
            validateNoNewCycle(id, req.parentId());
        }
        unit.setNameRu(req.nameRu());
        unit.setNameKg(req.nameKg());
        unit.setParentId(req.parentId());
        unit.setHeadUserId(req.headUserId());
        return OrgUnitResponse.from(orgUnitRepository.save(unit));
    }

    @Transactional
    public void deleteUnit(Long id) {
        findOrThrow(id);
        orgUnitRepository.deleteById(id);
    }

    public void setParent(Long unitId, Long newParentId) {
        validateNoNewCycle(unitId, newParentId);
        OrgUnit unit = findOrThrow(unitId);
        unit.setParentId(newParentId);
        orgUnitRepository.save(unit);
    }

    public List<OrgUnitResponse> getFullTree() {
        List<OrgUnit> all = orgUnitRepository.findAll();
        Map<Long, List<OrgUnit>> byParent = all.stream()
                .filter(u -> u.getParentId() != null)
                .collect(Collectors.groupingBy(OrgUnit::getParentId));
        return all.stream()
                .filter(u -> u.getParentId() == null)
                .map(u -> buildTree(u, byParent))
                .collect(Collectors.toList());
    }

    private OrgUnitResponse buildTree(OrgUnit unit, Map<Long, List<OrgUnit>> byParent) {
        List<OrgUnitResponse> children = byParent.getOrDefault(unit.getId(), List.of())
                .stream()
                .map(child -> buildTree(child, byParent))
                .collect(Collectors.toList());
        return new OrgUnitResponse(unit.getId(), unit.getNameRu(), unit.getNameKg(),
                unit.getType(), unit.getParentId(), unit.getHeadUserId(), children);
    }

    private void validateNoNewCycle(Long unitId, Long proposedParentId) {
        List<OrgUnit> all = orgUnitRepository.findAll();
        Map<Long, Long> parentOf = all.stream()
                .filter(u -> u.getParentId() != null)
                .collect(Collectors.toMap(OrgUnit::getId, OrgUnit::getParentId));

        if (unitId != null) {
            parentOf.put(unitId, proposedParentId);
        }

        Long current = proposedParentId;
        int steps = 0;
        while (current != null) {
            if (current.equals(unitId)) {
                throw new ApiException("CYCLE_DETECTED",
                        "Обнаружен цикл в оргструктуре",
                        "Уюм структурасында cycle аныкталды");
            }
            current = parentOf.get(current);
            if (++steps > all.size()) break;
        }
    }

    private OrgUnit findOrThrow(Long id) {
        return orgUnitRepository.findById(id)
                .orElseThrow(() -> new ApiException("ORG_UNIT_NOT_FOUND",
                        "Подразделение не найдено", "Бөлүм табылган жок"));
    }
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
mvn test -Dtest=OrgUnitServiceTest 2>&1 | tail -5
```

Expected: `BUILD SUCCESS`, 3 tests passed.

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kg/gfh/kpi/ src/test/java/kg/gfh/kpi/org/
git commit -m "feat(org): add OrgUnitService with CRUD and acyclism validation"
```

---

### Task 2: OrgUnitController + subordinates endpoint

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/controller/OrgUnitController.java`

- [ ] **Step 1: Implement OrgUnitController**

`backend/src/main/java/kg/gfh/kpi/controller/OrgUnitController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.OrgUnitRequest;
import kg.gfh.kpi.dto.OrgUnitResponse;
import kg.gfh.kpi.service.OrgUnitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/org")
@RequiredArgsConstructor
public class OrgUnitController {

    private final OrgUnitService orgUnitService;

    @GetMapping("/structure")
    @PreAuthorize("hasAnyRole('ADMIN','CHAIRMAN')")
    public ResponseEntity<List<OrgUnitResponse>> getStructure() {
        return ResponseEntity.ok(orgUnitService.getFullTree());
    }

    @PostMapping("/units")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrgUnitResponse> createUnit(@Valid @RequestBody OrgUnitRequest req) {
        return ResponseEntity.ok(orgUnitService.createUnit(req));
    }

    @PutMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrgUnitResponse> updateUnit(@PathVariable Long id,
                                                       @Valid @RequestBody OrgUnitRequest req) {
        return ResponseEntity.ok(orgUnitService.updateUnit(id, req));
    }

    @DeleteMapping("/units/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUnit(@PathVariable Long id) {
        orgUnitService.deleteUnit(id);
        return ResponseEntity.ok().build();
    }
}
```

- [ ] **Step 2: Add subordinates endpoint to UserController**

In `UserController.java` add:
```java
@GetMapping("/subordinates")
@PreAuthorize("hasAnyRole('DEPUTY_CHAIRMAN','HEAD_OF_DEPARTMENT','HEAD_OF_DEPARTMENT_UNIT')")
public ResponseEntity<List<UserResponse>> getSubordinates(
        org.springframework.security.core.Authentication auth) {
    // Get current user id from auth principal
    Long managerId = extractUserId(auth);
    return ResponseEntity.ok(userService.getDirectSubordinates(managerId));
}

private Long extractUserId(org.springframework.security.core.Authentication auth) {
    var userDetails = (org.springframework.security.core.userdetails.UserDetails) auth.getPrincipal();
    return userRepository.findByEmail(userDetails.getUsername()).orElseThrow().getId();
}
```

Add `getDirectSubordinates` to `UserService`:
```java
public List<UserResponse> getDirectSubordinates(Long managerId) {
    return userRepository.findByManagerIdAndIsActiveTrue(managerId)
            .stream().map(UserResponse::from).collect(Collectors.toList());
}
```

Add to `UserRepository`:
```java
List<User> findByManagerIdAndIsActiveTrue(Long managerId);
```

- [ ] **Step 3: Commit**

```bash
git add src/main/java/kg/gfh/kpi/
git commit -m "feat(org): add OrgUnitController with tree endpoint and subordinates endpoint"
```
