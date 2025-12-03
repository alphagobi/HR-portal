<?php
require_once 'public/api/config.php';

try {
    $pdo->exec("ALTER TABLE users ADD COLUMN informed_leave_limit INT DEFAULT 6, ADD COLUMN emergency_leave_limit INT DEFAULT 6");
    echo "Schema updated successfully: Added leave limit columns to users.\n";
} catch (PDOException $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>
