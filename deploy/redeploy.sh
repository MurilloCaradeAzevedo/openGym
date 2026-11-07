#!/usr/bin/env bash
# The only thing the CI deploy key may run (forced command in ~/.ssh/authorized_keys, installed
# root-owned as /usr/local/sbin/opengym-redeploy by setup-server.sh). It takes one argument, the
# commit CI tested, and starts exactly the images CI built from it (tag sha-<commit>), so a newer
# push that published :edge meanwhile cannot slip an untested image in.
set -euo pipefail
# The forced command passes "$SSH_ORIGINAL_COMMAND" as $1 (sudo clears the environment).
SHA="${1:-}"
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "redeploy: expected a 40-character commit sha" >&2; exit 2; }
DIR="${OPENGYM_DIR:-/home/ubuntu/opengym}"
cd "$DIR"
sudo -u "$(stat -c %U "$DIR")" git fetch --depth 1 origin "$SHA"
sudo -u "$(stat -c %U "$DIR")" git reset --hard FETCH_HEAD
export IMAGE_TAG="sha-$SHA"
C="docker compose -f docker-compose.yml -f deploy/compose.prod.yml"
$C pull
$C up -d --remove-orphans
docker image prune -f >/dev/null
echo "redeployed $SHA"
