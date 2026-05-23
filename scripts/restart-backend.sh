#!/usr/bin/env bash
# Restart only backend (Spring Boot). Kills existing spring-boot:run, starts new one.
# Assumes Postgres + frontend already running. Usage: ./scripts/restart-backend.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/.dev-logs"
mkdir -p "$LOG_DIR"

PG_PORT=5432

# --- Kill existing backend ---
PIDS=$(pgrep -f "spring-boot:run" || true)
if [[ -n "$PIDS" ]]; then
  echo "[backend] killing existing (pids: $PIDS)"
  kill $PIDS 2>/dev/null || true
  sleep 2
  PIDS=$(pgrep -f "spring-boot:run" || true)
  if [[ -n "$PIDS" ]]; then
    echo "[backend] force killing (pids: $PIDS)"
    kill -9 $PIDS 2>/dev/null || true
  fi
fi

# Also free :8080 if still bound
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8080/tcp 2>/dev/null || true
fi

# --- Env ---
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:${PG_PORT}/gfh"
export SPRING_DATASOURCE_USERNAME=gfh
export SPRING_DATASOURCE_PASSWORD=gfh
export JWT_SECRET="dev-secret-key-at-least-32-chars-long!!"
export LOG_PATH=/tmp/gfh-logs
export UPLOAD_DIR=/tmp/gfh-uploads
export SPRING_LIQUIBASE_CONTEXTS="${SPRING_LIQUIBASE_CONTEXTS:-dev}"
export LOGIN_RATE_LIMIT_ENABLED="${LOGIN_RATE_LIMIT_ENABLED:-false}"
mkdir -p "$LOG_PATH" "$UPLOAD_DIR"

# --- Start backend ---
echo "[backend] starting (logs: $LOG_DIR/backend.log)"
( cd "$ROOT/backend" && nohup mvn -q spring-boot:run ) \
  > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
disown $BACKEND_PID 2>/dev/null || true

echo "[backend] pid=$BACKEND_PID — tailing log (Ctrl+C detaches, backend keeps running)"
echo "────────────────────────────────────────"
tail -f "$LOG_DIR/backend.log"
