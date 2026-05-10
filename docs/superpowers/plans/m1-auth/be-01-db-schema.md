# M1-BE-01: DB Schema + Liquibase Migrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all M1 database tables and indexes via Liquibase changelogs, runnable against a fresh PostgreSQL 15 instance.

**Architecture:** Liquibase XML changelogs under `backend/src/main/resources/db/changelog/`. One master changelog includes module changelogs. Spring Boot auto-runs migrations on startup. Each table in its own changeset for clean rollback.

**Tech Stack:** PostgreSQL 15, Liquibase 4.x, Spring Boot 3.x, Testcontainers (for integration test).

**Depends on:** nothing (first task)

---

### Task 1: Spring Boot + Liquibase project skeleton

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/main/resources/db/changelog/db.changelog-master.xml`

- [ ] **Step 1: Create the Maven project with required dependencies**

`backend/pom.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
    </parent>
    <groupId>kg.gfh</groupId>
    <artifactId>kpi-backend</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <properties>
        <java.version>17</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.liquibase</groupId>
            <artifactId>liquibase-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.3</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.3</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.github.ben-manes.caffeine</groupId>
            <artifactId>caffeine</artifactId>
        </dependency>
        <dependency>
            <groupId>com.bucket4j</groupId>
            <artifactId>bucket4j-core</artifactId>
            <version>8.7.0</version>
        </dependency>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.3.0</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <version>1.19.3</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>1.19.3</version>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: Create application.yml**

`backend/src/main/resources/application.yml`:
```yaml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/gfh}
    username: ${SPRING_DATASOURCE_USERNAME:gfh}
    password: ${SPRING_DATASOURCE_PASSWORD:gfh}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    open-in-view: false
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized

jwt:
  secret: ${JWT_SECRET:changeme-at-least-32-chars-long!!}
  access-token-minutes: 15
  refresh-token-days: 7
```

- [ ] **Step 3: Create master changelog**

`backend/src/main/resources/db/changelog/db.changelog-master.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <include file="db/changelog/m1/001-create-users.xml"/>
    <include file="db/changelog/m1/002-create-org-units.xml"/>
    <include file="db/changelog/m1/003-create-refresh-tokens.xml"/>
    <include file="db/changelog/m1/004-create-login-attempts.xml"/>
    <include file="db/changelog/m1/005-create-password-reset-tokens.xml"/>
    <include file="db/changelog/m1/006-create-evaluator-delegations.xml"/>
    <include file="db/changelog/m1/007-create-audit-log.xml"/>
    <include file="db/changelog/m1/008-create-pdpa-consents.xml"/>
</databaseChangeLog>
```

- [ ] **Step 4: Commit**

```bash
cd backend
git add pom.xml src/main/resources/application.yml src/main/resources/db/changelog/db.changelog-master.xml
git commit -m "chore: add Spring Boot project skeleton with Liquibase master changelog"
```

---

### Task 2: users + org_units tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m1/001-create-users.xml`
- Create: `backend/src/main/resources/db/changelog/m1/002-create-org-units.xml`

- [ ] **Step 1: Create users table changelog**

