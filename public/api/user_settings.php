<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $key = $_GET['key'] ?? null;

    if (!$user_id || !$key) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id or key']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?");
    $stmt->execute([$user_id, $key]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result) {
        echo $result['setting_value']; // Already JSON
    } else {
        echo json_encode(null);
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $user_id = $data['user_id'] ?? null;
    $key = $data['key'] ?? null;
    $value = $data['value'] ?? null;

    if (!$user_id || !$key) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing user_id or key']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO user_settings (user_id, setting_key, setting_value) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        ");
        $stmt->execute([$user_id, $key, json_encode($value)]);
        
        echo json_encode(['success' => true]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
