<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing user_id"]);
        exit;
    }

    if ($date) {
        $stmt = $pdo->prepare("SELECT * FROM planned_tasks WHERE user_id = ? AND planned_date = ? ORDER BY created_at ASC");
        $stmt->execute([$user_id, $date]);
    } else {
        // Fetch all future tasks or recent tasks? Let's fetch all for now or maybe limit to recent/future.
        // User asked for "list and viewable for multiple days".
        // Let's fetch all tasks >= today - 7 days to keep it relevant but inclusive.
        // Or just all. Let's do all for simplicity as per request.
        $stmt = $pdo->prepare("SELECT * FROM planned_tasks WHERE user_id = ? ORDER BY planned_date ASC, created_at ASC");
        $stmt->execute([$user_id]);
    }
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['user_id']) || !isset($data['task_content']) || !isset($data['planned_date'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO planned_tasks (user_id, task_content, planned_date, start_time, end_time, eta) VALUES (?, ?, ?, ?, ?, ?)");
    try {
        $stmt->execute([
            $data['user_id'], 
            $data['task_content'], 
            $data['planned_date'], 
            $data['start_time'] ?? null,
            $data['end_time'] ?? null,
            $data['eta'] ?? null
        ]);
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
        // Update completion status and related entry
        $related_entry_id = $data['related_entry_id'] ?? null;
        // If uncompleting, we might want to clear related_entry_id, or handle it via specific logic
        // For now, we update whatever is passed.
        
        $sql = "UPDATE planned_tasks SET is_completed = ?";
        $params = [$data['is_completed']];

        if (array_key_exists('related_entry_id', $data)) {
            $sql .= ", related_entry_id = ?";
            $params[] = $data['related_entry_id'];
        }

        $sql .= " WHERE id = ?";
        $params[] = $id;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(["message" => "Task status updated"]);
    } else {
        // Update content and times
        $stmt = $pdo->prepare("UPDATE planned_tasks SET task_content = ?, start_time = ?, end_time = ? WHERE id = ?");
        $stmt->execute([
            $data['task_content'], 
            $data['start_time'] ?? null, 
            $data['end_time'] ?? null, 
            $id
        ]);
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
