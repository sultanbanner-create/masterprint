@echo off
chcp 65001 > nul
title Выгрузка MASTER PRINT на GitHub
echo ========================================================
echo   ОТПРАВКА ПРОЕКТА В РЕПОЗИТОРИЙ GITHUB:
echo   https://github.com/sultanbanner-create/masterprint.git
echo ========================================================
cd /d "%~dp0"

echo.
echo [1/3] Проверка ветки main...
"C:\Program Files\Git\cmd\git.exe" branch -M main

echo.
echo [2/3] Настройка удаленного репозитория...
"C:\Program Files\Git\cmd\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/sultanbanner-create/masterprint.git

echo.
echo [3/3] Отправка файлов на GitHub...
echo (Если откроется окно браузера - нажмите "Authorize GitCredentialManager")
echo.
"C:\Program Files\Git\cmd\git.exe" push -u origin main --force

echo.
echo ========================================================
echo   ГОТОВО! Проверьте репозиторий:
echo   https://github.com/sultanbanner-create/masterprint
echo ========================================================
pause
