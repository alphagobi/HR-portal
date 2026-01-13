<?php
require_once __DIR__ . '/../public/api/config.php';

try {
    $pdo->exec("ALTER TABLE users ADD COLUMN working_days VARCHAR(255) DEFAULT '[\"Mon\",\"Tue\",\"Wed\",\"Thu\",\"Fri\"]'");
    echo "Column 'working_days' added successfully.\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "Column 'working_days' already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
