# M2-BE-04: AutoAntiBonusService + Spring Cache (Caffeine)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `AutoAntiBonusService` that automatically computes anti-bonus scores for criteria marked `is_auto_calculated = true` from production calendar data. Add Caffeine caching for production calendar lookups and the system settings that are read on every request.

**Architecture:** Auto-calculated anti-bonus criteria derive their `raw_value` from the ratio of (absence days / working days in month). `AutoAntiBonusService.computeAutoValue(absenceDays, yearMonth)` looks up working days from `production_calendar`, returns `(absenceDays / workingDays) * 100` as a percentage. Caffeine cache with 5-minute TTL avoids repeated DB hits on every scoring page load. Eviction triggered when admin updates a production calendar entry.

**Tech Stack:** Spring Boot 3.x, Caffeine 3.x (spring-boot-starter-cache), Spring Data JPA.

**Depends on:** m2-criteria/be-03-rating-service.md

---

### Task 1: Production calendar entity + service

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/ProductionCalendar.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/ProductionCalendarRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/ProductionCalendarService.java`

- [ ] **Step 1: Create entity + repository**

`backend/src/main/java/kg/gfh/kpi/entity/ProductionCalendar.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "production_calendar",
       uniqueConstraints = @UniqueConstraint(columnNames = {"year", "month"}))
@Getter @Setter
public class ProductionCalendar {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Column(name = "working_days", nullable = false)
    private Integer workingDays;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }
}
```

`backend/src/main/java/kg/gfh/kpi/repository/ProductionCalendarRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.ProductionCalendar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProductionCalendarRepository extends JpaRepository<ProductionCalendar, Long> {
    Optional<ProductionCalendar> findByYearAndMonth(Integer year, Integer month);
}
```

- [ ] **Step 2: Create ProductionCalendarService with cache**

`backend/src/main/java/kg/gfh/kpi/service/ProductionCalendarService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.ProductionCalendarRequest;
import kg.gfh.kpi.dto.ProductionCalendarResponse;
import kg.gfh.kpi.entity.ProductionCalendar;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.ProductionCalendarRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductionCalendarService {

    private final ProductionCalendarRepository repo;

    public List<ProductionCalendarResponse> findAll() {
        return repo.findAll(Sort.by("year", "month")).stream()
            .map(ProductionCalendarResponse::from)
            .toList();
    }

    @Cacheable(value = "productionCalendar", key = "#yearMonth.toString()")
    public int getWorkingDays(YearMonth yearMonth) {
        return repo.findByYearAndMonth(yearMonth.getYear(), yearMonth.getMonthValue())
            .map(ProductionCalendar::getWorkingDays)
            .orElseThrow(() -> new ApiException("CALENDAR_NOT_FOUND",
                "Производственный календарь не настроен для " + yearMonth,
                "Өндүрүштүк календарь " + yearMonth + " үчүн орнотулган жок"));
    }

    @Transactional
    @CacheEvict(value = "productionCalendar", allEntries = true)
    public ProductionCalendarResponse upsert(ProductionCalendarRequest req, Long actorId) {
        ProductionCalendar cal = repo.findByYearAndMonth(req.year(), req.month())
            .orElseGet(ProductionCalendar::new);
        cal.setYear(req.year());
        cal.setMonth(req.month());
        cal.setWorkingDays(req.workingDays());
        cal.setCreatedBy(actorId);
        return ProductionCalendarResponse.from(repo.save(cal));
    }
}
```

Create DTOs:

`backend/src/main/java/kg/gfh/kpi/dto/ProductionCalendarRequest.java`:
```java
package kg.gfh.kpi.dto;

import jakarta.validation.constraints.*;

public record ProductionCalendarRequest(
    @NotNull @Min(2020) @Max(2100) Integer year,
    @NotNull @Min(1) @Max(12) Integer month,
    @NotNull @Min(0) @Max(31) Integer workingDays
) {}
```

`backend/src/main/java/kg/gfh/kpi/dto/ProductionCalendarResponse.java`:
```java
package kg.gfh.kpi.dto;

import kg.gfh.kpi.entity.ProductionCalendar;

