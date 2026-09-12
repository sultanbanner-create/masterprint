@echo off
chcp 65001 > nul
title MASTER PRINT — Онлайн Сервер
echo ========================================================
echo   MASTER PRINT ERP Enterprise 3.0
echo   Запуск сервера и глобального онлайн-доступа (Cloudflare)...
echo ========================================================
cd /d "%~dp0"

start "MASTER PRINT Server" cmd /c "node server.js"
timeout /t 2 > nul
start http://localhost:3000
start "Cloudflare Tunnel" "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000

echo.
echo [OK] Локальный адрес:  http://localhost:3000
echo [OK] В сети Wi-Fi:     http://192.168.0.166:3000
echo.
pause
