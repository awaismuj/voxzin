#!/usr/bin/env bash
# Encrypted MongoDB backup copied off-server. Requires: mongodump, age, rclone (remote configured).
# Env: MONGODB_URI, AGE_RECIPIENT (public key), RCLONE_REMOTE (e.g. s3backup:voxzin-backups)
set -euo pipefail
: "${MONGODB_URI:?}" "${AGE_RECIPIENT:?}" "${RCLONE_REMOTE:?}"
f="voxzin-$(date -u +%Y%m%dT%H%M%SZ).archive.gz.age"
mongodump --uri="$MONGODB_URI" --archive --gzip | age -r "$AGE_RECIPIENT" > "/tmp/$f"
rclone copyto "/tmp/$f" "$RCLONE_REMOTE/$f"
rclone check "/tmp/$f" "$RCLONE_REMOTE/" --one-way --include "$f"
rm -f "/tmp/$f"
rclone delete "$RCLONE_REMOTE" --min-age 30d
echo "Backup $f done"
