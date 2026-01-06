<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get all users but hide passwords
    $stmt = $pdo->query("SELECT id, name, email, role, department, designation, informed_leave_limit, emergency_leave_limit, created_at FROM users ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    // Admin creating a user
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)");
    
    try {
        $stmt->execute([
            $data['name'],
            $data['email'],
            $data['password'], // Should be hashed in real app
            $data['role'],
            $data['department'],
            $data['designation']
        ]);
        echo json_encode(["message" => "Employee added successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}

elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'];

    // Check if ID update is requested
    $new_id = $data['new_id'] ?? null;
    $id_changed = $new_id && $new_id != $id;

    try {
        $pdo->beginTransaction();

        // If ID is changing, we need to handle cascades manually or via schema
        // Since schema might not have ON UPDATE CASCADE, let's do it manually with checks disabled for safety
        if ($id_changed) {
            $pdo->exec("SET FOREIGN_KEY_CHECKS=0");
            
            // 1. Update User ID
            $stmtUpdateID = $pdo->prepare("UPDATE users SET id = ? WHERE id = ?");
            $stmtUpdateID->execute([$new_id, $id]);
            
            // 2. Update Related Tables
            $tables = [
                'timesheets' => 'employee_id',
                'planned_tasks' => 'user_id',
                'leaves' => 'employee_id',
                'reimbursements' => 'employee_id',
                'activities' => 'user_id',
                'user_settings' => 'user_id',
                'announcement_acknowledgements' => 'user_id',
                'leave_chats' => 'sender_id'
            ];
            
            foreach ($tables as $table => $col) {
                // Ignore errors if table doesn't exist (e.g. user_settings might be empty)
                try {
                    $pdo->exec("UPDATE $table SET $col = $new_id WHERE $col = $id");
                } catch (Exception $ignore) {}
            }

            // Special case for announcements created_by
            try {
                $pdo->exec("UPDATE announcements SET created_by = $new_id WHERE created_by = $id");
            } catch (Exception $ignore) {}

            $pdo->exec("SET FOREIGN_KEY_CHECKS=1");
            
            // Update $id to new_id for the rest of the update
            $id = $new_id;
        }

        $sql = "UPDATE users SET name=?, email=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=? WHERE id=?";
        $params = [
            $data['name'],
            $data['email'],
            $data['role'],
            $data['department'],
            $data['designation'],
            $data['informed_leave_limit'] ?? 6,
            $data['emergency_leave_limit'] ?? 6,
            $id
        ];

        // Only update password if provided
        if (!empty($data['password'])) {
            $sql = "UPDATE users SET name=?, email=?, password=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=? WHERE id=?";
            $params = [
                $data['name'],
                $data['email'],
                $data['password'],
                $data['role'],
                $data['department'],
                $data['designation'],
                $data['informed_leave_limit'] ?? 6,
                $data['emergency_leave_limit'] ?? 6,
                $id
            ];
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        $pdo->commit();
        echo json_encode(["message" => "User updated successfully"]);
        
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Update failed: " . $e->getMessage()]);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "User deleted"]);
}
?>