`backend/src/main/resources/db/changelog/m1/001-create-users.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="001-create-users" author="gfh">
        <createTable tableName="users">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="full_name" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="email" type="VARCHAR(255)">
                <constraints nullable="false" unique="true"/>
            </column>
            <column name="password_hash" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="role" type="VARCHAR(50)">
                <constraints nullable="false"/>
            </column>
            <column name="position" type="VARCHAR(255)"/>
            <column name="unit_id" type="BIGINT"/>
            <column name="manager_id" type="BIGINT"/>
            <column name="is_active" type="BOOLEAN" defaultValueBoolean="true">
                <constraints nullable="false"/>
            </column>
            <column name="password_updated_at" type="TIMESTAMP"/>
            <column name="password_history" type="JSONB"/>
            <column name="failed_login_attempts" type="INTEGER" defaultValueNumeric="0">
                <constraints nullable="false"/>
            </column>
            <column name="locked_until" type="TIMESTAMP"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="updated_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="version" type="BIGINT" defaultValueNumeric="0">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <createIndex tableName="users" indexName="idx_users_email" unique="true">
            <column name="email"/>
        </createIndex>
        <createIndex tableName="users" indexName="idx_users_unit_id">
            <column name="unit_id"/>
        </createIndex>
        <createIndex tableName="users" indexName="idx_users_manager_id">
            <column name="manager_id"/>
        </createIndex>
        <createIndex tableName="users" indexName="idx_users_is_active">
            <column name="is_active"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: Create org_units table changelog**

`backend/src/main/resources/db/changelog/m1/002-create-org-units.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="002-create-org-units" author="gfh">
        <createTable tableName="org_units">
            <column name="id" type="BIGSERIAL">
                <constraints primaryKey="true" nullable="false"/>
            </column>
            <column name="name_ru" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="name_kg" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="type" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            <column name="parent_id" type="BIGINT"/>
            <column name="head_user_id" type="BIGINT"/>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()">
                <constraints nullable="false"/>
            </column>
            <column name="version" type="BIGINT" defaultValueNumeric="0">
                <constraints nullable="false"/>
            </column>
        </createTable>

        <addCheckConstraint tableName="org_units"
            constraintName="chk_org_unit_type"
            constraintBody="type IN ('BLOCK','DEPARTMENT','UNIT')"/>

        <createIndex tableName="org_units" indexName="idx_org_units_parent_id">
            <column name="parent_id"/>
        </createIndex>
        <createIndex tableName="org_units" indexName="idx_org_units_head_user_id">
            <column name="head_user_id"/>
        </createIndex>

        <addForeignKeyConstraint
            baseTableName="users" baseColumnNames="unit_id"
            referencedTableName="org_units" referencedColumnNames="id"
            constraintName="fk_users_unit_id"/>
        <addForeignKeyConstraint
            baseTableName="users" baseColumnNames="manager_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_users_manager_id"/>
        <addForeignKeyConstraint
            baseTableName="org_units" baseColumnNames="parent_id"
            referencedTableName="org_units" referencedColumnNames="id"
            constraintName="fk_org_units_parent_id"/>
        <addForeignKeyConstraint
            baseTableName="org_units" baseColumnNames="head_user_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_org_units_head_user_id"/>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: Commit**

```bash
git add src/main/resources/db/changelog/m1/001-create-users.xml \
        src/main/resources/db/changelog/m1/002-create-org-units.xml
git commit -m "feat(db): add users and org_units tables with indexes and FKs"
```

---

### Task 3: Auth support tables (refresh_tokens, login_attempts, password_reset_tokens)

**Files:**
- Create: `backend/src/main/resources/db/changelog/m1/003-create-refresh-tokens.xml`
- Create: `backend/src/main/resources/db/changelog/m1/004-create-login-attempts.xml`
- Create: `backend/src/main/resources/db/changelog/m1/005-create-password-reset-tokens.xml`

- [ ] **Step 1: refresh_tokens**

`backend/src/main/resources/db/changelog/m1/003-create-refresh-tokens.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="003-create-refresh-tokens" author="gfh">
        <createTable tableName="refresh_tokens">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="user_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="token_hash" type="VARCHAR(255)"><constraints nullable="false" unique="true"/></column>
            <column name="issued_at" type="TIMESTAMP"><constraints nullable="false"/></column>
            <column name="expires_at" type="TIMESTAMP"><constraints nullable="false"/></column>
            <column name="used_at" type="TIMESTAMP"/>
            <column name="revoked_at" type="TIMESTAMP"/>
            <column name="user_agent" type="VARCHAR(512)"/>
            <column name="ip_address" type="VARCHAR(45)"/>
        </createTable>
        <addForeignKeyConstraint
            baseTableName="refresh_tokens" baseColumnNames="user_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_refresh_tokens_user_id"/>
        <createIndex tableName="refresh_tokens" indexName="idx_refresh_tokens_user_id">
            <column name="user_id"/>
        </createIndex>
        <createIndex tableName="refresh_tokens" indexName="idx_refresh_tokens_token_hash" unique="true">
            <column name="token_hash"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: login_attempts**

`backend/src/main/resources/db/changelog/m1/004-create-login-attempts.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="004-create-login-attempts" author="gfh">
        <createTable tableName="login_attempts">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="email" type="VARCHAR(255)"><constraints nullable="false"/></column>
            <column name="ip_address" type="VARCHAR(45)"><constraints nullable="false"/></column>
            <column name="success" type="BOOLEAN"><constraints nullable="false"/></column>
            <column name="attempted_at" type="TIMESTAMP" defaultValueComputed="NOW()"><constraints nullable="false"/></column>
            <column name="user_agent" type="VARCHAR(512)"/>
        </createTable>
        <createIndex tableName="login_attempts" indexName="idx_login_attempts_email_attempted">
            <column name="email"/>
            <column name="attempted_at"/>
        </createIndex>
        <createIndex tableName="login_attempts" indexName="idx_login_attempts_ip_attempted">
            <column name="ip_address"/>
            <column name="attempted_at"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: password_reset_tokens**

