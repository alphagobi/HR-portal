<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $start_date = $_GET['start_date'] ?? null;
    $end_date = $_GET['end_date'] ?? null;

    if ($start_date && $end_date) {
        $stmt = $pdo->prepare("SELECT * FROM company_calendar WHERE date BETWEEN ? AND ? ORDER BY date ASC");
        $stmt->execute([$start_date, $end_date]);
    } else {
        // Default to current year if no range specified, or just all future?
        // Let's fetch all for now, or maybe current year + next year.
        $stmt = $pdo->query("SELECT * FROM company_calendar ORDER BY date ASC");
    }
    
    echo json_encode($stmt->fetchAll());
}
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['date']) || !isset($data['title'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO company_calendar (date, title, type, is_holiday, description) VALUES (?, ?, ?, ?, ?)");
    try {
        $stmt->execute([
            $data['date'],
            $data['title'],
            $data['type'] ?? 'holiday',
            $data['is_holiday'] ?? 1,
            $data['description'] ?? ''
        ]);
        echo json_encode(["message" => "Event created", "id" => $pdo->lastInsertId()]);
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
        echo json_encode(["error" => "Missing ID"]);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE company_calendar SET date = ?, title = ?, type = ?, is_holiday = ?, description = ? WHERE id = ?");
    try {
        $stmt->execute([
            $data['date'],
            $data['title'],
            $data['type'] ?? 'holiday',
            $data['is_holiday'] ?? 1,
            $data['description'] ?? '',
            $id
        ]);
        echo json_encode(["message" => "Event updated"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing ID"]);
        exit;
    }

    $stmt = $pdo->prepare("DELETE FROM company_calendar WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Event deleted"]);
}
?>
