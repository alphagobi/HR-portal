<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;

    if (!$user_id || !$date) {
        http_response_code(400);
        echo json_encode(["error" => "Missing user_id or date"]);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM planned_tasks WHERE user_id = ? AND planned_date = ? ORDER BY created_at ASC");
    $stmt->execute([$user_id, $date]);
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['user_id']) || !isset($data['task_content']) || !isset($data['planned_date'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO planned_tasks (user_id, task_content, planned_date) VALUES (?, ?, ?)");
    try {
        $stmt->execute([$data['user_id'], $data['task_content'], $data['planned_date']]);
        echo json_encode(["message" => "Task created", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing task ID"]);
        exit;
    }

    // Handle different update types
    if (isset($data['action']) && $data['action'] === 'move') {
        // Move task to new date
        $stmt = $pdo->prepare("UPDATE planned_tasks SET planned_date = ? WHERE id = ?");
        $stmt->execute([$data['new_date'], $id]);
        echo json_encode(["message" => "Task moved"]);
    } elseif (isset($data['is_completed'])) {
        // Update completion status
        $stmt = $pdo->prepare("UPDATE planned_tasks SET is_completed = ? WHERE id = ?");
        $stmt->execute([$data['is_completed'], $id]);
        echo json_encode(["message" => "Task status updated"]);
    } else {
        // Update content
        $stmt = $pdo->prepare("UPDATE planned_tasks SET task_content = ? WHERE id = ?");
        $stmt->execute([$data['task_content'], $id]);
        echo json_encode(["message" => "Task updated"]);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing task ID"]);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM planned_tasks WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Task deleted"]);
}
?>
