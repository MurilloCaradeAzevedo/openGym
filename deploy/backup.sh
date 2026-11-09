#!/usr/bin/env bash
# Nightly copy of ./data (users, passkeys, every profile, the session secret), kept 14 days.
# setup-server.sh and every deploy install a root-owned copy as /usr/local/sbin/opengym-backup,
# and root's cron runs that copy, never this file. Copy ~/opengym-backups off the server too:
# a backup on the same disk does not survive the disk.
set -euo pipefail
# Nothing this script writes is readable by other users, not even for a moment.
umask 077
DIR="${OPENGYM_DIR:-$HOME/opengym}"
OUT="${BACKUP_DIR:-$HOME/opengym-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
mkdir -p "$OUT"
stamp=$(date -u +%Y%m%d-%H%M%S)
# The api writes temp-then-rename, so a file is either old or new, never half written.
tar -czf "$OUT/data-$stamp.tar.gz.part" -C "$DIR" data
mv "$OUT/data-$stamp.tar.gz.part" "$OUT/data-$stamp.tar.gz"
chmod 600 "$OUT/data-$stamp.tar.gz"
find "$OUT" -name 'data-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "backup: $OUT/data-$stamp.tar.gz"
