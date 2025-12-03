<?php
require_once 'public/api/config.php';

try {
    $pdo->exec("ALTER TABLE activities ADD COLUMN user_id INT, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
    echo "Schema updated successfully: Added user_id column to activities.\n";
} catch (PDOException $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>
