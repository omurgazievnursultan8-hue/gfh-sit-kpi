# M5-BE-03: Docker Compose Final Config + NGINX (SSL, Headers, WebSocket) + Backup Scripts + README

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assemble the production Docker Compose file wiring all three services (PostgreSQL, Spring Boot backend, NGINX frontend), configure NGINX as a reverse proxy with WebSocket support and security headers, add a PostgreSQL backup script, and write a deployment README.

**Architecture:** Three Docker Compose services: `postgres` (data volume), `backend` (Spring Boot fat JAR, depends on postgres), `frontend` (NGINX serving the built React SPA and proxying `/api/` and `/ws` to backend). NGINX handles SSL termination, security headers, gzip, and WebSocket upgrade. Secrets come from a `.env` file that is never committed. A shell script uses `pg_dump` inside the postgres container for scheduled backups.

**Tech Stack:** Docker Compose 2.x, NGINX 1.25, PostgreSQL 15, Spring Boot 3.x fat JAR.

**Depends on:** m5-admin/be-02-audit-admin-api.md (all backend tasks complete)

---

### Task 1: Docker Compose + .env.example

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.override.yml` (dev overrides)
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

`.env.example`:
```bash
# Copy this file to .env and fill in values before running docker-compose

# PostgreSQL
POSTGRES_DB=kpi_db
POSTGRES_USER=kpi_user
POSTGRES_PASSWORD=change_me_strong_password

# Backend
SPRING_PROFILES_ACTIVE=prod
JWT_SECRET=change_me_64_character_minimum_secret_key_here_xxxxxxxxxxxxxxxxxxxx
JWT_EXPIRY_SECONDS=900
JWT_REFRESH_EXPIRY_SECONDS=86400

# Paths
LOG_PATH=/app/logs
```

- [ ] **Step 2: Create docker-compose.yml**

`docker-compose.yml`:
```yaml
version: '3.9'

services:

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - internal

  backend:
    image: kpi-backend:latest
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: ${SPRING_PROFILES_ACTIVE:-prod}
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER}
      SPRING_DATASOURCE_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRY_SECONDS: ${JWT_EXPIRY_SECONDS:-900}
      JWT_REFRESH_EXPIRY_SECONDS: ${JWT_REFRESH_EXPIRY_SECONDS:-86400}
      LOG_PATH: ${LOG_PATH:-/app/logs}
      TZ: Asia/Bishkek
    volumes:
      - backend_logs:${LOG_PATH:-/app/logs}
      - evaluation_files:/app/files
    networks:
      - internal
    expose:
      - "8080"

  frontend:
    image: kpi-frontend:latest
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - internal

volumes:
  postgres_data:
  backend_logs:
  evaluation_files:

networks:
  internal:
    driver: bridge
```

- [ ] **Step 3: Create docker-compose.override.yml for local dev**

`docker-compose.override.yml`:
```yaml
version: '3.9'

