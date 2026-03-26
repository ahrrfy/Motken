#!/bin/bash
# نسخ احتياطي تلقائي لقاعدة البيانات
# Usage: bash script/backup.sh
# Schedule via cron: 0 */6 * * * /opt/mutqin/script/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/mutqin/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/mutqin_$TIMESTAMP.sql.gz"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Dump database from Docker container
docker compose -f /opt/mutqin/docker-compose.yml exec -T db \
  pg_dump -U mutqin mutqin | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "[$(date)] Backup created: $BACKUP_FILE ($SIZE)"
else
  echo "[$(date)] ERROR: Backup failed!"
  exit 1
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "mutqin_*.sql.gz" -mtime +$RETENTION_DAYS -delete
REMAINING=$(ls -1 "$BACKUP_DIR"/mutqin_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Cleanup done. $REMAINING backups remaining."
