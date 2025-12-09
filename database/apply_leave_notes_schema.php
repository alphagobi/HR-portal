<?php
require_once '../public/api/config.php';

try {
    // Add admin_note column
    $pdo->exec("ALTER TABLE leaves ADD COLUMN admin_note TEXT DEFAULT NULL");
    echo "Added admin_note column.\n";
} catch (PDOException $e) {
    echo "admin_note column might already exist or error: " . $e->getMessage() . "\n";
}

try {
    // Add employee_note column
    $pdo->exec("ALTER TABLE leaves ADD COLUMN employee_note TEXT DEFAULT NULL");
    echo "Added employee_note column.\n";
} catch (PDOException $e) {
    echo "employee_note column might already exist or error: " . $e->getMessage() . "\n";
}

echo "Schema update completed.\n";
?>
