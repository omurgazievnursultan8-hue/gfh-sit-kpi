# M5-BE-02: Audit API + Admin Stats + Quartz Jobs Status + Error Logs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose REST endpoints for the admin panel: paginated audit log with Excel export, system-wide statistics, Quartz job status listing, and last 20 lines of the error log file.

**Architecture:** `AuditController` at `/api/v1/admin/audit` reuses `AuditLogRepository.search()` from M5-BE-01 and streams Excel via Apache POI (already in pom.xml from M4-BE-03). `AdminController` at `/api/v1/admin` delegates to `AdminService` which queries repositories directly for stats, uses the Quartz `Scheduler` bean for job info, and reads the logback error log file from the filesystem. All endpoints require `ROLE_ADMIN`.

**Tech Stack:** Spring Boot 3.x, Spring Data JPA, Quartz, Apache POI 5.x, PostgreSQL 15.

**Depends on:** m5-admin/be-01-audit-aop-trigger.md, m4-analytics/be-03-report-service.md

---

### Task 1: AuditController — paginated audit log + Excel export

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/AuditLogResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AuditController.java`

- [ ] **Step 1: Create AuditLogResponse DTO**

`backend/src/main/java/kg/gfh/kpi/dto/AuditLogResponse.java`:
```java
package kg.gfh.kpi.dto;

import java.time.LocalDateTime;

