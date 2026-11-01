#!/usr/bin/env bash
# One-time setup of an Ubuntu server for openGym in production (Oracle Cloud Always Free ARM, or any
# VPS). Safe to run again: it updates the deploy files and restarts; ./data is never touched.
#   curl -fsSL https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/main/deploy/setup-server.sh | bash -s -- <domain>
# Images come from CI (.github/workflows/docker-publish.yml); this server never builds.
set -euo pipefail
DOMAIN="${1:?usage: setup-server.sh <domain>}"
OWNER="${IMAGE_OWNER:-murillocaradeazevedo}"
REPO="${REPO:-https://github.com/MurilloCaradeAzevedo/openGym.git}"
BRANCH="${BRANCH:-main}"
DIR="$HOME/opengym"

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images ship iptables rules that drop everything but SSH, on top of the cloud
# firewall (the VCN security list, where 80 and 443 have to be opened in the console too).
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport "$p" -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

# Only what running needs: the compose files and deploy/. No source tree, no build.
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --depth 1 origin "$BRANCH" && git -C "$DIR" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO" "$DIR"
  git -C "$DIR" sparse-checkout set deploy
fi
cd "$DIR"

if [ ! -f .env ]; then
  umask 077
  cat > .env <<EOF
DOMAIN=$DOMAIN
RP_ID=$DOMAIN
ORIGIN=https://$DOMAIN
IMAGE_OWNER=$OWNER
IMAGE_TAG=edge
# The first profile created becomes the admin: create yours right after the first start.
FIRST_USER_ADMIN=1
# Name and password sign-in next to passkeys, so friends on any phone can join.
PASSWORD_LOGIN=1
DEFAULT_LANG=pt-BR
EOF
fi
mkdir -p data coach-auth

COMPOSE="sudo docker compose -f docker-compose.yml -f deploy/compose.prod.yml"
$COMPOSE pull
$COMPOSE up -d --remove-orphans
$COMPOSE ps

# Nightly backup at 03:30 server time, as root: the api writes db.json and the secret 0600.
chmod +x deploy/backup.sh
( sudo crontab -l 2>/dev/null | grep -v 'opengym/deploy/backup.sh'; echo "30 3 * * * OPENGYM_DIR=$DIR BACKUP_DIR=$HOME/opengym-backups $DIR/deploy/backup.sh >> /var/log/opengym-backup.log 2>&1" ) | sudo crontab -
echo "Done: https://$DOMAIN (the certificate can take a minute on the first start)"
