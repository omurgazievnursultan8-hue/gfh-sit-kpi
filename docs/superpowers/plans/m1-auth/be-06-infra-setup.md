# M1-BE-06: Docker Compose + NGINX + Logback + PDPA + Swagger

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Docker Compose (nginx + spring-boot + postgres), NGINX config with SSL and security headers, Logback rolling file logs, PDPA consent endpoint, Swagger/OpenAPI accessible to all authenticated users, and bootstrap SQL for the first ADMIN user.

**Architecture:** Three Docker services. NGINX terminates SSL, serves React static build from `/var/www/gfh/dist`, proxies `/api/` and `/ws/` to Spring Boot. Spring Boot writes logs to `/app/logs/`. Liquibase bootstrap changeset creates the first ADMIN user with a known password (must be changed on first login).

**Tech Stack:** Docker Compose 3.8, NGINX alpine, PostgreSQL 15, Let's Encrypt (certbot), Logback.

**Depends on:** m1-auth/be-05-resolve-evaluator.md

---

### Task 1: Docker Compose + NGINX config

**Files:**
- Create: `docker-compose.yml` (project root)
- Create: `.env.example`
- Create: `nginx/nginx.conf`

- [ ] **Step 1: Create .env.example**

`.env.example`:
```bash
DB_USER=gfh
DB_PASSWORD=change_me_strong_password
JWT_SECRET=change_me_at_least_32_chars_long_secret
```

- [ ] **Step 2: Create docker-compose.yml**

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/var/www/gfh/dist:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - spring-boot
    restart: unless-stopped

  spring-boot:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/gfh
      - SPRING_DATASOURCE_USERNAME=${DB_USER}
      - SPRING_DATASOURCE_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=gfh
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d gfh"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

- [ ] **Step 3: Create NGINX config**

`nginx/nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name gfh.internal;

        ssl_certificate     /etc/letsencrypt/live/gfh.internal/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/gfh.internal/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" always;

        # React SPA
        location / {
            root /var/www/gfh/dist;
            try_files $uri $uri/ /index.html;
        }

        # Spring Boot API
        location /api/ {
            proxy_pass http://spring-boot:8080;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket (notifications)
        location /ws/ {
            proxy_pass http://spring-boot:8080;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }

        # Actuator (health + info only)
        location /actuator/health {
            proxy_pass http://spring-boot:8080;
        }
        location /actuator/info {
            proxy_pass http://spring-boot:8080;
        }

        # Swagger (proxied to Spring Boot)
        location /swagger-ui/ {
            proxy_pass http://spring-boot:8080;
        }
        location /v3/api-docs {
            proxy_pass http://spring-boot:8080;
        }
    }
}
```

- [ ] **Step 4: Create backend Dockerfile**

`backend/Dockerfile`:
```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads /app/logs
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example nginx/nginx.conf backend/Dockerfile
git commit -m "chore: add Docker Compose, NGINX config with SSL/security headers, and backend Dockerfile"
```

---

### Task 2: Logback configuration

**Files:**
- Create: `backend/src/main/resources/logback-spring.xml`

- [ ] **Step 1: Create logback config**

`backend/src/main/resources/logback-spring.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProperty scope="context" name="LOG_PATH" source="logging.file.path" defaultValue="/app/logs"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>${LOG_PATH}/gfh.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/gfh-%d{yyyy-MM-dd}.%i.log.gz</fileNamePattern>
            <maxFileSize>50MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>2GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
    </root>

    <!-- Reduce noise from Hibernate -->
    <logger name="org.hibernate.SQL" level="WARN"/>
    <logger name="org.hibernate.type.descriptor.sql" level="WARN"/>
</configuration>
```

- [ ] **Step 2: Add logging.file.path to application.yml**

In `backend/src/main/resources/application.yml` add under existing config:
```yaml
logging:
  file:
    path: ${LOG_PATH:/app/logs}
  level:
    root: INFO
    kg.gfh.kpi: INFO
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/main/resources/logback-spring.xml backend/src/main/resources/application.yml
git commit -m "chore: add Logback rolling file appender with 30-day retention"
```

---

### Task 3: PDPA consent endpoint

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/entity/PdpaConsent.java`
- Create: `backend/src/main/java/kg/gfh/kpi/repository/PdpaConsentRepository.java`
- Create: `backend/src/main/java/kg/gfh/kpi/controller/PdpaController.java`

- [ ] **Step 1: Create PdpaConsent entity**

`backend/src/main/java/kg/gfh/kpi/entity/PdpaConsent.java`:
```java
package kg.gfh.kpi.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "pdpa_consents")
@Getter @Setter
public class PdpaConsent {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "accepted_at", nullable = false) private LocalDateTime acceptedAt = LocalDateTime.now();
    @Column(nullable = false) private String version;
    @Column(name = "ip_address") private String ipAddress;
}
```

- [ ] **Step 2: Create repository**

`backend/src/main/java/kg/gfh/kpi/repository/PdpaConsentRepository.java`:
```java
package kg.gfh.kpi.repository;