public record ProductionCalendarResponse(Long id, Integer year, Integer month, Integer workingDays) {
    public static ProductionCalendarResponse from(ProductionCalendar c) {
        return new ProductionCalendarResponse(c.getId(), c.getYear(), c.getMonth(), c.getWorkingDays());
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/entity/ProductionCalendar.java \
        backend/src/main/java/kg/gfh/kpi/repository/ProductionCalendarRepository.java \
        backend/src/main/java/kg/gfh/kpi/service/ProductionCalendarService.java \
        backend/src/main/java/kg/gfh/kpi/dto/ProductionCalendarRequest.java \
        backend/src/main/java/kg/gfh/kpi/dto/ProductionCalendarResponse.java
git commit -m "feat(calendar): add ProductionCalendarService with Caffeine @Cacheable and cache eviction on update"
```

---

### Task 2: AutoAntiBonusService + Caffeine config

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/service/AutoAntiBonusService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/config/CacheConfig.java`
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Create AutoAntiBonusService**

`backend/src/main/java/kg/gfh/kpi/service/AutoAntiBonusService.java`:
```java
package kg.gfh.kpi.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;

/**
 * Computes raw values for auto-calculated anti-bonus criteria.
 *
 * Auto anti-bonus formula: (absenceDays / workingDaysInMonth) * 100
 * Result represents absence as a percentage of working time.
 * Capped at 100 (full absence).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AutoAntiBonusService {

    private final ProductionCalendarService calendarService;

    @Cacheable(value = "autoAntiBonusRate", key = "#yearMonth.toString() + '_' + #absenceDays")
    public BigDecimal computeAutoValue(int absenceDays, YearMonth yearMonth) {
        int workingDays = calendarService.getWorkingDays(yearMonth);

        if (workingDays == 0) {
            log.warn("Working days is 0 for {}, returning 0 anti-bonus", yearMonth);
            return BigDecimal.ZERO;
        }

        BigDecimal rate = BigDecimal.valueOf(absenceDays)
            .divide(BigDecimal.valueOf(workingDays), 4, RoundingMode.HALF_UP)
            .multiply(BigDecimal.valueOf(100));

        // Cap at 100% — cannot be absent more than all working days
        return rate.min(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP);
    }
}
```

- [ ] **Step 2: Configure Caffeine cache**

`backend/src/main/java/kg/gfh/kpi/config/CacheConfig.java`:
```java
package kg.gfh.kpi.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(
            "productionCalendar",
            "autoAntiBonusRate",
            "systemSettings"
        );
        manager.setCaffeine(Caffeine.newBuilder()
            .expireAfterWrite(5, TimeUnit.MINUTES)
            .maximumSize(500));
        return manager;
    }
}
```

Add `spring-boot-starter-cache` and `caffeine` to `pom.xml` if not already present:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
<dependency>
    <groupId>com.github.ben-manes.caffeine</groupId>
    <artifactId>caffeine</artifactId>
</dependency>
```

- [ ] **Step 3: Add SystemSettings caching**

In `SystemSettingService.java`, add `@Cacheable` to `getValueOrDefault`:
```java
@Cacheable(value = "systemSettings", key = "#key")
public String getValueOrDefault(String key, String defaultValue) {
    return repo.findById(key).map(SystemSetting::getValue).orElse(defaultValue);
}

@CacheEvict(value = "systemSettings", key = "#key")
@Transactional
public SystemSetting update(String key, String value) {
    // ... existing implementation
}
```

- [ ] **Step 4: Create REST controllers for settings and calendar**

`backend/src/main/java/kg/gfh/kpi/controller/SystemSettingController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.entity.SystemSetting;
import kg.gfh.kpi.service.SystemSettingService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SystemSettingController {

    private final SystemSettingService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<SystemSetting> findAll() {
        return service.findAll();
    }

    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public SystemSetting update(@PathVariable String key, @RequestBody Map<String, String> body) {
        return service.update(key, body.get("value"));
    }
}
```

`backend/src/main/java/kg/gfh/kpi/controller/ProductionCalendarController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.validation.Valid;
import kg.gfh.kpi.dto.ProductionCalendarRequest;
import kg.gfh.kpi.dto.ProductionCalendarResponse;
import kg.gfh.kpi.repository.UserRepository;
import kg.gfh.kpi.service.ProductionCalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class ProductionCalendarController {

    private final ProductionCalendarService service;
    private final UserRepository userRepository;

    @GetMapping
    public List<ProductionCalendarResponse> findAll() {
        return service.findAll();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ProductionCalendarResponse upsert(
            @Valid @RequestBody ProductionCalendarRequest req,
            Authentication auth) {
        UserDetails ud = (UserDetails) auth.getPrincipal();
        Long userId = userRepository.findByEmail(ud.getUsername()).orElseThrow().getId();
        return service.upsert(req, userId);
    }
}
```

- [ ] **Step 5: Write AutoAntiBonusService unit tests**

`backend/src/test/java/kg/gfh/kpi/service/AutoAntiBonusServiceTest.java`:
```java
package kg.gfh.kpi.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.YearMonth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutoAntiBonusServiceTest {

    @Mock ProductionCalendarService calendarService;
    @InjectMocks AutoAntiBonusService service;

    private final YearMonth JAN_2026 = YearMonth.of(2026, 1);

    @Test
    void compute_absenceDaysPartial() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        // 2 days absent out of 22 working days = 9.09%
        BigDecimal result = service.computeAutoValue(2, JAN_2026);
        assertThat(result).isEqualByComparingTo("9.09");
    }

    @Test
    void compute_noAbsence_returnsZero() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        assertThat(service.computeAutoValue(0, JAN_2026)).isEqualByComparingTo("0.00");
    }

    @Test
    void compute_fullAbsence_cappedAt100() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(22);
        // Even 30 absence days out of 22 working days is capped at 100
        assertThat(service.computeAutoValue(30, JAN_2026)).isEqualByComparingTo("100.00");
    }

    @Test
    void compute_zeroWorkingDays_returnsZero() {
        when(calendarService.getWorkingDays(JAN_2026)).thenReturn(0);
        assertThat(service.computeAutoValue(5, JAN_2026)).isEqualByComparingTo("0.00");
    }
}
```

- [ ] **Step 6: Run tests**

```bash
cd backend && mvn test -Dtest=AutoAntiBonusServiceTest
```

Expected: 4 tests, all green.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/service/AutoAntiBonusService.java \
        backend/src/main/java/kg/gfh/kpi/config/CacheConfig.java \
        backend/src/main/java/kg/gfh/kpi/controller/SystemSettingController.java \
        backend/src/main/java/kg/gfh/kpi/controller/ProductionCalendarController.java \
        backend/src/test/java/kg/gfh/kpi/service/AutoAntiBonusServiceTest.java
git commit -m "feat(cache): add AutoAntiBonusService + Caffeine config (5-min TTL) + settings/calendar controllers"
```
