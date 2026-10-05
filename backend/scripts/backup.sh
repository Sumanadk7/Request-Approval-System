#!/bin/bash
# =========================================================
#  Request Approval System - Database + Media Backup (Linux/Mac)
#  Usage: bash scripts/backup.sh
#  Reads connection settings from environment variables
#  (DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
#  or falls back to the local development defaults.
#  Restore with:
#    PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -f <backup.sql>
# =========================================================
set -e

DB_NAME="${DB_NAME:-requestapproval_db}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-12345}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/../backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/requestapproval_db_${STAMP}.sql"

export PGPASSWORD="$DB_PASSWORD"
pg_dump -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" -f "$BACKUP_FILE"
unset PGPASSWORD

echo "Database backup written to $BACKUP_FILE"

if [ -d "$SCRIPT_DIR/../media" ]; then
    MEDIA_BACKUP="$BACKUP_DIR/media_${STAMP}"
    mkdir -p "$MEDIA_BACKUP"
    cp -r "$SCRIPT_DIR/../media/." "$MEDIA_BACKUP/"
    echo "Media files copied to $MEDIA_BACKUP"
fi

echo "BACKUP COMPLETE"
