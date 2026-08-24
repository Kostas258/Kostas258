@echo off
REM Lancement developpement — Windows.
REM Demarre le backend FastAPI local puis le frontend Vite.
setlocal
set RACINE=%~dp0..

REM --- Backend ---------------------------------------------------------------
cd /d "%RACINE%\backend"
if not exist .venv (
  echo Creation de l'environnement Python ^(.venv^)...
  py -3.11 -m venv .venv
  .venv\Scripts\pip install -e .[dev]
)
echo Demarrage du backend local ^(http://127.0.0.1:8756^)...
start "LocalUpscale backend" .venv\Scripts\python -m app.main

REM --- Frontend --------------------------------------------------------------
cd /d "%RACINE%\frontend"
if not exist node_modules (
  echo Installation des dependances frontend...
  call npm install
)
echo Demarrage du frontend ^(http://localhost:1420^)...
call npm run dev
