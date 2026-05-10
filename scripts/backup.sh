#!/usr/bin/env bash
# Run this from the project root. Requires docker compose and .env.
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
