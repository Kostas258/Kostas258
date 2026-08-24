@echo off
REM Execute l'ensemble des tests (backend pytest + frontend Vitest) — Windows.
setlocal
set RACINE=%~dp0..

echo === Tests backend (pytest) ===
cd /d "%RACINE%\backend"
if not exist .venv (
  py -3.11 -m venv .venv
  .venv\Scripts\pip install -e .[dev]
)
.venv\Scripts\python -m pytest || exit /b 1

echo === Tests frontend (Vitest) ===
cd /d "%RACINE%\frontend"
if not exist node_modules call npm install
call npm test
