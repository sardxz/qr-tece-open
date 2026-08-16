#!/bin/bash
set -e

# ── Configurações da VPS ──
# Defina via variáveis de ambiente (ex.: em um .env local, fora do versionamento).
VPS_USER="${VPS_USER:?defina VPS_USER}"
VPS_HOST="${VPS_HOST:?defina VPS_HOST}"
VPS_PATH="${VPS_PATH:-/var/www/tece}"
PM2_APP="${PM2_APP:-tece}"
# ──────────────────────────

MODE=${1:-""}

step() {
  echo ""
  echo "▶ $1"
}

case "$MODE" in
  prod)
    step "Fazendo push para o GitHub..."
    git push origin main

    step "Conectando ao VPS e fazendo deploy..."
    ssh "$VPS_USER@$VPS_HOST" "
      set -e
      cd $VPS_PATH
      git pull origin main
      npm install
      npm run build
      /usr/bin/pm2 restart $PM2_APP
    "

    echo ""
    echo "✅ Deploy concluído em produção!"
    ;;

  *)
    echo ""
    echo "Uso: ./deploy.sh prod"
    exit 1
    ;;
esac
