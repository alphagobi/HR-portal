<?php
require_once 'public/api/config.php';

try {
    // Remove planned_time if it exists (might fail if not exists, but we can ignore or check)
    // For simplicity in this script, we'll try to drop it.
    try {
        $pdo->exec("ALTER TABLE planned_tasks DROP COLUMN planned_time");
        echo "Column 'planned_time' dropped.\n";
    } catch (PDOException $e) {
        echo "Column 'planned_time' might not exist or error dropping: " . $e->getMessage() . "\n";
    }

    // Add new columns
    $sql = "ALTER TABLE planned_tasks 
            ADD COLUMN start_time VARCHAR(10) DEFAULT NULL,
            ADD COLUMN end_time VARCHAR(10) DEFAULT NULL,
            ADD COLUMN related_entry_id INT DEFAULT NULL";
    
    $pdo->exec($sql);
    echo "Columns 'start_time', 'end_time', 'related_entry_id' added successfully.\n";

} catch (PDOException $e) {
    echo "Error updating table: " . $e->getMessage() . "\n";
}
?>
