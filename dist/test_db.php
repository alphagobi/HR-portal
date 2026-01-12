<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/config.php';

try {
    echo "Attempting to connect to database...<br>";
    echo "Host: $host<br>";
    echo "Database: $db_name<br>";
    echo "Username: $username<br>";
    
    // Test connection
    $stmt = $pdo->query("SELECT 'Connection Successful!' as msg");
    $result = $stmt->fetch();
    echo "<h1>" . $result['msg'] . "</h1>";
    
    // Test Users table
    $stmt = $pdo->query("SELECT count(*) as count FROM users");
    $count = $stmt->fetch();
    echo "Users found in database: " . $count['count'] . "<br>";
    
} catch (PDOException $e) {
    echo "<h1 style='color:red'>Connection Failed</h1>";
    echo "Error: " . $e->getMessage();
}
?>
