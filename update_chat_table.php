<?php
require_once 'public/api/config.php';

try {
    // Check if column exists
    $check = $pdo->query("SHOW COLUMNS FROM leave_chats LIKE 'is_read'");
    if ($check->rowCount() == 0) {
        $sql = "ALTER TABLE leave_chats ADD COLUMN is_read BOOLEAN DEFAULT 0";
        $pdo->exec($sql);
        echo "Column 'is_read' added successfully.";
    } else {
        echo "Column 'is_read' already exists.";
    }
} catch (PDOException $e) {
    echo "Error updating table: " . $e->getMessage();
}
?>
