#!/bin/bash
set -euo pipefail

cd /home/ubuntu/telegram-admin/telegram-bot

echo "Actualizando repositorio..."
git pull --ff-only

echo "Instalando dependencias..."
npm ci

echo "Actualización completada correctamente."