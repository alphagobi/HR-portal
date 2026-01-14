<?php
require_once __DIR__ . '/../public/api/config.php';

try {
    echo "Checking 'planned_tasks' table for 'framework_id' column...\n";
    
    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM planned_tasks LIKE 'framework_id'");
    $exists = $stmt->fetch();

    if ($exists) {
        echo "Column 'framework_id' already exists. No action needed.\n";
    } else {
        // Add the column
        $sql = "ALTER TABLE planned_tasks ADD COLUMN framework_id INT DEFAULT NULL";
        $pdo->exec($sql);
        echo "Success: Column 'framework_id' added to 'planned_tasks' table.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
