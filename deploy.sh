#!/bin/bash
set -e

echo "=========================================="
echo "  УСТАНОВКА И ЗАПУСК MASTER PRINT ERP     "
echo "=========================================="

# 1. Проверка root прав
if [ "$EUID" -ne 0 ]; then
  echo "Пожалуйста, запустите скрипт с sudo: sudo bash deploy.sh"
  exit 1
fi

# 2. Обновление пакетов и установка Docker при необходимости
if ! command -v docker &> /dev/null; then
    echo "Установка Docker..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg lsb-release
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
fi

# 3. Настройка фаервола
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
    ufw allow 3000/tcp || true
fi

# 4. Подготовка директорий
mkdir -p prisma
mkdir -p public/uploads
touch prisma/dev.db

# 5. Сборка и запуск контейнера
echo "Сборка контейнера Master Print ERP..."
docker compose down || true
docker compose build
docker compose up -d

SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "ваш_ip")

echo "=========================================="
echo "  СИСТЕМА УСПЕШНО РАЗВЕРНУТА И РАБОТАЕТ!  "
echo "=========================================="
echo "Открыть в браузере:"
echo "http://${SERVER_IP}"
echo "=========================================="
