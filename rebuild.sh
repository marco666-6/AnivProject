#!/usr/bin/env bash
# ── Aniv: full clean rebuild ──────────────────────────────────────────
#  WARNING: "-v" deletes the aniv-data volume, so Aby's scores, unlocked
#  messages, hearted photos and replies are wiped. Drop -v to keep them.
set -e
cd "$(dirname "$0")"

echo "=== docker compose down -v --rmi all ==="
docker compose down -v --rmi all

echo
echo "=== docker compose up -d --build ==="
docker compose up -d --build

echo
docker compose ps

echo
echo "Nunggu server siap..."
for i in $(seq 1 40); do
  if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    echo "OK — $(curl -fsS http://localhost:3000/api/health)"
    echo
    echo "Buka http://localhost:3000"
    exit 0
  fi
  sleep 0.75
done
echo "Belum kebuka juga. Cek: docker compose logs"
exit 1