`backend/src/main/resources/db/changelog/m1/005-create-password-reset-tokens.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="005-create-password-reset-tokens" author="gfh">
        <createTable tableName="password_reset_tokens">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="user_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="token_hash" type="VARCHAR(255)"><constraints nullable="false" unique="true"/></column>
            <column name="issued_at" type="TIMESTAMP"><constraints nullable="false"/></column>
            <column name="expires_at" type="TIMESTAMP"><constraints nullable="false"/></column>
            <column name="used_at" type="TIMESTAMP"/>
        </createTable>
        <addForeignKeyConstraint
            baseTableName="password_reset_tokens" baseColumnNames="user_id"
            referencedTableName="users" referencedColumnNames="id"
            constraintName="fk_password_reset_user_id"/>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/changelog/m1/003-create-refresh-tokens.xml \
        src/main/resources/db/changelog/m1/004-create-login-attempts.xml \
        src/main/resources/db/changelog/m1/005-create-password-reset-tokens.xml
git commit -m "feat(db): add refresh_tokens, login_attempts, password_reset_tokens tables"
```

---

### Task 4: evaluator_delegations + audit_log + pdpa_consents tables

**Files:**
- Create: `backend/src/main/resources/db/changelog/m1/006-create-evaluator-delegations.xml`
- Create: `backend/src/main/resources/db/changelog/m1/007-create-audit-log.xml`
- Create: `backend/src/main/resources/db/changelog/m1/008-create-pdpa-consents.xml`

- [ ] **Step 1: evaluator_delegations**

`backend/src/main/resources/db/changelog/m1/006-create-evaluator-delegations.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="006-create-evaluator-delegations" author="gfh">
        <createTable tableName="evaluator_delegations">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="evaluatee_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="original_evaluator_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="delegated_to_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="valid_from" type="DATE"><constraints nullable="false"/></column>
            <column name="valid_to" type="DATE"><constraints nullable="false"/></column>
            <column name="reason" type="VARCHAR(1000)"/>
            <column name="created_by" type="BIGINT"><constraints nullable="false"/></column>
            <column name="created_at" type="TIMESTAMP" defaultValueComputed="NOW()"><constraints nullable="false"/></column>
            <column name="is_active" type="BOOLEAN" defaultValueBoolean="true"><constraints nullable="false"/></column>
        </createTable>
        <addForeignKeyConstraint baseTableName="evaluator_delegations" baseColumnNames="evaluatee_id"
            referencedTableName="users" referencedColumnNames="id" constraintName="fk_deleg_evaluatee"/>
        <addForeignKeyConstraint baseTableName="evaluator_delegations" baseColumnNames="original_evaluator_id"
            referencedTableName="users" referencedColumnNames="id" constraintName="fk_deleg_original"/>
        <addForeignKeyConstraint baseTableName="evaluator_delegations" baseColumnNames="delegated_to_id"
            referencedTableName="users" referencedColumnNames="id" constraintName="fk_deleg_to"/>
        <createIndex tableName="evaluator_delegations" indexName="idx_delegations_evaluatee_id">
            <column name="evaluatee_id"/>
        </createIndex>
        <createIndex tableName="evaluator_delegations" indexName="idx_delegations_delegated_to">
            <column name="delegated_to_id"/>
        </createIndex>
        <createIndex tableName="evaluator_delegations" indexName="idx_delegations_valid_range">
            <column name="valid_from"/>
            <column name="valid_to"/>
            <column name="is_active"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 2: audit_log**

`backend/src/main/resources/db/changelog/m1/007-create-audit-log.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="007-create-audit-log" author="gfh">
        <createTable tableName="audit_log">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="timestamp" type="TIMESTAMP" defaultValueComputed="NOW()"><constraints nullable="false"/></column>
            <column name="user_id" type="BIGINT"/>
            <column name="user_name" type="VARCHAR(255)"/>
            <column name="action" type="VARCHAR(100)"><constraints nullable="false"/></column>
            <column name="entity_type" type="VARCHAR(100)"/>
            <column name="entity_id" type="BIGINT"/>
            <column name="old_value" type="JSONB"/>
            <column name="new_value" type="JSONB"/>
            <column name="ip_address" type="VARCHAR(45)"/>
            <column name="user_agent" type="VARCHAR(512)"/>
        </createTable>
        <createIndex tableName="audit_log" indexName="idx_audit_log_user_id">
            <column name="user_id"/>
        </createIndex>
        <createIndex tableName="audit_log" indexName="idx_audit_log_entity">
            <column name="entity_type"/>
            <column name="entity_id"/>
        </createIndex>
        <createIndex tableName="audit_log" indexName="idx_audit_log_timestamp">
            <column name="timestamp"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 3: pdpa_consents**

