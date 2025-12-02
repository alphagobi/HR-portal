<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM activities ORDER BY created_at DESC LIMIT 20");
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO activities (text, type) VALUES (?, ?)");
    
    try {
        $stmt->execute([
            $data['text'],
            $data['type'] ?? 'info'
        ]);
        echo json_encode(["message" => "Activity logged", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
