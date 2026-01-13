<?php
require_once __DIR__ . '/../public/api/config.php';

try {
    // Add visible_to column (JSON type for storing array of user IDs)
    // Default is empty array [] (or null, but empty array is safer for JSON operations)
    $sql = "ALTER TABLE users ADD COLUMN visible_to JSON DEFAULT NULL";
    
    $pdo->exec($sql);
    echo "Column 'visible_to' added successfully.\n";
    
    // Initialize existing users with empty array or null if preferred.
    // Let's set it to '[]' for consistency if we want strict JSON.
    // But NULL is fine as "no one".
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), "Duplicate column name") !== false) {
        echo "Column 'visible_to' already exists.\n";
    } else {
        echo "Error adding column: " . $e->getMessage() . "\n";
    }
}
?>
