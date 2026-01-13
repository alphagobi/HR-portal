<?php
require_once __DIR__ . '/../public/api/config.php';

try {
    $stmt = $pdo->query("DESCRIBE planned_tasks");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Columns in planned_tasks: " . implode(", ", $columns) . "\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
