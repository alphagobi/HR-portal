<?php
require_once '../public/api/config.php';

try {
    $pdo->exec("ALTER TABLE timesheet_entries ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE");
    echo "Schema updated successfully: Added is_deleted column.\n";
} catch (PDOException $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>
