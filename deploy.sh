#!/bin/bash
echo "=== Deploying MASTER PRINT ERP ==="
git pull origin main || true
npm install --production
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
pm2 save
echo "=== Deployment Complete! Running on port 3000 ==="
