#!/usr/bin/env bash

set -euo pipefail

TITLE="GEI Adeptify - MVP Up"

log() { echo -e "[MVP] $*"; }
err() { echo -e "[MVP][ERROR] $*" >&2; }

# Detectar binario de compose
detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    echo "docker compose"
  elif docker-compose version >/dev/null 2>&1; then
    echo "docker-compose"
  else
    err "Docker Compose no está instalado. Instálalo y reintenta."
    exit 1
  fi
}

COMPOSE_BIN=$(detect_compose)

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Falta el comando: $1. Instálalo y reintenta."
    exit 1
  fi
}

wait_health() {
  local name="$1"
  local timeout="${2:-60}"
  local waited=0
  log "Esperando a que $name esté healthy (timeout ${timeout}s)..."
  while true; do
    status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo none)
    if [[ "$status" == "healthy" ]]; then
      log "✓ $name está healthy"
      break
    fi
    if (( waited >= timeout )); then
      err "Timeout esperando a $name (estado: $status)"
      exit 1
    fi
    sleep 2
    waited=$((waited+2))
  done
}

main() {
  log "$TITLE"

  require docker

  # Crear .env si no existe
  if [[ ! -f .env ]]; then
    if [[ -f env.example ]]; then
      cp env.example .env
      log "Creado .env desde env.example"
    else
      err "No existe env.example; crea .env manualmente."
      exit 1
    fi
  fi

  # Levantar dependencias
  log "Levantando Postgres y Redis..."
  $COMPOSE_BIN up -d postgres redis

  # Esperar healthchecks (nombres desde docker-compose.yml)
  wait_health gei-postgres 90
  wait_health gei-redis 60

  # Levantar la app
  log "Levantando la app..."
  $COMPOSE_BIN up -d app

  log "Servicios en ejecución:" 
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | sed '1!{/gei-postgres\|gei-redis\|gei-unified-platform/!d}' || true

  # Mostrar endpoints útiles
  cat <<EOF

MVP levantado.
Endpoints útiles:
 - Server Health:        http://localhost:3000/health
 - API raíz:             http://localhost:3000/api

DB y herramientas:
 - Postgres:             localhost:5432 (gei_unified / gei_user / gei_password)
 - Redis:                localhost:6379

Logs de la app:
  $COMPOSE_BIN logs -f app

Pruebas rápidas (en otra terminal):
  curl -X POST http://localhost:3000/api/attendance/record \
    -H 'Content-Type: application/json' \
    -d '{"classId":"CLASS_1","studentId":"STU_1","date":"2025-01-25","status":"present"}'

Parar todo:
  $COMPOSE_BIN down

EOF
}

main "$@"


