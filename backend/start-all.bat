@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   TRAFFIC PLATFORM — Démarrage de tous les services
echo   TEK-UP University 2024-2025
echo ════════════════════════════════════════════════════════
echo.
echo  Prérequis :
echo    - XAMPP MySQL démarré (port 3306)
echo    - database/schema.sql importé dans phpMyAdmin
echo    - install.bat exécuté au préalable
echo.
echo  Chaque service va s'ouvrir dans une fenêtre séparée.
echo.
pause

:: ── Lancement des services avec délai pour respecter les dépendances ──

start "🔐 Auth Service — :3001"           cmd /k "cd /d %~dp0services\auth && echo Starting Auth Service... && npm start"
timeout /t 3 /nobreak >nul

start "🚗 Vehicle Service — :3002"         cmd /k "cd /d %~dp0services\vehicle && echo Starting Vehicle Service... && npm start"
timeout /t 2 /nobreak >nul

start "🚦 Traffic Service — :3003"         cmd /k "cd /d %~dp0services\traffic && echo Starting Traffic Service... && npm start"
timeout /t 2 /nobreak >nul

start "🚨 Incident Service — :3004"        cmd /k "cd /d %~dp0services\incident && echo Starting Incident Service... && npm start"
timeout /t 2 /nobreak >nul

start "🔔 Notification Service — :3005"    cmd /k "cd /d %~dp0services\notification && echo Starting Notification Service... && npm start"
timeout /t 3 /nobreak >nul

start "🚀 GraphQL Gateway — :4000"         cmd /k "cd /d %~dp0gateway && echo Starting Gateway... && npm start"

echo.
echo ════════════════════════════════════════════════════════
echo   ✅ TOUS LES SERVICES LANCÉS !
echo ════════════════════════════════════════════════════════
echo.
echo   🌐 GraphQL Playground : http://localhost:4000/graphql
echo   🏠 Page d'accueil     : http://localhost:4000
echo   🔌 WebSocket          : ws://localhost:4000
echo.
echo   Services :
echo     🔐 Auth         : http://localhost:3001/health
echo     🚗 Vehicle      : http://localhost:3002/health
echo     🚦 Traffic      : http://localhost:3003/health
echo     🚨 Incident     : http://localhost:3004/health
echo     🔔 Notification : http://localhost:3005/health
echo.
timeout /t 5 /nobreak >nul
start "" "http://localhost:4000"
pause
