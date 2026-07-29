#!/usr/bin/env bash
set -euo pipefail

BACKUP_PATH=${BACKUP_PATH:-""}
MONGODB_URI=${MONGODB_URI:-""}

if [ -z "$BACKUP_PATH" ] || [ -z "$MONGODB_URI" ]; then
  echo "BACKUP_PATH and MONGODB_URI are required" >&2
  exit 1
fi

mongorestore --uri="$MONGODB_URI" "$BACKUP_PATH"