services:
  postgres:
    ports:
      - "5432:5432"

  backend:
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: dev
```

- [ ] **Step 4: Create backend Dockerfile**

`backend/Dockerfile`:
```dockerfile
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw && ./mvnw dependency:go-offline -q
COPY src ./src
RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S kpi && adduser -S kpi -G kpi
COPY --from=builder /app/target/*.jar app.jar
RUN mkdir -p /app/logs /app/files && chown -R kpi:kpi /app
USER kpi
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dfile.encoding=UTF-8", "-Duser.timezone=Asia/Bishkek", "app.jar"]
```

- [ ] **Step 5: Create frontend Dockerfile**

`frontend/Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80 443
```

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml docker-compose.override.yml .env.example \
        backend/Dockerfile frontend/Dockerfile
git commit -m "feat(devops): add Docker Compose setup with postgres/backend/frontend services and Dockerfiles"
```

---

### Task 2: NGINX configuration

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/ssl/.gitkeep`

- [ ] **Step 1: Create nginx directory**

```bash
mkdir -p nginx/ssl
touch nginx/ssl/.gitkeep
```

- [ ] **Step 2: Create nginx.conf**

`nginx/nginx.conf`:
```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';
    access_log /var/log/nginx/access.log main;

    sendfile        on;
    keepalive_timeout 65;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    # Upstream backend
    upstream backend {
        server backend:8080;
        keepalive 32;
    }

    # Redirect HTTP → HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        server_name _;

        ssl_certificate     /etc/nginx/ssl/server.crt;
        ssl_certificate_key /etc/nginx/ssl/server.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options           DENY always;
        add_header X-Content-Type-Options    nosniff always;
        add_header X-XSS-Protection          "1; mode=block" always;
        add_header Referrer-Policy           strict-origin-when-cross-origin always;
        add_header Content-Security-Policy   "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' wss:;" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        root /usr/share/nginx/html;
        index index.html;

        # React SPA — all non-API, non-asset routes → index.html
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy
        location /api/ {
            proxy_pass         http://backend;
            proxy_http_version 1.1;
            proxy_set_header   Host              $host;
            proxy_set_header   X-Real-IP         $remote_addr;
            proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header   X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_send_timeout 60s;
        }

        # WebSocket proxy (STOMP over SockJS)
        location /ws {
            proxy_pass         http://backend;
            proxy_http_version 1.1;
            proxy_set_header   Upgrade    $http_upgrade;
            proxy_set_header   Connection "upgrade";
            proxy_set_header   Host       $host;
            proxy_set_header   X-Real-IP  $remote_addr;
            proxy_read_timeout 3600s;
        }

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Never cache index.html (so new deploys take effect immediately)
        location = /index.html {
            add_header Cache-Control "no-store, no-cache, must-revalidate";
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add nginx/nginx.conf nginx/ssl/.gitkeep
git commit -m "feat(devops): add NGINX config with SSL termination, WebSocket proxy, and security headers"
```

---

### Task 3: Backup script + README

**Files:**
- Create: `scripts/backup.sh`
- Create: `README.md`

- [ ] **Step 1: Create backup script**

`scripts/backup.sh`:
```bash
#!/usr/bin/env bash
# Run this from the project root. Requires docker-compose and .env.
set -euo pipefail

set -a; source .env; set +a

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/kpi_db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup] Dumping database to $BACKUP_FILE ..."
docker compose exec -T postgres pg_dump \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"

echo "[backup] Done: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Keep only the last 30 backups
cd "$BACKUP_DIR"
ls -t kpi_db_*.sql.gz | tail -n +31 | xargs -r rm --
echo "[backup] Old backups pruned."
```

```bash
mkdir -p scripts && chmod +x scripts/backup.sh
```

To schedule daily backups, add to host crontab (`crontab -e`):
```
0 2 * * * /path/to/project/scripts/backup.sh >> /var/log/kpi-backup.log 2>&1
```

- [ ] **Step 2: Create README.md**

`README.md`:
```markdown
# GFH KPI System

Web-based employee performance evaluation system for OAO "State Financial Holding".

## Prerequisites

- Docker 24+ and Docker Compose 2.x
- (Production) A valid SSL certificate placed in `nginx/ssl/server.crt` and `nginx/ssl/server.key`

## First-Time Setup

```bash
cp .env.example .env
# Edit .env and set strong values for POSTGRES_PASSWORD and JWT_SECRET
```

## Build Images

```bash
docker compose build
```

## Start (Production)

```bash
docker compose up -d
```

Logs: `docker compose logs -f`

## Start (Development)

```bash
docker compose up -d
# Backend is exposed on localhost:8080
# Frontend is exposed on localhost:80 (HTTP only)
```

## Database Backup

```bash
./scripts/backup.sh
```

Backups are stored in `./backups/` (last 30 kept).

## Database Restore

```bash
gunzip -c backups/kpi_db_YYYYMMDD_HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB
```

## Updating

```bash
docker compose build
docker compose up -d --no-deps backend frontend
```

Liquibase migrations run automatically on backend startup.

## Default Admin Credentials

Set on first boot via Liquibase seed data. Change immediately after first login.

- Email: `admin@gfh.kg`
- Password: `Admin1234!`

## SSL (Production)

Place your certificate files in `nginx/ssl/`:
- `nginx/ssl/server.crt`
- `nginx/ssl/server.key`

For self-signed (dev only):
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/server.key -out nginx/ssl/server.crt \
  -subj "/CN=kpi.gfh.kg"
```
```

- [ ] **Step 3: Add .gitignore entries**

Append to `.gitignore`:
```
.env
nginx/ssl/*.crt
nginx/ssl/*.key
backups/
```

- [ ] **Step 4: Commit**

```bash
git add scripts/backup.sh README.md .gitignore nginx/ssl/.gitkeep
git commit -m "feat(devops): add backup script, README with deployment instructions, and .gitignore ssl/backups"
```
