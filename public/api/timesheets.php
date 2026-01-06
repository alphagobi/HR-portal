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
        $stmt = $pdo->query("SELECT t.*, u.name as employee_name, u.role, u.email FROM timesheets t JOIN users u ON t.employee_id = u.id ORDER BY t.date DESC");
    }
    $timesheets = $stmt->fetchAll();

    // 2. Get Entries for each timesheet
    // Optimization: Get all entries for these timesheets in one query if possible, but loop is simpler for now
    foreach ($timesheets as &$sheet) {
        $stmtEntries = $pdo->prepare("SELECT id, timesheet_id, start_time as startTime, end_time as endTime, duration, description, project, task_id, type, is_edited, is_deleted FROM timesheet_entries WHERE timesheet_id = ?");
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
            $update = $pdo->prepare("UPDATE timesheets SET milestone = ?, task_description = ?, comments = ?, admin_remarks = ?, status = ? WHERE id = ?");
            $update->execute([
                $data['milestone'] ?? '',
                $data['taskDescription'] ?? '',
                $data['comments'] ?? '',
                $data['adminRemarks'] ?? '',
                $data['status'] ?? 'draft',
                $timesheet_id
            ]);
        } else {
            // Create new
            $insert = $pdo->prepare("INSERT INTO timesheets (employee_id, date, milestone, task_description, comments, admin_remarks, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $insert->execute([
                $employee_id,
                $date,
                $data['milestone'] ?? '',
                $data['taskDescription'] ?? '',
                $data['comments'] ?? '',
                $data['adminRemarks'] ?? '',
                $data['status'] ?? 'draft'
            ]);
            $timesheet_id = $pdo->lastInsertId();
        }

        // Handle Entries: Smart Update to preserve history
        if (isset($data['entries']) && is_array($data['entries'])) {
            // 1. Get existing entries to know what to update/delete
            $stmtExisting = $pdo->prepare("SELECT id, start_time, end_time, description, duration, task_id, type FROM timesheet_entries WHERE timesheet_id = ?");
            $stmtExisting->execute([$timesheet_id]);
            $existingEntries = [];
            while ($row = $stmtExisting->fetch()) {
                $existingEntries[$row['id']] = $row;
            }

            $processedIds = [];

            $insertEntry = $pdo->prepare("INSERT INTO timesheet_entries (timesheet_id, start_time, end_time, duration, description, project, task_id, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $updateEntry = $pdo->prepare("UPDATE timesheet_entries SET start_time = ?, end_time = ?, duration = ?, description = ?, project = ?, task_id = ?, type = ?, is_edited = ? WHERE id = ?");
            // History table might need update if we want to track duration changes, but for now let's keep it simple or update it too if schema allows.
            // Assuming history table only tracks start/end/desc for now. We can skip history for duration or add it later if requested.
            // For now, we'll just track description changes in history if duration changes? 
            // Let's stick to the existing history logic for start/end/desc.
            $insertHistory = $pdo->prepare("INSERT INTO timesheet_entry_history (entry_id, old_start_time, old_end_time, old_description) VALUES (?, ?, ?, ?)");

            foreach ($data['entries'] as $entry) {
                $entryId = $entry['id'] ?? null;
                $startTime = $entry['startTime'] ?? null;
                $endTime = $entry['endTime'] ?? null;
                $duration = $entry['duration'] ?? 0;
                $description = $entry['description'] ?? '';
                $project = $entry['project'] ?? 'General';
                $taskId = $entry['taskId'] ?? null;
                
                // Determine Type (Planned vs Unplanned)
                $type = 'unplanned';
                if ($taskId) {
                    // Check task creation time
                    $stmtTask = $pdo->prepare("SELECT created_at FROM planned_tasks WHERE id = ?");
                    $stmtTask->execute([$taskId]);
                    $task = $stmtTask->fetch();
                    if ($task) {
                        $createdAt = new DateTime($task['created_at']);
                        $now = new DateTime();
                        $diff = $now->diff($createdAt);
                        $hours = $diff->h + ($diff->days * 24);
                        if ($hours >= 8) {
                            $type = 'planned';
                        }
                    }
                }

                if ($entryId && isset($existingEntries[$entryId])) {
                    // Update existing
                    $old = $existingEntries[$entryId];
                    $processedIds[] = $entryId;

                    // Check if changed
                    if ($old['start_time'] != $startTime || $old['end_time'] != $endTime || $old['description'] != $description || $old['duration'] != $duration) {
                        // Save history
                        $insertHistory->execute([
                            $entryId,
                            $old['start_time'],
                            $old['end_time'],
                            $old['description']
                        ]);
                        
                        // Update with is_edited = true
                        $updateEntry->execute([$startTime, $endTime, $duration, $description, $project, $taskId, $type, 1, $entryId]);
                    } else {
                         // Even if content didn't change, we might be updating the Link (taskId), so we MUST update.
                         // Optimization: Check if taskId changed too?
                         // For now, just update everything to be safe.
                         $updateEntry->execute([$startTime, $endTime, $duration, $description, $project, $taskId, $type, 0, $entryId]);
                    }

                } else {
                    // Insert new
                    $insertEntry->execute([
                        $timesheet_id,
                        $startTime,
                        $endTime,
                        $duration,
                        $description,
                        $project,
                        $taskId,
                        $type
                    ]);
                }
            }

            // Soft Delete removed entries
            $toDelete = array_diff(array_keys($existingEntries), $processedIds);
            if (!empty($toDelete)) {
                $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
                $deleteStmt = $pdo->prepare("UPDATE timesheet_entries SET is_deleted = 1 WHERE id IN ($placeholders)");
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
