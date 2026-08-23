#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Backend: install dependencies, configure env, migrate database, seed data.
cd src/backend
npm ci
if [ ! -f .env ]; then
  cp .env.example .env
fi
npx prisma generate
npx prisma migrate deploy
npm run db:seed

# Frontend: install dependencies.
cd ../frontend
npm ci
