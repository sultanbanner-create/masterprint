@echo off
chcp 65001 > nul
title MASTER PRINT — Онлайн Сервер
echo ========================================================
echo   MASTER PRINT ERP Enterprise 3.0
echo   Запуск сервера и глобального онлайн-доступа...
echo ========================================================
cd /d "%~dp0"

start "MASTER PRINT Server" cmd /c "node server.js"
timeout /t 2 > nul
start http://localhost:3000
start "MASTER PRINT Online Tunnel" cmd /c "npx --yes localtunnel --port 3000 --subdomain masterprint-erp"

echo.
echo [OK] Локальный адрес:  http://localhost:3000
echo [OK] В сети Wi-Fi:     http://192.168.0.166:3000
echo [OK] Онлайн ссылка:    https://masterprint-erp.loca.lt
echo.
echo ========================================================
pause
