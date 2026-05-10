# M5-BE-01: Spring AOP Audit Logging + PostgreSQL Immutability Trigger on audit_log

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `AuditService` with a Spring AOP `@Around` aspect that intercepts annotated service methods and writes `audit_log` rows. Add a PostgreSQL trigger that prevents UPDATE and DELETE on `audit_log` (immutability enforcement). Add `@Audited` annotation for method-level marking.

**Architecture:** `AuditAspect` intercepts `@Audited`-annotated methods, extracts action, actor, entity type/id from method arguments or security context, and writes to `audit_log` asynchronously. The PostgreSQL trigger `audit_log_immutable` runs BEFORE UPDATE OR DELETE and raises an exception, making audit records tamper-proof without application-layer enforcement. `AuditService` also has explicit methods for file download audit (from FileService) and export audit (from ReportService).

**Tech Stack:** Spring Boot 3.x, Spring AOP, PostgreSQL 15 (trigger via Liquibase), @Async.

**Depends on:** m4-analytics/be-03-report-service.md

---

### Task 1: AuditLog entity + immutability trigger

**Files:**
- Create: `backend/src/main/resources/db/changelog/m5/020-create-audit-log.xml`
- Create: `backend/src/main/java/kg/gfh/kpi/entity/AuditLog.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/AuditLogRepository.java`

- [ ] **Step 1: Create audit_log migration with immutability trigger**

`backend/src/main/resources/db/changelog/m5/020-create-audit-log.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="020-create-audit-log" author="gfh">
        <createTable tableName="audit_log">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="actor_id" type="BIGINT">
                <constraints nullable="false"/>
            </column>
            <column name="actor_email" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <!-- e.g. CREATE_USER, UPDATE_CRITERIA, SUBMIT_EVALUATION, DOWNLOAD_FILE, EXPORT_REPORT -->
            <column name="action" type="VARCHAR(100)">
                <constraints nullable="false"/>
            </column>
            <column name="entity_type" type="VARCHAR(50)"/>
            <column name="entity_id" type="BIGINT"/>
            <!-- JSON blob of changed fields or context -->
            <column name="details" type="JSONB"/>
            <column name="ip_address" type="VARCHAR(45)"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <createIndex tableName="audit_log" indexName="idx_audit_actor_id">
            <column name="actor_id"/>
        </createIndex>
        <createIndex tableName="audit_log" indexName="idx_audit_action">
            <column name="action"/>
        </createIndex>
        <createIndex tableName="audit_log" indexName="idx_audit_created_at">
            <column name="created_at"/>
        </createIndex>

        <!-- Immutability trigger: audit rows cannot be updated or deleted -->
        <sql splitStatements="false"><![CDATA[
            CREATE OR REPLACE FUNCTION audit_log_immutable()
            RETURNS trigger AS $$
            BEGIN
                RAISE EXCEPTION 'audit_log rows are immutable (action: %, id: %)',
                    TG_OP, COALESCE(OLD.id::text, 'unknown');
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER trg_audit_log_immutable
            BEFORE UPDATE OR DELETE ON audit_log
            FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();
        ]]></sql>

        <rollback>
            <sql>DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;</sql>
            <sql>DROP FUNCTION IF EXISTS audit_log_immutable();</sql>
            <dropTable tableName="audit_log"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

Add include to master changelog:
```xml
<include file="db/changelog/m5/020-create-audit-log.xml"/>
```

- [ ] **Step 2: Create AuditLog entity**

`backend/src/main/java/kg/gfh/kpi/entity/AuditLog.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Getter @Setter
public class AuditLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_id", nullable = false)
    private Long actorId;

    @Column(name = "actor_email", nullable = false, length = 255)
    private String actorEmail;

    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(columnDefinition = "JSONB")
    private String details;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
