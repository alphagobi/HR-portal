<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Get all users but hide passwords
    $stmt = $pdo->query("SELECT id, employee_code, name, email, role, department, designation, informed_leave_limit, emergency_leave_limit, created_at FROM users ORDER BY name ASC");
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    // Admin creating a user
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO users (employee_code, name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    try {
        $stmt->execute([
            $data['employee_code'] ?? null,
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

    $sql = "UPDATE users SET employee_code=?, name=?, email=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=? WHERE id=?";
    $params = [
        $data['employee_code'] ?? null,
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
        $sql = "UPDATE users SET employee_code=?, name=?, email=?, password=?, role=?, department=?, designation=?, informed_leave_limit=?, emergency_leave_limit=? WHERE id=?";
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
