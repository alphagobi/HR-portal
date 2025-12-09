<?php
require_once '../public/api/config.php';

try {
    $sql = "CREATE TABLE IF NOT EXISTS leave_chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        leave_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_type ENUM('employee', 'admin') NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    )";

    $pdo->exec($sql);
    echo "Table 'leave_chats' created successfully.";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage();
}
?>
