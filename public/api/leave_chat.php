<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $leave_id = $_GET['leave_id'] ?? null;
    
    if (!$leave_id) {
        http_response_code(400);
        echo json_encode(["error" => "Leave ID is required"]);
        exit;
    }

    // Fetch messages for the leave request
    // Join with users to get sender names if needed, but sender_type might be enough for UI
    // Let's join to be safe and show names
    $stmt = $pdo->prepare("
        SELECT lc.*, u.name as sender_name 
        FROM leave_chats lc 
        JOIN users u ON lc.sender_id = u.id 
        WHERE lc.leave_id = ? 
        ORDER BY lc.created_at ASC
    ");
    $stmt->execute([$leave_id]);
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['leave_id']) || !isset($data['sender_id']) || !isset($data['sender_type']) || !isset($data['message'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO leave_chats (leave_id, sender_id, sender_type, message) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $data['leave_id'],
            $data['sender_id'],
            $data['sender_type'],
            $data['message']
        ]);
        
        echo json_encode(["message" => "Message sent successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
