@echo off
echo ==============================================
echo   TRAFFIC PLATFORM - Installation
echo ==============================================
echo.

echo [1/6] Auth Service...
cd /d "%~dp0services\auth"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo [2/6] Vehicle Service...
cd /d "%~dp0services\vehicle"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo [3/6] Traffic Service...
cd /d "%~dp0services\traffic"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo [4/6] Incident Service...
cd /d "%~dp0services\incident"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo [5/6] Notification Service...
cd /d "%~dp0services\notification"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo [6/6] GraphQL Gateway...
cd /d "%~dp0gateway"
call npm install
if errorlevel 1 goto error
cd /d "%~dp0"

echo.
echo ==============================================
echo   INSTALLATION TERMINEE !
echo ==============================================
echo.
echo Prochaine etape : lance start-all.bat
echo (apres avoir importe database/schema.sql dans phpMyAdmin)
pause
exit /b 0

:error
echo.
echo ERREUR - Installation echouee.
pause
exit /b 1
