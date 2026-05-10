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

## Scheduled Backups

Add to host crontab (`crontab -e`):
```
0 2 * * * /path/to/project/scripts/backup.sh >> /var/log/kpi-backup.log 2>&1
```