import kg.gfh.kpi.entity.PdpaConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PdpaConsentRepository extends JpaRepository<PdpaConsent, Long> {
    Optional<PdpaConsent> findTopByUserIdOrderByAcceptedAtDesc(Long userId);
}
```

- [ ] **Step 3: Create PDPA controller**

`backend/src/main/java/kg/gfh/kpi/controller/PdpaController.java`:
```java
package kg.gfh.kpi.controller;

import jakarta.servlet.http.HttpServletRequest;
import kg.gfh.kpi.entity.PdpaConsent;
import kg.gfh.kpi.repository.PdpaConsentRepository;
import kg.gfh.kpi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/pdpa")
@RequiredArgsConstructor
public class PdpaController {

    private final PdpaConsentRepository pdpaConsentRepository;
    private final UserRepository userRepository;

    @PostMapping("/accept")
    public ResponseEntity<Void> acceptPdpa(
            @RequestParam(defaultValue = "1.0") String version,
            Authentication auth,
            HttpServletRequest request) {
        UserDetails userDetails = (UserDetails) auth.getPrincipal();
        Long userId = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow().getId();

        PdpaConsent consent = new PdpaConsent();
        consent.setUserId(userId);
        consent.setVersion(version);
        consent.setIpAddress(request.getRemoteAddr());
        pdpaConsentRepository.save(consent);

        return ResponseEntity.ok().build();
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/main/java/kg/gfh/kpi/entity/PdpaConsent.java \
        src/main/java/kg/gfh/kpi/repository/PdpaConsentRepository.java \
        src/main/java/kg/gfh/kpi/controller/PdpaController.java
git commit -m "feat(pdpa): add PDPA consent acceptance endpoint with version tracking"
```

---

### Task 4: Swagger/OpenAPI config + bootstrap ADMIN user

**Files:**
- Create: `backend/src/main/java/kg/gfh/kpi/config/OpenApiConfig.java`
- Create: `backend/src/main/resources/db/changelog/m1/009-bootstrap-admin.xml`

- [ ] **Step 1: Configure Swagger**

`backend/src/main/java/kg/gfh/kpi/config/OpenApiConfig.java`:
```java
package kg.gfh.kpi.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(title = "GFH KPI API", version = "v1",
        description = "Employee performance evaluation system"),
    security = @SecurityRequirement(name = "cookieAuth")
)
@SecurityScheme(
    name = "cookieAuth",
    type = SecuritySchemeType.APIKEY,
    in = io.swagger.v3.oas.annotations.enums.SecuritySchemeIn.COOKIE,
    paramName = "access_token"
)
public class OpenApiConfig {}
```

Add to `application.yml`:
```yaml
springdoc:
  swagger-ui:
    path: /swagger-ui.html
  api-docs:
    path: /v3/api-docs
```

- [ ] **Step 2: Bootstrap ADMIN user via Liquibase**

`backend/src/main/resources/db/changelog/m1/009-bootstrap-admin.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
                       http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.20.xsd">

    <changeSet id="009-bootstrap-admin" author="gfh" runOnChange="false">
        <!-- Password: Admin123!@# (bcrypt cost 12) — MUST be changed on first login -->
        <!-- Generate fresh hash with: htpasswd -bnBC 12 "" 'Admin123!@#' | tr -d ':\n' | sed 's/$2y/$2a/' -->
        <insert tableName="users">
            <column name="full_name" value="System Administrator"/>
            <column name="email" value="admin@gfh.kg"/>
            <column name="password_hash" value="$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/oW/3gkku6"/>
            <column name="role" value="ADMIN"/>
            <column name="is_active" valueBoolean="true"/>
            <column name="password_updated_at" valueNull="true"/>
        </insert>
    </changeSet>
</databaseChangeLog>
```

Add include to `db.changelog-master.xml`:
```xml
<include file="db/changelog/m1/009-bootstrap-admin.xml"/>
```

- [ ] **Step 3: Verify the app starts**

```bash
cp .env.example .env
# Edit .env with real values
docker compose up -d postgres
sleep 5
cd backend && mvn spring-boot:run &
sleep 10
curl -s http://localhost:8080/actuator/health | grep UP
```

Expected: `{"status":"UP",...}` (or similar UP response).

Kill the Spring Boot process after verifying.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/kg/gfh/kpi/config/OpenApiConfig.java \
        backend/src/main/resources/db/changelog/m1/009-bootstrap-admin.xml \
        backend/src/main/resources/db/changelog/db.changelog-master.xml \
        backend/src/main/resources/application.yml
git commit -m "chore: add Swagger/OpenAPI config and bootstrap ADMIN user via Liquibase"
```
