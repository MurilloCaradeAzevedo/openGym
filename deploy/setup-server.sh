#!/usr/bin/env bash
# One-time setup of an Ubuntu server for openGym in production (Oracle Cloud Always Free ARM, or any
# VPS). Safe to run again: it updates the deploy files and restarts; ./data is never touched.
#   curl -fsSL https://raw.githubusercontent.com/MurilloCaradeAzevedo/openGym/main/deploy/setup-server.sh | bash -s -- <domain> ['<CI deploy public key>']
# Images come from CI (.github/workflows/docker-publish.yml); this server never builds.
set -euo pipefail
DOMAIN="${1:?usage: setup-server.sh <domain> [deploy-public-key]}"
DEPLOY_PUBKEY="${2:-}"
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
# No FIRST_USER_ADMIN on a public address: whoever signed up first would own the instance.
# Create your profile, copy Settings > Account > Account ID here, then run this script again.
ADMIN_UIDS=
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

# Root runs these, so root owns the copies: a later git pull of the repo cannot change them.
sudo install -o root -g root -m 755 deploy/backup.sh /usr/local/sbin/opengym-backup
sudo install -o root -g root -m 755 deploy/redeploy.sh /usr/local/sbin/opengym-redeploy

# Nightly backup at 03:30 server time, as root: the api writes db.json and the secret 0600.
( sudo crontab -l 2>/dev/null | grep -v 'opengym-backup\|opengym/deploy/backup.sh'; echo "30 3 * * * OPENGYM_DIR=$DIR BACKUP_DIR=$HOME/opengym-backups /usr/local/sbin/opengym-backup >> /var/log/opengym-backup.log 2>&1" ) | sudo crontab -

# The CI deploy key can run the redeploy script and nothing else: no shell, no forwarding.
if [ -n "$DEPLOY_PUBKEY" ]; then
  install -m 700 -d "$HOME/.ssh"
  touch "$HOME/.ssh/authorized_keys" && chmod 600 "$HOME/.ssh/authorized_keys"
  grep -vF "$DEPLOY_PUBKEY" "$HOME/.ssh/authorized_keys" > "$HOME/.ssh/authorized_keys.new" || true
  # "$SSH_ORIGINAL_COMMAND" stays literal here: sshd's shell expands it into one argument, and
  # the script refuses anything but a 40-character sha.
  printf 'command="sudo OPENGYM_DIR=%s /usr/local/sbin/opengym-redeploy \\"$SSH_ORIGINAL_COMMAND\\"",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding %s\n' "$DIR" "$DEPLOY_PUBKEY" >> "$HOME/.ssh/authorized_keys.new"
  mv "$HOME/.ssh/authorized_keys.new" "$HOME/.ssh/authorized_keys"
fi
echo "Done: https://$DOMAIN (the certificate can take a minute on the first start)"
