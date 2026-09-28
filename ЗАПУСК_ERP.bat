@echo off
chcp 65001 > nul
title OUTDOOR ERP - Управление наружной рекламой
echo ========================================================
echo   ⚡ OUTDOOR ERP: Заказы, Дедлайны цеха, Мастера & Касса
echo   Команда: Тимур, Жалгас, Абзал, Альберт
echo ========================================================
echo.
cd /d "C:\Users\User\.gemini\antigravity\scratch\outdoor-erp"
echo Запуск локального сервера Next.js на http://localhost:3000 ...
start http://localhost:3000
npm run dev
pause
