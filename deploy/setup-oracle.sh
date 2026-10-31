#!/usr/bin/env bash
# One-time setup of an Ubuntu server (Oracle Cloud Always Free, ARM) for openGym with HTTPS.
#   curl -fsSL https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/melhorias-app/deploy/setup-oracle.sh | bash -s -- <domain>
# Re-running it updates the code and rebuilds; ./data is never touched.
set -euo pipefail
DOMAIN="${1:?usage: setup-oracle.sh <domain>}"
REPO="${REPO:-https://github.com/MurilloCaradeAzevedo/openGym.git}"
BRANCH="${BRANCH:-melhorias-app}"
DIR="$HOME/opengym"

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images ship iptables rules that drop everything but SSH, on top of the cloud
# firewall (the VCN security list, which needs 80 and 443 opened in the console too).
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport "$p" -j ACCEPT
done
sudo sh -c 'command -v netfilter-persistent >/dev/null && netfilter-persistent save' || true

if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --depth 1 origin "$BRANCH" && git -C "$DIR" reset --hard FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR"

if [ ! -f .env ]; then
  cat > .env <<EOF
DOMAIN=$DOMAIN
RP_ID=$DOMAIN
ORIGIN=https://$DOMAIN
# The first profile created becomes the admin: create yours right after the first start.
FIRST_USER_ADMIN=1
# Name and password sign-in next to passkeys, so friends on any phone can join.
PASSWORD_LOGIN=1
DEFAULT_LANG=pt-BR
EOF
fi

sudo docker compose -f docker-compose.yml -f deploy/compose.caddy.yml up -d --build
sudo docker compose -f docker-compose.yml -f deploy/compose.caddy.yml ps
echo "Done: https://$DOMAIN (the certificate can take a minute on the first start)"
