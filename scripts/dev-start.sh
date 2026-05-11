#!/usr/bin/env bash
# Start full dev stack: Postgres (Docker), backend (Spring Boot), frontend (Vite).
# Usage: ./scripts/dev-start.sh
# Stop: Ctrl+C — backend/frontend killed, Postgres container left running.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/.dev-logs"
mkdir -p "$LOG_DIR"

PG_NAME="gfh-postgres"
PG_PORT=5432

# --- Postgres ---
if ! command -v docker >/dev/null 2>&1; then
  echo "docker not installed" >&2; exit 1
fi

if docker ps --format '{{.Names}}' | grep -q "^${PG_NAME}$"; then
  echo "[pg] already running"
elif docker ps -a --format '{{.Names}}' | grep -q "^${PG_NAME}$"; then
  echo "[pg] starting existing container"
  docker start "$PG_NAME" >/dev/null
else
  echo "[pg] creating container"
  docker run -d --name "$PG_NAME" \
    -e POSTGRES_DB=gfh -e POSTGRES_USER=gfh -e POSTGRES_PASSWORD=gfh \
    -p ${PG_PORT}:5432 postgres:15-alpine >/dev/null
fi

# Wait for Postgres ready
echo -n "[pg] waiting for ready"
for i in {1..30}; do
  if docker exec "$PG_NAME" pg_isready -U gfh -d gfh >/dev/null 2>&1; then
    echo " ✓"; break
  fi
  echo -n "."; sleep 1
  [[ $i -eq 30 ]] && { echo " ✗ timeout"; exit 1; }
done

# --- Env for backend ---
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:${PG_PORT}/gfh"
export SPRING_DATASOURCE_USERNAME=gfh
export SPRING_DATASOURCE_PASSWORD=gfh
export JWT_SECRET="dev-secret-key-at-least-32-chars-long!!"
export LOG_PATH=/tmp/gfh-logs
export UPLOAD_DIR=/tmp/gfh-uploads
export SPRING_LIQUIBASE_CONTEXTS="${SPRING_LIQUIBASE_CONTEXTS:-dev}"
mkdir -p "$LOG_PATH" "$UPLOAD_DIR"

# --- Backend ---
echo "[backend] starting (logs: $LOG_DIR/backend.log)"
( cd "$ROOT/backend" && mvn -q spring-boot:run ) \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# --- Frontend ---
echo "[frontend] installing deps if needed"
( cd "$ROOT/frontend" && [[ -d node_modules ]] || npm install )

echo "[frontend] starting (logs: $LOG_DIR/frontend.log)"
( cd "$ROOT/frontend" && npm run dev ) \
  > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

cleanup() {
  echo
  echo "[stop] killing backend ($BACKEND_PID), frontend ($FRONTEND_PID)"
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
  wait 2>/dev/null || true
  echo "[stop] Postgres container left running (docker stop $PG_NAME to halt)"
}
trap cleanup INT TERM

cat <<EOF

────────────────────────────────────────
  Backend   → http://localhost:8080
  Frontend  → http://localhost:5173
  Postgres  → localhost:${PG_PORT} (gfh/gfh)
  Logs      → $LOG_DIR/{backend,frontend}.log
  Admin     → admin@gfh.kg / Admin123!@#
  Ctrl+C to stop
────────────────────────────────────────
EOF

# Tail logs until interrupted
tail -f "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
