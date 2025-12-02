<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employee_id = $_GET['employee_id'] ?? null;
    
    // 1. Get Timesheets
    if ($employee_id) {
        $stmt = $pdo->prepare("SELECT * FROM timesheets WHERE employee_id = ? ORDER BY date DESC");
        $stmt->execute([$employee_id]);
    } else {
        $stmt = $pdo->query("SELECT t.*, u.name as employee_name FROM timesheets t JOIN users u ON t.employee_id = u.id ORDER BY t.date DESC");
    }
    $timesheets = $stmt->fetchAll();

    // 2. Get Entries for each timesheet
    // Optimization: Get all entries for these timesheets in one query if possible, but loop is simpler for now
    foreach ($timesheets as &$sheet) {
        $stmtEntries = $pdo->prepare("SELECT * FROM timesheet_entries WHERE timesheet_id = ?");
        $stmtEntries->execute([$sheet['id']]);
        $sheet['entries'] = $stmtEntries->fetchAll();
    }

    echo json_encode($timesheets);
} 
elseif ($method === 'POST') {
    // Save or Update Timesheet
    $data = json_decode(file_get_contents("php://input"), true);
    
    $employee_id = $data['employeeId'];
    $date = $data['date'];
    
    try {
        $pdo->beginTransaction();

        // Check if timesheet exists for this date/employee
        $stmt = $pdo->prepare("SELECT id FROM timesheets WHERE employee_id = ? AND date = ?");
        $stmt->execute([$employee_id, $date]);
        $existing = $stmt->fetch();

        if ($existing) {
            $timesheet_id = $existing['id'];
            // Update existing
            $update = $pdo->prepare("UPDATE timesheets SET milestone = ?, task_description = ?, comments = ?, status = ? WHERE id = ?");
            $update->execute([
                $data['milestone'] ?? '',
                $data['taskDescription'] ?? '',
                $data['comments'] ?? '',
                $data['status'] ?? 'draft',
                $timesheet_id
            ]);
        } else {
            // Create new
            $insert = $pdo->prepare("INSERT INTO timesheets (employee_id, date, milestone, task_description, comments, status) VALUES (?, ?, ?, ?, ?, ?)");
            $insert->execute([
                $employee_id,
                $date,
                $data['milestone'] ?? '',
                $data['taskDescription'] ?? '',
                $data['comments'] ?? '',
                $data['status'] ?? 'draft'
            ]);
            $timesheet_id = $pdo->lastInsertId();
        }

        // Handle Entries: Delete all old ones and re-insert (simplest sync)
        if (isset($data['entries']) && is_array($data['entries'])) {
            $delete = $pdo->prepare("DELETE FROM timesheet_entries WHERE timesheet_id = ?");
            $delete->execute([$timesheet_id]);

            $insertEntry = $pdo->prepare("INSERT INTO timesheet_entries (timesheet_id, start_time, end_time, description, project) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['entries'] as $entry) {
                $insertEntry->execute([
                    $timesheet_id,
                    $entry['startTime'] ?? '',
                    $entry['endTime'] ?? '',
                    $entry['description'] ?? '',
                    $entry['project'] ?? 'General'
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(["success" => true, "id" => $timesheet_id]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
