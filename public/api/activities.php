<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT a.*, u.name as user_name FROM activities a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT 20");
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO activities (text, type, user_id) VALUES (?, ?, ?)");
    
    try {
        $stmt->execute([
            $data['text'],
            $data['type'] ?? 'info',
            $data['user_id'] ?? null
        ]);
        echo json_encode(["message" => "Activity logged", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
