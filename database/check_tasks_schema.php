<?php
require_once '../public/api/config.php';

try {
    $stmt = $pdo->query("DESCRIBE planned_tasks");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Schema for pleasant_tasks:\n";
    foreach ($columns as $col) {
        echo $col['Field'] . " - " . $col['Type'] . " - Null: " . $col['Null'] . "\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
