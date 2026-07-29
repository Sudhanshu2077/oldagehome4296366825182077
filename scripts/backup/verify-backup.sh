#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${BACKUP_DIR:-""}

if [ -z "$BACKUP_DIR" ]; then
  echo "BACKUP_DIR is required" >&2
  exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
  echo "BACKUP_DIR does not exist: $BACKUP_DIR" >&2
  exit 1
fi

find "$BACKUP_DIR" -type f | wc -l
