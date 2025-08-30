#!/usr/bin/env bash

set -euo pipefail

HOST=${HOST:-localhost}
PORT=${PORT:-3000}

echo "[MVP] Probando health: http://$HOST:$PORT/health"
curl -sS http://$HOST:$PORT/health | jq . || curl -sS http://$HOST:$PORT/health

echo "[MVP] Probando registrar asistencia (POST /api/attendance/record)"
curl -sS -X POST http://$HOST:$PORT/api/attendance/record \
  -H 'Content-Type: application/json' \
  -d '{"classId":"CLASS_1","studentId":"STU_1","date":"2025-01-25","status":"present"}' | jq . || true

echo "[MVP] Probando consultar stats (GET /api/attendance/stats/CLASS_1)"
curl -sS "http://$HOST:$PORT/api/attendance/stats/CLASS_1" | jq . || true

echo "[MVP] Tests rápidos ejecutados. Revisa los resultados arriba."


