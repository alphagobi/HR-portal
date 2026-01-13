<?php
require_once __DIR__ . '/../public/api/config.php';

try {
    // Add visible_to_core_hours column
    $sql = "ALTER TABLE users ADD COLUMN visible_to_core_hours JSON DEFAULT NULL";
    
    $pdo->exec($sql);
    echo "Column 'visible_to_core_hours' added successfully.\n";
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Column 'visible_to_core_hours' already exists.\n";
    } else {
        echo "Error adding column: " . $e->getMessage() . "\n";
    }
}
?>
