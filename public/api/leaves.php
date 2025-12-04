<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employee_id = $_GET['employee_id'] ?? null;
    
    if ($employee_id) {
        // Get leaves for specific employee
        $stmt = $pdo->prepare("SELECT * FROM leaves WHERE employee_id = ? ORDER BY created_at DESC");
        $stmt->execute([$employee_id]);
        $leaves = $stmt->fetchAll();

        // Get user limits
        $userStmt = $pdo->prepare("SELECT informed_leave_limit, emergency_leave_limit FROM users WHERE id = ?");
        $userStmt->execute([$employee_id]);
        $user = $userStmt->fetch();

        // Calculate usage
        $usage = [
            'Informed Leave' => 0,
            'Emergency Leave' => 0
        ];

        foreach ($leaves as $leave) {
            $status = trim($leave['status']);
            $type = trim($leave['type']);

            if (strcasecmp($status, 'Approved') === 0) {
                // Calculate days
                $start = new DateTime($leave['start_date']);
                $end = new DateTime($leave['end_date']);
                // inclusive difference
                $days = $end->diff($start)->days + 1;
                
                if (isset($usage[$type])) {
                    $usage[$type] += $days;
                }
            }
        }

        echo json_encode([
            'leaves' => $leaves,
            'limits' => [
                'Informed Leave' => $user['informed_leave_limit'] ?? 6,
                'Emergency Leave' => $user['emergency_leave_limit'] ?? 6
            ],
            'usage' => $usage
        ]);
    } else {
        // Get all leaves (Admin) - Join with users to get names
        $sql = "SELECT l.*, u.name as employee_name, u.department, u.informed_leave_limit, u.emergency_leave_limit 
                FROM leaves l 
                JOIN users u ON l.employee_id = u.id 
                ORDER BY l.created_at DESC";
        $stmt = $pdo->query($sql);
        echo json_encode($stmt->fetchAll());
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO leaves (employee_id, type, start_date, end_date, reason, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
    
    try {
        $stmt->execute([
            $data['employee_id'],
            $data['type'],
            $data['start_date'],
            $data['end_date'],
            $data['reason']
        ]);
        
        // Log Activity
        $user_id = $data['employee_id']; // Use employee_id as user_id
        $log = $pdo->prepare("INSERT INTO activities (user_id, text, type, created_at) VALUES (?, ?, 'leave', NOW())");
        $log->execute([$user_id, "New leave request: " . $data['type']]);

        echo json_encode(["message" => "Leave requested successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'];
    
    if (!$id) {
        http_response_code(400);
        exit;
    }

    if (isset($data['action']) && $data['action'] === 'challenge') {
        // Employee challenging a rejection
        $stmt = $pdo->prepare("UPDATE leaves SET employee_note = ? WHERE id = ?");
        $stmt->execute([$data['employee_note'], $id]);
        echo json_encode(["message" => "Challenge note added"]);
    } else {
        // Admin updating status
        $stmt = $pdo->prepare("UPDATE leaves SET status = ?, admin_note = ? WHERE id = ?");
        $stmt->execute([$data['status'], $data['admin_note'] ?? null, $id]);
        echo json_encode(["message" => "Leave status updated"]);
    }
}
?>
