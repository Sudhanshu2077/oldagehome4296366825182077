#!/usr/bin/env bash
set -euo pipefail

STORAGE_ROOT=${STORAGE_ROOT:-./.storage}
BACKUP_DIR=${BACKUP_DIR:-./backups/storage}
BACKUP_NAME=${BACKUP_NAME:-storage-$(date +%Y%m%d-%H%M%S)}

mkdir -p "$BACKUP_DIR/$BACKUP_NAME"
cp -r "$STORAGE_ROOT/." "$BACKUP_DIR/$BACKUP_NAME/"
echo "$BACKUP_DIR/$BACKUP_NAME"
