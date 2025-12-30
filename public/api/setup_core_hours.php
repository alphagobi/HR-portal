<?php
require_once 'config.php';

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_settings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            setting_key VARCHAR(50) NOT NULL,
            setting_value JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user_setting (user_id, setting_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "Table 'user_settings' created or already exists.";
} catch (PDOException $e) {
    die("DB ERROR: " . $e->getMessage());
}
?>
