@echo off
echo ==============================================
echo   TRAFFIC PLATFORM - Demarrage des services
echo ==============================================
echo.
echo IMPORTANT: Verifie que XAMPP MySQL est demarre !
echo.
echo Lancement de tous les services...
echo.

start "Auth Service :3001"          cmd /k "cd /d "%~dp0services\auth" && node index.js"
timeout /t 3 /nobreak >nul

start "Vehicle Service :3002"       cmd /k "cd /d "%~dp0services\vehicle" && node index.js"
timeout /t 2 /nobreak >nul

start "Traffic Service :3003"       cmd /k "cd /d "%~dp0services\traffic" && node index.js"
timeout /t 2 /nobreak >nul

start "Incident Service :3004"      cmd /k "cd /d "%~dp0services\incident" && node index.js"
timeout /t 2 /nobreak >nul

start "Notification Service :3005"  cmd /k "cd /d "%~dp0services\notification" && node index.js"
timeout /t 3 /nobreak >nul

start "GraphQL Gateway :4000"       cmd /k "cd /d "%~dp0gateway" && node index.js"

echo.
echo ==============================================
echo   TOUS LES SERVICES LANCES !
echo ==============================================
echo.
echo   GraphQL : http://localhost:4000/graphql
echo   Auth    : http://localhost:3001/health
echo   Vehicle : http://localhost:3002/health
echo   Traffic : http://localhost:3003/health
echo   Incident: http://localhost:3004/health
echo   Notif   : http://localhost:3005/health
echo.
timeout /t 5 /nobreak >nul
start "" "http://localhost:4000/graphql"
pause
