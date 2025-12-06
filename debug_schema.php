<?php
require_once 'public/api/config.php';

try {
    $stmt = $pdo->query("DESCRIBE announcements");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    print_r($columns);
    
    echo "\n--- Sample Data ---\n";
    $stmt = $pdo->query("SELECT * FROM announcements LIMIT 1");
    print_r($stmt->fetch(PDO::FETCH_ASSOC));

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>
