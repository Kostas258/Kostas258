#!/usr/bin/env bash
# Exécute l'ensemble des tests (backend pytest + frontend Vitest) — macOS / Linux.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Tests backend (pytest) ==="
cd "$RACINE/backend"
[ -d .venv ] || { python3.11 -m venv .venv && .venv/bin/pip install -e '.[dev]'; }
.venv/bin/python -m pytest

echo "=== Tests frontend (Vitest) ==="
cd "$RACINE/frontend"
[ -d node_modules ] || npm install
npm test
