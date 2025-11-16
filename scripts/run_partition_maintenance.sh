#!/bin/bash
# ============================================
# Cre8tly Studio - Landing Analytics Partition Maintenance
# ============================================

# Load environment variables from the .env file
set -o allexport
source /home/cre8tlystudio-api/cre8tlystudio-api/.env 2>/dev/null || echo "⚠️  .env file not found or not readable."
set +o allexport

# Assign variables from your .env
DB_HOST=${MYSQL_HOST:-localhost}
DB_USER=${MYSQL_USER:-root}
DB_PASS=${MYSQL_PASSWORD:-""}
DB_NAME=${MYSQL_DATABASE:-cre8tlystudio}

# Debug check (optional — remove after testing)
echo "✅ Loaded DB vars: user=$DB_USER db=$DB_NAME host=$DB_HOST"

# Run the partition maintenance SQL file
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < /home/cre8tlystudio-api/cre8tlystudio-api/scripts/manage_analytics_partitions.sql

LOG_FILE="/home/cre8tlystudio-api/cre8tlystudio-api/logs/cre8tly_partition.log"

# Ensure the folder exists
mkdir -p "$(dirname "$LOG_FILE")"

# ✅ Log success or failure
if [ $? -eq 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Partition maintenance completed successfully." >> "$LOG_FILE"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') ❌ Partition maintenance FAILED." >> "$LOG_FILE"
fi
