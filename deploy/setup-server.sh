#!/usr/bin/env bash
# One-time setup of an Ubuntu server for openGym in production (Oracle Cloud Always Free ARM, or any
# VPS). Safe to run again: it updates the deploy files and restarts; ./data is never touched.
# Fetch it from a pinned commit and check its sha256 before running it (deploy/README.md):
#   COMMIT=<commit id> bash setup-server.sh <domain>
# Images come from CI (.github/workflows/docker-publish.yml); this server never builds.
set -euo pipefail
DOMAIN="${1:?usage: setup-server.sh <domain>}"
OWNER="${IMAGE_OWNER:-murillocaradeazevedo}"
REPO="${REPO:-https://github.com/MurilloCaradeAzevedo/openGym.git}"
BRANCH="${BRANCH:-main}"
# The commit to install; the branch head when unset.
REF="${COMMIT:-$BRANCH}"
DIR="$HOME/opengym"
# How long sign-up stays open for the owner on a server with no profile yet.
SIGNUP_MINUTES="${SIGNUP_MINUTES:-15}"

# Docker from Docker's own apt repository, its signing key checked against the published fingerprint.
if ! command -v docker >/dev/null; then
  DOCKER_KEY_FPR=9DC858229FC7DD38854AE2D88D81803C0EBFCD88
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  key=$(mktemp)
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o "$key"
  if ! gpg --show-keys --with-colons "$key" | grep -q "^fpr:*$DOCKER_KEY_FPR:"; then
    echo "Docker's signing key does not match the expected fingerprint; stopping." >&2
    exit 1
  fi
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo install -m 0644 "$key" /etc/apt/keyrings/docker.asc
  rm -f "$key"
  codename=$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $codename stable" |
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images ship iptables rules that drop everything but SSH, on top of the cloud
# firewall (the VCN security list, where 80 and 443 have to be opened in the console too).
for p in 80 443; do
  sudo iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 5 -p tcp --dport "$p" -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then sudo netfilter-persistent save; fi

# Only what running needs: the compose files and deploy/. No source tree, no build.
if [ ! -d "$DIR/.git" ]; then
  git clone --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO" "$DIR"
  git -C "$DIR" sparse-checkout set deploy
fi
git -C "$DIR" fetch --depth 1 origin "$REF" && git -C "$DIR" reset --hard FETCH_HEAD
cd "$DIR"

if [ ! -f .env ]; then
  umask 077
  cat > .env <<EOF
DOMAIN=$DOMAIN
RP_ID=$DOMAIN
ORIGIN=https://$DOMAIN
IMAGE_OWNER=$OWNER
IMAGE_TAG=edge
# Closed by default: a new profile needs an invite code from the admin, and there is no guest mode.
INVITE_ONLY=1
ALLOW_GUEST=0
# The owner signs up first. On a server with no profile yet, setup-server.sh opens sign-up once,
# for $SIGNUP_MINUTES minutes: create your profile then, it becomes the admin and invites everyone else.
# FIRST_USER_ADMIN only acts while there are no profiles at all, and only together with INVITE_ONLY=1.
FIRST_USER_ADMIN=1
# Name and password sign-in next to passkeys, so friends on any phone can join.
# Set PASSWORD_LOGIN=0 once the owner has a passkey, unless friends still need passwords.
PASSWORD_LOGIN=1
DEFAULT_LANG=pt-BR
EOF
fi
mkdir -p data coach-auth

COMPOSE_CMD="docker compose -f docker-compose.yml -f deploy/compose.prod.yml"
COMPOSE="sudo $COMPOSE_CMD"
$COMPOSE pull
$COMPOSE up -d --remove-orphans
$COMPOSE ps

# Profiles on the server: 0 when there is no db.json yet, -1 when it cannot be read (then sign-up
# stays closed).
profiles() {
  $COMPOSE exec -T api node -e 'const fs = require("fs"); let n
    try { n = JSON.parse(fs.readFileSync("/data/db.json", "utf8")).users.length } catch (e) { n = e.code === "ENOENT" ? 0 : -1 }
    console.log(n)' 2>/dev/null || echo -1
}
# The api needs a moment after a (re)start before it answers.
for _ in $(seq 1 30); do n=$(profiles); [ "$n" != -1 ] && break; sleep 2; done
if [ "$n" = 0 ]; then
  echo "No profile yet. Sign-up is open for $SIGNUP_MINUTES minutes: create yours now at https://$DOMAIN"
  sudo env INVITE_ONLY=0 $COMPOSE_CMD up -d api
  for _ in $(seq 1 $((SIGNUP_MINUTES * 12))); do
    n=$(profiles)
    if [ "$n" -ge 1 ] 2>/dev/null; then echo "Profile created; it is the admin."; break; fi
    sleep 5
  done
  # Back to the .env values (INVITE_ONLY=1), whether or not a profile was made.
  $COMPOSE up -d api
  if ! [ "$n" -ge 1 ] 2>/dev/null; then
    echo "No profile was created; run setup-server.sh again to reopen sign-up."
  fi
fi

# Root's cron and the deploy run root-owned copies, never files the login user can edit.
sudo install -o root -g root -m 0755 deploy/backup.sh /usr/local/sbin/opengym-backup
sed "s|@DIR@|$DIR|" <<'DEPLOY' | sudo tee /usr/local/sbin/opengym-deploy >/dev/null
#!/usr/bin/env bash
# Deploys one tested commit: opengym-deploy <commit id>. Written by setup-server.sh, owned by root.
# Through a restricted key the call arrives whole in SSH_ORIGINAL_COMMAND: only its last word counts.
set -euo pipefail
SHA="${*##* }"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "usage: opengym-deploy <40-character commit id>" >&2; exit 2; }
DIR="@DIR@"
OWNER=$(stat -c %U "$DIR")
as_owner() { sudo -u "$OWNER" -- "$@"; }
cd "$DIR"
as_owner git fetch --depth 1 origin "$SHA"
as_owner git reset --hard "$SHA"
install -o root -g root -m 0755 deploy/backup.sh /usr/local/sbin/opengym-backup
export IMAGE_TAG="sha-$SHA"
C=(docker compose -f docker-compose.yml -f deploy/compose.prod.yml)
"${C[@]}" pull
# Kept in .env, so a manual `up -d` later runs the same images.
if grep -q '^IMAGE_TAG=' .env; then as_owner sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/" .env
else echo "IMAGE_TAG=$IMAGE_TAG" | as_owner tee -a .env >/dev/null; fi
"${C[@]}" up -d --remove-orphans
docker image prune -f >/dev/null
echo "deployed $SHA"
DEPLOY
sudo chown root:root /usr/local/sbin/opengym-deploy
sudo chmod 0755 /usr/local/sbin/opengym-deploy

# Nightly backup at 03:30 server time, as root: the api writes db.json and the secret 0600.
{ sudo crontab -l 2>/dev/null | grep -v -e 'opengym/deploy/backup.sh' -e 'opengym-backup ' || true
  echo "30 3 * * * OPENGYM_DIR=$DIR BACKUP_DIR=$HOME/opengym-backups /usr/local/sbin/opengym-backup >> /var/log/opengym-backup.log 2>&1"
} | sudo crontab -
echo "Done: https://$DOMAIN (the certificate can take a minute on the first start)"
