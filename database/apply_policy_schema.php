<?php
require_once '../public/api/config.php';

try {
    // Create policies table
    $pdo->exec("CREATE TABLE IF NOT EXISTS policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        version VARCHAR(50) DEFAULT '1.0',
        category VARCHAR(100) DEFAULT 'General',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    // Create policy_acknowledgments table
    $pdo->exec("CREATE TABLE IF NOT EXISTS policy_acknowledgments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        policy_id INT NOT NULL,
        acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (policy_id) REFERENCES policies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_acknowledgment (user_id, policy_id)
    )");

    echo "Schema updated successfully: Created policies and policy_acknowledgments tables.\n";
} catch (PDOException $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>
