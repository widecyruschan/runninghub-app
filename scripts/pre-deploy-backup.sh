#!/bin/bash
#
# RunningHub 部署前備份腳本
#
# 支援 Hostinger 共享主機 + Docker VPS 兩種部署模式
#
# 用法:
#   在伺服器部署前運行，自動備份數據庫到項目 backups/ 目錄
#   ./scripts/pre-deploy-backup.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/runninghub-backup-$TIMESTAMP.sqlite"

mkdir -p "$BACKUP_DIR"

echo "============================================="
echo "RunningHub 部署前備份"
echo "時間: $(date)"
echo "============================================="

# 方法 1: Hostinger 共享主機路徑 ($HOME/runninghub-data/)
if [ -f "$HOME/runninghub-data/app.sqlite" ]; then
    echo "從 Hostinger 持久化目錄備份..."
    cp "$HOME/runninghub-data/app.sqlite" "$BACKUP_FILE"
    echo "備份成功: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 方法 2: 項目內 data/ 目錄
elif [ -f "$PROJECT_DIR/data/app.sqlite" ]; then
    echo "從項目 data/ 目錄備份..."
    cp "$PROJECT_DIR/data/app.sqlite" "$BACKUP_FILE"
    echo "備份成功: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 方法 3: Docker 容器
else
    CONTAINER_NAME="runninghub-app"
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
        echo "從 Docker 容器備份..."
        docker cp "${CONTAINER_NAME}:/app/data/app.sqlite" "$BACKUP_FILE" 2>/dev/null || true
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            echo "備份成功: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
        fi

    # 方法 4: Docker 命名卷
    elif docker volume ls --format '{{.Name}}' 2>/dev/null | grep -q 'runninghub-data'; then
        echo "從 Docker 命名卷備份..."
        docker run --rm -v runninghub-data:/data -v "$BACKUP_DIR:/backup" alpine \
            cp /data/app.sqlite "$BACKUP_FILE" 2>/dev/null || true
        if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
            echo "備份成功: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
        fi
    else
        echo "警告: 找不到任何數據庫文件，跳過備份"
        exit 1
    fi
fi

# 保留最近 10 個備份
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/runninghub-backup-*.sqlite 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo "清理舊備份..."
    ls -1t "$BACKUP_DIR"/runninghub-backup-*.sqlite | tail -n +11 | xargs rm -f
fi

echo "備份完成! 當前備份數量: $(ls -1 "$BACKUP_DIR"/runninghub-backup-*.sqlite 2>/dev/null | wc -l)"
