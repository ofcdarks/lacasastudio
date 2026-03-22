#!/bin/sh
set -e

DB_PATH="/app/data/lacasastudio.db"
BACKUP_DIR="/app/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lacasastudio_$DATE.db"

if [ ! -f "$DB_PATH" ]; then
  echo "⚠️ Database not found at $DB_PATH"
  exit 1
fi

echo "📦 Backing up database..."
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/lacasastudio_*.db 2>/dev/null | tail -n +8 | xargs rm -f 2>/dev/null || true

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "✅ Backup complete: $BACKUP_FILE ($SIZE)"
