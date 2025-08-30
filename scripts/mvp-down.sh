#!/usr/bin/env bash

set -euo pipefail

log() { echo -e "[MVP] $*"; }
err() { echo -e "[MVP][ERROR] $*" >&2; }

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
  else
    err "Docker Compose no está instalado."
    exit 1
  fi
}

COMPOSE_BIN=$(detect_compose)

log "Parando servicios MVP (app, postgres, redis)..."
$COMPOSE_BIN down

log "Si deseas borrar volúmenes (¡irrecuperable!), ejecuta:"
echo "$COMPOSE_BIN down -v"