public record AuditLogResponse(
    Long id,
    Long actorId,
    String actorEmail,
    String action,
    String entityType,
    Long entityId,
    String details,
    String ipAddress,
    LocalDateTime createdAt
) {}
```

- [ ] **Step 2: Create AuditController**

`backend/src/main/java/kg/gfh/kpi/controller/AuditController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AuditLogResponse;
import kg.gfh.kpi.entity.AuditLog;
import kg.gfh.kpi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public Page<AuditLogResponse> search(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20, sort = "createdAt",
                direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return auditLogRepository.search(actorId, action, entityType, from, to, pageable)
                .map(this::toResponse);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) Long actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) throws IOException {
        // Export up to 10,000 rows; use a large page to avoid OOM on typical audit volumes
        List<AuditLog> rows = auditLogRepository
                .search(actorId, action, entityType, from, to,
                        Pageable.ofSize(10_000))
                .getContent();

        try (XSSFWorkbook wb = new XSSFWorkbook()) {
            Sheet sheet = wb.createSheet("Аудит");

            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            String[] headers = {"ID", "Actor ID", "Email", "Action", "Entity Type",
                    "Entity ID", "Details", "IP Address", "Timestamp"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (AuditLog log : rows) {
                Row r = sheet.createRow(rowNum++);
                r.createCell(0).setCellValue(log.getId());
                r.createCell(1).setCellValue(log.getActorId());
                r.createCell(2).setCellValue(log.getActorEmail());
                r.createCell(3).setCellValue(log.getAction());
                r.createCell(4).setCellValue(log.getEntityType() != null ? log.getEntityType() : "");
                if (log.getEntityId() != null) r.createCell(5).setCellValue(log.getEntityId());
                r.createCell(6).setCellValue(log.getDetails() != null ? log.getDetails() : "");
                r.createCell(7).setCellValue(log.getIpAddress() != null ? log.getIpAddress() : "");
                r.createCell(8).setCellValue(log.getCreatedAt().toString());
            }

            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"audit-log.xlsx\"")
                    .contentType(MediaType.parseMediaType(
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(out.toByteArray());
        }
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getActorId(), log.getActorEmail(),
                log.getAction(), log.getEntityType(), log.getEntityId(),
                log.getDetails(), log.getIpAddress(), log.getCreatedAt()
        );
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/AuditLogResponse.java \
        backend/src/main/java/kg/gfh/kpi/controller/AuditController.java
git commit -m "feat(admin): add AuditController with paginated search and Excel export"
```

---

### Task 2: AdminService — system stats

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/AdminStatsResponse.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AdminService.java`

- [ ] **Step 1: Add count query methods to repositories**

Add the following methods to existing repository interfaces:

`backend/src/main/java/kg/gfh/kpi/repository/UserRepository.java` — append:
```java
long countByIsActiveTrue();
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationPeriodRepository.java` — append:
```java
// EvaluationPeriodStatus: ACTIVE, CLOSED, ARCHIVED
long countByStatus(EvaluationPeriodStatus status);
```

`backend/src/main/java/kg/gfh/kpi/repository/EvaluationRepository.java` — append:
```java
// EvaluationStatus: DRAFT, SUBMITTED, ACKNOWLEDGED, DISPUTED, FINALIZED
long countByStatus(EvaluationStatus status);
```

`backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java` — append:
```java
// AppealStatus: OPEN, UPHELD, OVERTURNED, AUTO_CLOSED
long countByStatus(AppealStatus status);
```

`backend/src/main/java/kg/gfh/kpi/repository/AuditLogRepository.java` — append:
```java
long countByCreatedAtAfter(LocalDateTime since);
```

- [ ] **Step 2: Create AdminStatsResponse**

`backend/src/main/java/kg/gfh/kpi/dto/AdminStatsResponse.java`:
```java
package kg.gfh.kpi.dto;

public record AdminStatsResponse(
    long totalUsers,
    long activeUsers,
    long activeEvaluationPeriods,
    long pendingEvaluations,
    long totalEvaluations,
    long openAppeals,
    long auditLogsLast24h
) {}
```

- [ ] **Step 3: Create AdminService**

`backend/src/main/java/kg/gfh/kpi/service/AdminService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.dto.AdminStatsResponse;
import kg.gfh.kpi.entity.enums.AppealStatus;
import kg.gfh.kpi.entity.enums.EvaluationPeriodStatus;
import kg.gfh.kpi.entity.enums.EvaluationStatus;
import kg.gfh.kpi.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final EvaluationPeriodRepository evaluationPeriodRepository;
    private final EvaluationRepository evaluationRepository;
    private final AppealRepository appealRepository;
    private final AuditLogRepository auditLogRepository;

    @Value("${app.log.error-file:/app/logs/error.log}")
    private String errorLogFile;

    public AdminStatsResponse getStats() {
        return new AdminStatsResponse(
            userRepository.count(),
            userRepository.countByIsActiveTrue(),
            evaluationPeriodRepository.countByStatus(EvaluationPeriodStatus.ACTIVE),
            evaluationRepository.countByStatus(EvaluationStatus.DRAFT),
            evaluationRepository.count(),
            appealRepository.countByStatus(AppealStatus.OPEN),
            auditLogRepository.countByCreatedAtAfter(LocalDateTime.now().minusHours(24))
        );
    }

    public List<String> getLastErrorLogLines(int count) {
        try {
            java.nio.file.Path path = Paths.get(errorLogFile);
            if (!Files.exists(path)) return List.of("Log file not found: " + errorLogFile);
            List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
            int from = Math.max(0, lines.size() - count);
            return lines.subList(from, lines.size());
        } catch (IOException e) {
            log.warn("Cannot read error log file: {}", e.getMessage());
            return Collections.singletonList("Cannot read log: " + e.getMessage());
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/AdminStatsResponse.java \
        backend/src/main/java/kg/gfh/kpi/service/AdminService.java \
        backend/src/main/java/kg/gfh/kpi/repository/UserRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationPeriodRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/EvaluationRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/AppealRepository.java \
        backend/src/main/java/kg/gfh/kpi/repository/AuditLogRepository.java
git commit -m "feat(admin): add AdminService with stats and error log reader"
```

---

### Task 3: AdminController — stats + Quartz jobs + error logs

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/dto/QuartzJobInfo.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/AdminController.java`

- [ ] **Step 1: Create QuartzJobInfo DTO**

`backend/src/main/java/kg/gfh/kpi/dto/QuartzJobInfo.java`:
```java
package kg.gfh.kpi.dto;

import java.util.Date;

public record QuartzJobInfo(
    String name,
    String group,
    String description,
    String cronExpression,
    Date previousFireTime,
    Date nextFireTime,
    String state
) {}
```

- [ ] **Step 2: Create AdminController**

`backend/src/main/java/kg/gfh/kpi/controller/AdminController.java`:
```java
package kg.gfh.kpi.controller;

import kg.gfh.kpi.dto.AdminStatsResponse;
import kg.gfh.kpi.dto.QuartzJobInfo;
import kg.gfh.kpi.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.quartz.impl.matchers.GroupMatcher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final Scheduler scheduler;

    @GetMapping("/stats")
    public AdminStatsResponse getStats() {
        return adminService.getStats();
    }

    @GetMapping("/quartz-jobs")
    public List<QuartzJobInfo> getQuartzJobs() throws SchedulerException {
        List<QuartzJobInfo> result = new ArrayList<>();
        for (String group : scheduler.getJobGroupNames()) {
            for (JobKey key : scheduler.getJobKeys(GroupMatcher.groupEquals(group))) {
                JobDetail detail = scheduler.getJobDetail(key);
                List<? extends Trigger> triggers = scheduler.getTriggersOfJob(key);
                Trigger trigger = triggers.isEmpty() ? null : triggers.get(0);

                String cronExpr = null;
                if (trigger instanceof CronTrigger cron) cronExpr = cron.getCronExpression();

                String state = trigger != null
                        ? scheduler.getTriggerState(trigger.getKey()).name()
                        : "NONE";

                result.add(new QuartzJobInfo(
                        key.getName(),
                        key.getGroup(),
                        detail.getDescription(),
                        cronExpr,
                        trigger != null ? trigger.getPreviousFireTime() : null,
                        trigger != null ? trigger.getNextFireTime() : null,
                        state
                ));
            }
        }
        return result;
    }

    @GetMapping("/error-logs")
    public Map<String, List<String>> getErrorLogs() {
        return Map.of("lines", adminService.getLastErrorLogLines(20));
    }
}
```

- [ ] **Step 3: Add error log path to application.yml**

In `backend/src/main/resources/application.yml`, add:
```yaml
app:
  log:
    error-file: /app/logs/error.log
```

In `backend/src/main/resources/application-dev.yml`, override for local development:
```yaml
app:
  log:
    error-file: logs/error.log
```

Configure Logback to write errors to a file. In `backend/src/main/resources/logback-spring.xml`, ensure an appender exists:
```xml
<appender name="ERROR_FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
    <file>${LOG_PATH:-logs}/error.log</file>
    <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
        <level>ERROR</level>
    </filter>
    <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
        <fileNamePattern>${LOG_PATH:-logs}/error.%d{yyyy-MM-dd}.log</fileNamePattern>
        <maxHistory>30</maxHistory>
    </rollingPolicy>
    <encoder>
        <pattern>%d{yyyy-MM-dd HH:mm:ss} %-5level %logger{36} - %msg%n</pattern>
    </encoder>
</appender>

<root level="INFO">
    <appender-ref ref="CONSOLE"/>
    <appender-ref ref="ERROR_FILE"/>
</root>
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/dto/QuartzJobInfo.java \
        backend/src/main/java/kg/gfh/kpi/controller/AdminController.java \
        backend/src/main/resources/application.yml \
        backend/src/main/resources/application-dev.yml \
        backend/src/main/resources/logback-spring.xml
git commit -m "feat(admin): add AdminController with stats, Quartz job listing, and error log endpoint"
```
