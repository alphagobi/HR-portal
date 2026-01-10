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
        $stmt = $pdo->query("SELECT * FROM company_calendar ORDER BY date ASC");
    }
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch Approved Leaves to merge as events
    // Join with users table to get employee name
    $leaveStmt = $pdo->query("SELECT l.start_date, l.end_date, l.type, u.name as employee_name 
                              FROM leaves l 
                              JOIN users u ON l.employee_id = u.id 
                              WHERE l.status = 'Approved'");
    $leaves = $leaveStmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($leaves as $leave) {
        $start = new DateTime($leave['start_date']);
        $end = new DateTime($leave['end_date']);
        
        // Loop through each day of the leave
        for ($date = clone $start; $date <= $end; $date->modify('+1 day')) {
            $dateStr = $date->format('Y-m-d');
            
            // Check if filtering by date range (if implemented in future, irrelevant now as we fetch all for calendar.php)
            // But good to be safe if start_date/end_date params are used
            if ($start_date && $end_date) {
                if ($dateStr < $start_date || $dateStr > $end_date) continue;
            }

            $events[] = [
                'id' => 'leave-' . $leave['employee_name'] . '-' . $dateStr, // Virtual ID
                'date' => $dateStr,
                'title' => $leave['employee_name'],
                'type' => 'leave', // New type
                'is_holiday' => 0,
                'description' => "On Leave: " . $leave['type']
            ];
        }
    }
    
    // Sort events by date
    usort($events, function($a, $b) {
        return strcmp($a['date'], $b['date']);
    });

    echo json_encode($events);
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
