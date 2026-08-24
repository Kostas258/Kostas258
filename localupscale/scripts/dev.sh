#!/usr/bin/env bash
# Lancement développement — macOS / Linux.
# Démarre le backend FastAPI local puis le frontend Vite.
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# --- Backend -----------------------------------------------------------------
cd "$RACINE/backend"
if [ ! -d .venv ]; then
  echo "Création de l'environnement Python (.venv)…"
  python3.11 -m venv .venv
  .venv/bin/pip install -e '.[dev]'
fi
echo "Démarrage du backend local (http://127.0.0.1:8756)…"
.venv/bin/python -m app.main &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT

# --- Frontend ----------------------------------------------------------------
cd "$RACINE/frontend"
if [ ! -d node_modules ]; then
  echo "Installation des dépendances frontend…"
  npm install
fi
echo "Démarrage du frontend (http://localhost:1420)…"
npm run dev
