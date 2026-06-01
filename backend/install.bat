@echo off
chcp 65001 >nul
echo ════════════════════════════════════════════════════════
echo   TRAFFIC PLATFORM — Installation des dépendances
echo   TEK-UP University 2024-2025
echo ════════════════════════════════════════════════════════
echo.

:: Vérifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERREUR] Node.js n'est pas installé !
  echo Télécharge-le sur https://nodejs.org
  pause
  exit /b 1
)
echo [OK] Node.js détecté :
node --version
echo.

echo [1/6] Installation Auth Service...
cd services\auth
call npm install
if errorlevel 1 ( echo [ERREUR] Auth Service && cd ..\.. && goto :error )
cd ..\..

echo.
echo [2/6] Installation Vehicle Service...
cd services\vehicle
call npm install
if errorlevel 1 ( echo [ERREUR] Vehicle Service && cd ..\.. && goto :error )
cd ..\..

echo.
echo [3/6] Installation Traffic Service...
cd services\traffic
call npm install
if errorlevel 1 ( echo [ERREUR] Traffic Service && cd ..\.. && goto :error )
cd ..\..

echo.
echo [4/6] Installation Incident Service...
cd services\incident
call npm install
if errorlevel 1 ( echo [ERREUR] Incident Service && cd ..\.. && goto :error )
cd ..\..

echo.
echo [5/6] Installation Notification Service...
cd services\notification
call npm install
if errorlevel 1 ( echo [ERREUR] Notification Service && cd ..\.. && goto :error )
cd ..\..

echo.
echo [6/6] Installation GraphQL Gateway (avec socket.io)...
cd gateway
call npm install
if errorlevel 1 ( echo [ERREUR] Gateway && cd .. && goto :error )
cd ..

echo.
echo ════════════════════════════════════════════════════════
echo   ✅ INSTALLATION TERMINÉE AVEC SUCCÈS !
echo ════════════════════════════════════════════════════════
echo.
echo Prochaine étape :
echo   1. Démarre XAMPP et active MySQL
echo   2. Importe database/schema.sql dans phpMyAdmin
echo   3. Lance start-all.bat
echo.
echo (Alternative Docker : docker-compose up --build)
echo.
pause
exit /b 0

:error
echo.
echo [ERREUR] Installation échouée. Vérifie ta connexion internet.
pause
exit /b 1
