#!/bin/bash
# ============================================
# The Messy Attic - Log Rotation & Compression
# ============================================

LOG_DIR="/home/cre8tlystudio-api/cre8tlystudio-api/logs"
ARCHIVE_DIR="$LOG_DIR/archive"
MAX_SIZE=1048576  # 1 MB

mkdir -p "$ARCHIVE_DIR"

for LOG_FILE in "$LOG_DIR"/*.log; do
  [ -e "$LOG_FILE" ] || continue  # skip if none exist

  FILE_SIZE=$(stat -c%s "$LOG_FILE")

  if [ "$FILE_SIZE" -gt "$MAX_SIZE" ]; then
    TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
    BASENAME=$(basename "$LOG_FILE")
    ROTATED_NAME="${ARCHIVE_DIR}/${BASENAME%.log}_$TIMESTAMP.log"

    echo "$(date '+%Y-%m-%d %H:%M:%S') 🔄 Rotating $BASENAME ($FILE_SIZE bytes)"
    mv "$LOG_FILE" "$ROTATED_NAME"

    # Recreate empty file for continued logging
    touch "$LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ New log file created after rotation." >> "$LOG_FILE"

    # Compress rotated log
    gzip -9 "$ROTATED_NAME"
    echo "$(date '+%Y-%m-%d %H:%M:%S') 📦 Compressed $BASENAME to .gz" >> "$LOG_FILE"
  fi
done

# 🧹 Optional: Remove .gz archives older than 90 days
find "$ARCHIVE_DIR" -name "*.gz" -type f -mtime +90 -exec rm -f {} \;
