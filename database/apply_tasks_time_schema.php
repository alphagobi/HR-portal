<?php
require_once '../public/api/config.php';

try {
    $sql = "ALTER TABLE planned_tasks ADD COLUMN planned_time VARCHAR(10) DEFAULT NULL";
    $pdo->exec($sql);
    echo "Column 'planned_time' added successfully to 'planned_tasks'.\n";
} catch (PDOException $e) {
    echo "Error updating table: " . $e->getMessage() . "\n";
}
?>
