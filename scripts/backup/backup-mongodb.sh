#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-./backups/mongodb}
BACKUP_NAME=${BACKUP_NAME:-mongodb-$(date +%Y%m%d-%H%M%S)}
MONGODB_URI=${MONGODB_URI:-""}

if [ -z "$MONGODB_URI" ]; then
  echo "MONGODB_URI is required" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$BACKUP_NAME"
echo "$BACKUP_DIR/$BACKUP_NAME"
