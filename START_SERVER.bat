@echo off
chcp 65001 > nul
title MASTER PRINT ERP Enterprise Server
echo ========================================================
echo   MASTER PRINT ERP Enterprise 3.0
echo   Запуск сервера и интерфейса кассы...
echo ========================================================
cd /d "%~dp0"
start http://localhost:3000
"C:\Program Files\nodejs\node.exe" server.js
pause
