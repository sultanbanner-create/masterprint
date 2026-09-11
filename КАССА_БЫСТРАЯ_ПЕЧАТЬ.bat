@echo off
chcp 65001 > nul
title MASTER PRINT — Терминал Кассы (Быстрая печать)
echo ========================================================
echo   MASTER PRINT POS — РЕЖИМ КИОСКА
echo   (Печать чеков моментально без всплывающих окон)
echo ========================================================
cd /d "%~dp0"

echo 1. Проверка работы сервера...
powershell -Command "if (!(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) { Start-Process 'node' 'server.js' -WindowStyle Hidden; Start-Sleep -Seconds 2 }"

echo 2. Запуск браузера в режиме терминала...
start "" "msedge.exe" --app="http://localhost:3000" --kiosk-printing 2>nul || start "" "chrome.exe" --app="http://localhost:3000" --kiosk-printing 2>nul || start http://localhost:3000

echo [OK] Терминал кассы готов к работе!