`backend/src/main/resources/db/changelog/m1/008-create-pdpa-consents.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">
    <changeSet id="008-create-pdpa-consents" author="gfh">
        <createTable tableName="pdpa_consents">
            <column name="id" type="BIGSERIAL"><constraints primaryKey="true"/></column>
            <column name="user_id" type="BIGINT"><constraints nullable="false"/></column>
            <column name="accepted_at" type="TIMESTAMP" defaultValueComputed="NOW()"><constraints nullable="false"/></column>
            <column name="version" type="VARCHAR(20)"><constraints nullable="false"/></column>
            <column name="ip_address" type="VARCHAR(45)"/>
        </createTable>
        <addForeignKeyConstraint baseTableName="pdpa_consents" baseColumnNames="user_id"
            referencedTableName="users" referencedColumnNames="id" constraintName="fk_pdpa_user_id"/>
    </changeSet>
</databaseChangeLog>
```

- [ ] **Step 4: Commit**

```bash
git add src/main/resources/db/changelog/m1/006-create-evaluator-delegations.xml \
        src/main/resources/db/changelog/m1/007-create-audit-log.xml \
        src/main/resources/db/changelog/m1/008-create-pdpa-consents.xml
git commit -m "feat(db): add evaluator_delegations, audit_log, pdpa_consents tables"
```

---

### Task 5: Integration test — verify migrations run cleanly

**Files:**
- Create: `backend/src/test/java/kg/gfh/kpi/migration/MigrationIntegrationTest.java`
- Create: `backend/src/test/resources/application-test.yml`

- [ ] **Step 1: Create test application config**

`backend/src/test/resources/application-test.yml`:
```yaml
spring:
  liquibase:
    change-log: classpath:db/changelog/db.changelog-master.xml
  jpa:
    hibernate:
      ddl-auto: validate
```

- [ ] **Step 2: Write the integration test**

`backend/src/test/java/kg/gfh/kpi/migration/MigrationIntegrationTest.java`:
```java
package kg.gfh.kpi.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class MigrationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("gfh_test")
            .withUsername("gfh")
            .withPassword("gfh");

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Test
    void allTablesExist() {
        var tables = java.util.List.of(
            "users", "org_units", "refresh_tokens", "login_attempts",
            "password_reset_tokens", "evaluator_delegations", "audit_log", "pdpa_consents"
        );
        for (String table : tables) {
            Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
                Integer.class, table);
            assertThat(count).as("Table %s must exist", table).isEqualTo(1);
        }
    }

    @Test
    void usersEmailIndexExists() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email'",
            Integer.class);
        assertThat(count).isEqualTo(1);
    }
}
```

- [ ] **Step 3: Add Testcontainers dynamic property config to main application class**

`backend/src/test/java/kg/gfh/kpi/migration/MigrationIntegrationTest.java` — add `@DynamicPropertySource`:
```java
// Add inside the class, before the @Autowired field:
@DynamicPropertySource
static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
}
```

- [ ] **Step 4: Create the Spring Boot main application class**

`backend/src/main/java/kg/gfh/kpi/KpiApplication.java`:
```java
package kg.gfh.kpi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class KpiApplication {
    public static void main(String[] args) {
        SpringApplication.run(KpiApplication.class, args);
    }
}
```

- [ ] **Step 5: Run the test**

```bash
cd backend
mvn test -Dtest=MigrationIntegrationTest -pl . 2>&1 | tail -20
```

Expected: `BUILD SUCCESS` — all 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/kg/gfh/kpi/KpiApplication.java \
        src/test/java/kg/gfh/kpi/migration/MigrationIntegrationTest.java \
        src/test/resources/application-test.yml
git commit -m "test(db): add migration integration test verifying all M1 tables exist"
```
