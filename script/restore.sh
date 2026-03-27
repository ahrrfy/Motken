#!/bin/bash
# استعادة قاعدة البيانات من نسخة احتياطية
# Usage: bash script/restore.sh /path/to/backup.sql.gz

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /opt/mutqin/backups/mutqin_*.sql.gz 2>/dev/null || echo "  (no backups found)"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will DROP and recreate the database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "[$(date)] Stopping app..."
docker compose -f /opt/mutqin/docker-compose.yml stop app

echo "[$(date)] Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose -f /opt/mutqin/docker-compose.yml exec -T db \
  psql -U mutqin -d mutqin

echo "[$(date)] Starting app..."
docker compose -f /opt/mutqin/docker-compose.yml start app

echo "[$(date)] Restore completed!"
