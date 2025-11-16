-- ==============================================
-- Cre8tly Studio - Manage Landing Analytics Partitions
-- ==============================================

-- 1️⃣ Create the next month’s partition if missing
SET @next_partition_name = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), 'p%Y_%m');
SET @next_partition_limit = DATE_FORMAT(DATE_ADD(LAST_DAY(DATE_ADD(CURDATE(), INTERVAL 1 MONTH)), INTERVAL 1 DAY), '%Y-%m-%d');

-- Check if the next partition already exists
SET @exists_query = CONCAT(
  "SELECT COUNT(*) INTO @exists FROM information_schema.partitions ",
  "WHERE table_schema = DATABASE() ",
  "AND table_name = 'landing_analytics' ",
  "AND partition_name = '", @next_partition_name, "'"
);
PREPARE stmt_check FROM @exists_query;
EXECUTE stmt_check;
DEALLOCATE PREPARE stmt_check;

-- If not exists, add new partition dynamically
SET @exists = IFNULL(@exists, 0);

SET @alter_query = IF(
  @exists = 0,
  CONCAT(
    "ALTER TABLE landing_analytics ",
    "ADD PARTITION (PARTITION ", @next_partition_name,
    " VALUES LESS THAN (TO_DAYS('", @next_partition_limit, "')))"
  ),
  "SELECT 'Partition already exists, skipping.'"
);

PREPARE stmt_alter FROM @alter_query;
EXECUTE stmt_alter;
DEALLOCATE PREPARE stmt_alter;

-- 2️⃣ Drop partitions older than 12 months
SET @old_cutoff = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 12 MONTH), 'p%Y_%m');

SET @drop_query = CONCAT(
  "SELECT COUNT(*) INTO @old_exists FROM information_schema.partitions ",
  "WHERE table_schema = DATABASE() ",
  "AND table_name = 'landing_analytics' ",
  "AND partition_name = '", @old_cutoff, "'"
);
PREPARE stmt_check_old FROM @drop_query;
EXECUTE stmt_check_old;
DEALLOCATE PREPARE stmt_check_old;

SET @old_exists = IFNULL(@old_exists, 0);

SET @drop_sql = IF(
  @old_exists > 0,
  CONCAT("ALTER TABLE landing_analytics DROP PARTITION ", @old_cutoff),
  "SELECT 'No old partition to drop.'"
);
PREPARE stmt_drop FROM @drop_sql;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;
