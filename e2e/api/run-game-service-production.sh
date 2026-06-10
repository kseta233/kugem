#!/usr/bin/env sh
set -eu

: "${E2E_BASE_URL:=https://kugem-production.up.railway.app}"
: "${E2E_GAME_SERVICE_APP_SECRET:=s9FcwNc7f6b5f7b4a1e8}"
: "${E2E_GAME_SERVICE_USER_A:=b3abbdd7-d64f-4548-9c81-12a12a41366c}"
: "${E2E_GAME_SERVICE_USER_B:=369315c6-6417-4bb7-aaf2-20978223c51b}"
: "${E2E_GAME_SERVICE_ROOM_PASSWORD:=1234}"

export E2E_BASE_URL
export E2E_GAME_SERVICE_APP_SECRET
export E2E_GAME_SERVICE_USER_A
export E2E_GAME_SERVICE_USER_B
export E2E_GAME_SERVICE_ROOM_PASSWORD

exec npx @playwright/test test e2e/api/game-service-production.spec.ts "$@"