```

`backend/src/main/java/kg/gfh/kpi/repository/AuditLogRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:actorId IS NULL OR a.actorId = :actorId)
          AND (:action IS NULL OR a.action = :action)
          AND (:entityType IS NULL OR a.entityType = :entityType)
          AND (:from IS NULL OR a.createdAt >= :from)
          AND (:to IS NULL OR a.createdAt <= :to)
        ORDER BY a.createdAt DESC
        """)
    Page<AuditLog> search(
        @Param("actorId") Long actorId,
        @Param("action") String action,
        @Param("entityType") String entityType,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/db/changelog/m5/ \
        backend/src/main/java/kg/gfh/kpi/entity/AuditLog.java \
        backend/src/main/java/kg/gfh/kpi/repository/AuditLogRepository.java
git commit -m "feat(audit): add audit_log table with PostgreSQL immutability trigger and entity/repository"
```

---

### Task 2: AuditService + AOP aspect + @Audited annotation

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/annotation/Audited.java`
- Create: `backend/src/main/java/kg/gfh/kpi/service/AuditService.java`
- Create: `backend/src/main/java/kg/gfh/kpi/aspect/AuditAspect.java`

- [ ] **Step 1: Create @Audited annotation**

`backend/src/main/java/kg/gfh/kpi/annotation/Audited.java`:
```java
package kg.gfh.kpi.annotation;

import java.lang.annotation.*;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface Audited {
    String action();
    String entityType() default "";
}
```

- [ ] **Step 2: Create AuditService**

`backend/src/main/java/kg/gfh/kpi/service/AuditService.java`:
```java
package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.AuditLog;
import kg.gfh.kpi.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(Long actorId, String actorEmail, String action,
                    String entityType, Long entityId, String details, String ipAddress) {
        try {
            AuditLog entry = new AuditLog();
            entry.setActorId(actorId);
            entry.setActorEmail(actorEmail != null ? actorEmail : "system");
            entry.setAction(action);
            entry.setEntityType(entityType);
            entry.setEntityId(entityId);
            entry.setDetails(details);
            entry.setIpAddress(ipAddress);
            auditLogRepository.save(entry);
        } catch (Exception e) {
            // Audit failures must never break business logic
            log.error("Failed to write audit log: action={}, actor={}", action, actorId, e);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logFileDownload(Long actorId, Long fileId, String filename) {
        log(actorId, null, "DOWNLOAD_FILE", "EVALUATION_FILE", fileId,
            "{\"filename\":\"" + filename + "\"}", null);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logExport(Long actorId, String reportType, Long entityId) {
        log(actorId, null, "EXPORT_REPORT", reportType, entityId, null, null);
    }
}
```

Enable `@Async` in main application class:
```java
// Add to KpiApplication.java:
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class KpiApplication { ... }
```

- [ ] **Step 3: Create AuditAspect**

`backend/src/main/java/kg/gfh/kpi/aspect/AuditAspect.java`:
```java
package kg.gfh.kpi.aspect;

import kg.gfh.kpi.annotation.Audited;
import kg.gfh.kpi.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditService auditService;

    @Around("@annotation(audited)")
    public Object audit(ProceedingJoinPoint pjp, Audited audited) throws Throwable {
        Object result = pjp.proceed();

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth != null ? auth.getName() : "system";

            // Try to extract entity ID from first Long/long argument named *Id
            Long entityId = null;
            Object[] args = pjp.getArgs();
            MethodSignature sig = (MethodSignature) pjp.getSignature();
            String[] paramNames = sig.getParameterNames();
            for (int i = 0; i < args.length; i++) {
                if (paramNames[i].endsWith("Id") && args[i] instanceof Number) {
                    entityId = ((Number) args[i]).longValue();
                    break;
                }
            }

            auditService.log(null, email, audited.action(), audited.entityType(),
                entityId, null, null);
        } catch (Exception e) {
            log.warn("AuditAspect failed to log: {}", e.getMessage());
        }

        return result;
    }
}
```

- [ ] **Step 4: Annotate key service methods**

Add `@Audited` to methods in key services:
```java
// In UserService.java:
@Audited(action = "CREATE_USER", entityType = "USER")
public UserResponse createUser(UserCreateRequest req) { ... }

@Audited(action = "DEACTIVATE_USER", entityType = "USER")
public void deactivate(Long userId) { ... }

// In EvaluationService.java:
@Audited(action = "SUBMIT_EVALUATION", entityType = "EVALUATION")
public EvaluationResponse submit(Long evaluationId, Long evaluatorId) { ... }

// In CriteriaService.java:
@Audited(action = "UPDATE_CRITERIA", entityType = "CRITERIA")
public CriteriaResponse update(Long id, CriteriaRequest req) { ... }
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/annotation/Audited.java \
        backend/src/main/java/kg/gfh/kpi/service/AuditService.java \
        backend/src/main/java/kg/gfh/kpi/aspect/AuditAspect.java
git commit -m "feat(audit): add @Audited AOP aspect with async audit logging and @Async + REQUIRES_NEW propagation"
```
