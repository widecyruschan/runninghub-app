#!/bin/bash
#
# RunningHub 數據庫備份腳本
#
# 用法:
#   ./scripts/backup-db.sh          # 備份到默認目錄 (./backups/)
#   ./scripts/backup-db.sh /path/   # 備份到指定目錄
#
# 還原:
#   停止容器後，將備份文件複製回 data/app.sqlite 即可
#   docker compose stop runninghub-app
#   cp backups/runninghub-backup-*.sqlite data/app.sqlite
#   docker compose start runninghub-app
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
DB_FILE="$PROJECT_DIR/data/app.sqlite"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
    echo "錯誤: 找不到數據庫文件 $DB_FILE"
    echo "如果數據庫已遷移到 Docker 命名卷，請使用以下方法備份:"
    echo "  docker compose exec runninghub-app cp /app/data/app.sqlite /tmp/backup.sqlite"
    echo "  docker compose cp runninghub-app:/app/data/app.sqlite backups/app.sqlite"
    exit 1
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/runninghub-backup-$TIMESTAMP.sqlite"

cp "$DB_FILE" "$BACKUP_FILE"
echo "數據庫已備份到: $BACKUP_FILE"

# 保留最近 10 個備份，刪除舊的
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/runninghub-backup-*.sqlite 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "清理舊備份..."
    ls -1t "$BACKUP_DIR"/runninghub-backup-*.sqlite | tail -n +11 | xargs rm -f
    echo "已清理，保留最近 10 個備份"
fi

echo "備份完成! 當前備份數量: $(ls -1 "$BACKUP_DIR"/runninghub-backup-*.sqlite 2>/dev/null | wc -l)"
