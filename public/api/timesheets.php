<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $history_for_entry_id = $_GET['history_for_entry_id'] ?? null;

    if ($history_for_entry_id) {
        // Get History for a specific entry
        $stmt = $pdo->prepare("SELECT * FROM timesheet_entry_history WHERE entry_id = ? ORDER BY changed_at DESC");
        $stmt->execute([$history_for_entry_id]);
        echo json_encode($stmt->fetchAll());
        exit;
    }

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
        $stmtEntries = $pdo->prepare("SELECT id, timesheet_id, start_time as startTime, end_time as endTime, description, project, duration, is_edited FROM timesheet_entries WHERE timesheet_id = ?");
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

        // Handle Entries: Smart Update to preserve history
        if (isset($data['entries']) && is_array($data['entries'])) {
            // 1. Get existing entries to know what to update/delete
            $stmtExisting = $pdo->prepare("SELECT id, start_time, end_time, description FROM timesheet_entries WHERE timesheet_id = ?");
            $stmtExisting->execute([$timesheet_id]);
            $existingEntries = [];
            while ($row = $stmtExisting->fetch()) {
                $existingEntries[$row['id']] = $row;
            }

            $processedIds = [];

            $insertEntry = $pdo->prepare("INSERT INTO timesheet_entries (timesheet_id, start_time, end_time, description, project) VALUES (?, ?, ?, ?, ?)");
            $updateEntry = $pdo->prepare("UPDATE timesheet_entries SET start_time = ?, end_time = ?, description = ?, project = ?, is_edited = ? WHERE id = ?");
            $insertHistory = $pdo->prepare("INSERT INTO timesheet_entry_history (entry_id, old_start_time, old_end_time, old_description) VALUES (?, ?, ?, ?)");

            foreach ($data['entries'] as $entry) {
                $entryId = $entry['id'] ?? null;
                $startTime = $entry['startTime'] ?? '';
                $endTime = $entry['endTime'] ?? '';
                $description = $entry['description'] ?? '';
                $project = $entry['project'] ?? 'General';

                if ($entryId && isset($existingEntries[$entryId])) {
                    // Update existing
                    $old = $existingEntries[$entryId];
                    $processedIds[] = $entryId;

                    // Check if changed
                    if ($old['start_time'] != $startTime || $old['end_time'] != $endTime || $old['description'] != $description) {
                        // Save history
                        $insertHistory->execute([
                            $entryId,
                            $old['start_time'],
                            $old['end_time'],
                            $old['description']
                        ]);
                        
                        // Update with is_edited = true
                        $updateEntry->execute([$startTime, $endTime, $description, $project, 1, $entryId]);
                    } else {
                        // No change, just ensure project is updated if needed (optional, but good practice)
                        // For now, we update anyway to be safe, but keep is_edited as is (or set to what it was? No, only set true on change)
                        // Actually, if no change in core fields, we don't need to touch is_edited.
                        // Let's just update the fields.
                         $pdo->prepare("UPDATE timesheet_entries SET start_time = ?, end_time = ?, description = ?, project = ? WHERE id = ?")->execute([$startTime, $endTime, $description, $project, $entryId]);
                    }

                } else {
                    // Insert new
                    $insertEntry->execute([
                        $timesheet_id,
                        $startTime,
                        $endTime,
                        $description,
                        $project
                    ]);
                }
            }

            // Delete removed entries
            $toDelete = array_diff(array_keys($existingEntries), $processedIds);
            if (!empty($toDelete)) {
                $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
                $deleteStmt = $pdo->prepare("DELETE FROM timesheet_entries WHERE id IN ($placeholders)");
                $deleteStmt->execute(array_values($toDelete));
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
