<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $action = $_GET['action'] ?? null;

    if ($action === 'team_view') {
        $current_user_id = $_GET['user_id'] ?? 0;
        // Filter: My own profile OR profiles that enlisted me in their visible_to OR visible_to_core_hours
        $sql = "SELECT id, employee_code, name, email, role, department, designation, working_days, visible_to, visible_to_core_hours 
                FROM users 
                WHERE id = ? 
                   OR JSON_CONTAINS(COALESCE(visible_to, '[]'), ?) 
                   OR JSON_CONTAINS(COALESCE(visible_to_core_hours, '[]'), ?)";
        $stmt = $pdo->prepare($sql);
        // Cast ID to string for JSON_CONTAINS consistency
        $stmt->execute([$current_user_id, (string)$current_user_id, (string)$current_user_id]); 
        echo json_encode($stmt->fetchAll());
    } else {
        // Admin View - Get all users
        $stmt = $pdo->query("SELECT id, employee_code, name, email, role, department, designation, informed_leave_limit, emergency_leave_limit, working_days, visible_to, visible_to_core_hours, created_at FROM users ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }
} 
elseif ($method === 'POST') {
    // Admin creating a user
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO users (employee_code, name, email, password, role, department, designation, working_days, visible_to, visible_to_core_hours) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    // Handle working_days serialization
    $working_days = isset($data['working_days']) && is_array($data['working_days']) 
        ? json_encode($data['working_days']) 
        : ($data['working_days'] ?? json_encode(["Mon","Tue","Wed","Thu","Fri"]));

    // Handle visible_to serialization
    $visible_to = isset($data['visible_to']) && is_array($data['visible_to'])
        ? json_encode($data['visible_to'])
        : ($data['visible_to'] ?? json_encode([]));

    // Handle visible_to_core_hours serialization
    $visible_to_core_hours = isset($data['visible_to_core_hours']) && is_array($data['visible_to_core_hours'])
        ? json_encode($data['visible_to_core_hours'])
        : ($data['visible_to_core_hours'] ?? json_encode([]));

    try {
        $stmt->execute([
            $data['employee_code'] ?? null,
            $data['name'],
            $data['email'],
            $data['password'], // Should be hashed in real app
            $data['role'],
            $data['department'],
            $data['designation'],
            $working_days,
            $visible_to,
            $visible_to_core_hours
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

    // Handle working_days serialization
    $working_days = isset($data['working_days']) && is_array($data['working_days']) 
        ? json_encode($data['working_days']) 
        : ($data['working_days'] ?? json_encode(["Mon","Tue","Wed","Thu","Fri"]));

    // Handle visible_to serialization
    $visible_to = isset($data['visible_to']) && is_array($data['visible_to'])
        ? json_encode($data['visible_to'])
        : ($data['visible_to'] ?? json_encode([]));

    // Handle visible_to_core_hours serialization
    $visible_to_core_hours = isset($data['visible_to_core_hours']) && is_array($data['visible_to_core_hours'])
        ? json_encode($data['visible_to_core_hours'])
        : ($data['visible_to_core_hours'] ?? json_encode([]));

    $sql = "UPDATE users SET employee_code=?, name=?, email=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=?, working_days=?, visible_to=?, visible_to_core_hours=? WHERE id=?";
    $params = [
        $data['employee_code'] ?? null,
        $data['name'],
        $data['email'],
        $data['role'],
        $data['department'],
        $data['designation'],
        $data['informed_leave_limit'] ?? 6,
        $data['emergency_leave_limit'] ?? 6,
        $working_days,
        $visible_to,
        $visible_to_core_hours,
        $id
    ];

    // Only update password if provided
    if (!empty($data['password'])) {
        $sql = "UPDATE users SET employee_code=?, name=?, email=?, password=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=?, working_days=?, visible_to=?, visible_to_core_hours=? WHERE id=?";
        $params = [
            $data['employee_code'] ?? null,
            $data['name'],
            $data['email'],
            $data['password'],
            $data['role'],
            $data['department'],
            $data['designation'],
            $data['informed_leave_limit'] ?? 6,
            $data['emergency_leave_limit'] ?? 6,
            $working_days,
            $visible_to,
            $visible_to_core_hours,
            $id
        ];
    }

    $stmt = $pdo->prepare($sql);
    
    try {
        $stmt->execute($params);
        echo json_encode(["message" => "User updated successfully"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "User deleted"]);
}
?>
