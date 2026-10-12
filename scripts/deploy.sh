#!/bin/bash
set -euo pipefail

# MODIFICAR CON LA RUTA REAL DE TU APLICACIÓN
cd /home/ubuntu/telegram-admin/telegram-bot

echo "Actualizando repositorio..."
git pull --ff-only

echo "Instalando dependencias..."
npm ci

echo "Reiniciando aplicación..."
pm2 restart telegram-admin --update-env

echo "Deploy finalizado"