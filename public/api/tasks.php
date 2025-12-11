<?php
require_once 'config.php';

// --- Auto-Migration to ensure 'framework_id' column exists ---
try {
    $check = $pdo->query("SHOW COLUMNS FROM planned_tasks LIKE 'framework_id'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE planned_tasks ADD COLUMN framework_id INT DEFAULT NULL");
    }
} catch (Exception $e) {
    // Ignore migration errors
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $date = $_GET['date'] ?? null;

    if (!$user_id) {
        http_response_code(400);
        echo json_encode(["error" => "Missing user_id"]);
        exit;
    }

    // Join with work_allocations to get framework name
    $query = "
        SELECT pt.*, t.date as completed_date, wa.category_name as framework_name, wa.percentage as framework_target
        FROM planned_tasks pt
        LEFT JOIN timesheet_entries te ON pt.related_entry_id = te.id
        LEFT JOIN timesheets t ON te.timesheet_id = t.id
        LEFT JOIN work_allocations wa ON pt.framework_id = wa.id
        WHERE pt.user_id = ? 
    ";

    $params = [$user_id];
    
    if ($date) {
        $query .= " AND pt.planned_date = ? ORDER BY pt.created_at ASC";
        $params[] = $date;
    } else {
        $query .= " ORDER BY pt.planned_date ASC, pt.created_at ASC";
    }

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    echo json_encode($stmt->fetchAll());
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['user_id']) || !isset($data['task_content']) || !isset($data['planned_date'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        $user_id = $data['user_id'];
        $content = $data['task_content'];
        $baseDate = $data['planned_date'];
        $startTime = $data['start_time'] ?? null; 
        $endTime = $data['end_time'] ?? null;
        $eta = $data['eta'] ?? null;
        $frameworkId = $data['framework_id'] ?? null; // Capture framework_id
        $recurrence = $data['recurrence'] ?? null;

        $tasksToInsert = [];

        if ($recurrence && $recurrence['isRecurring']) {
            // Generate multiple tasks
            $freq = $recurrence['frequency'] ?? 'daily';
            $interval = max(1, intval($recurrence['interval'] ?? 1));
            $endType = $recurrence['endType'] ?? 'date';
            $endDate = $recurrence['endDate'] ?? null;
            $endCount = intval($recurrence['endCount'] ?? 10);
            $weekDays = $recurrence['weekDays'] ?? []; // Array of day indexes (0=Sun, 1=Mon...)

            $currentDate = new DateTime($baseDate);
            $limitDate = ($endDate) ? new DateTime($endDate) : (new DateTime($baseDate))->modify('+1 year');
            $count = 0;
            $maxCount = ($endType === 'count') ? $endCount : 365; // hard cap for safety

            while ($count < $maxCount) {
                // Check date limit
                if ($endType === 'date' && $currentDate > $limitDate) {
                    break;
                }

                // For weekly with specific days, check if current day matches
                $shouldInsert = true;
                if ($freq === 'weekly' && !empty($weekDays)) {
                    // PHP 'w' returns 0 (Sun) - 6 (Sat)
                    $dayOfWeek = intval($currentDate->format('w'));
                    if (!in_array($dayOfWeek, $weekDays)) {
                        $shouldInsert = false;
                    }
                }

                if ($shouldInsert) {
                    $tasksToInsert[] = $currentDate->format('Y-m-d');
                    $count++;
                }

                // Advance Date
                if ($freq === 'daily') {
                    $currentDate->modify("+$interval day");
                } elseif ($freq === 'weekly') {
                    if (!empty($weekDays)) {
                         // User asked to "surprise me". Let's handle two modes:
                         // 1. Simple Weekly (No days selected): Jump by X weeks.
                         // 2. Specific Days (Days selected): User Interval usually implies "Every week on Mon/Wed".
                        $currentDate->modify("+1 day");
                    } else {
                        $currentDate->modify("+$interval week");
                    }
                } elseif ($freq === 'monthly') {
                    $currentDate->modify("+$interval month");
                }
            }

        } else {
            // Single Task
            $tasksToInsert[] = $baseDate;
        }

        $stmt = $pdo->prepare("INSERT INTO planned_tasks (user_id, task_content, planned_date, start_time, end_time, eta, framework_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        $insertedCount = 0;
        foreach ($tasksToInsert as $dateStr) {
            $stmt->execute([
                $user_id, 
                $content, 
                $dateStr, 
                $startTime, 
                $endTime, 
                $eta,
                $frameworkId // Insert framework_id
            ]);
            $insertedCount++;
        }

        $pdo->commit();
        echo json_encode(["message" => "Tasks created", "count" => $insertedCount]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
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
