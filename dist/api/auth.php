<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $action = isset($_GET['action']) ? $_GET['action'] : 'login';

    if ($action === 'login') {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(["error" => "Email and password required"]);
            exit;
        }

        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // In production, use password_verify($password, $user['password'])
        // For now, using plain text as per schema demo
        if ($user && $password === $user['password']) {
            unset($user['password']); // Don't send password back
            echo json_encode($user);
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Invalid credentials"]);
        }
    } 
    elseif ($action === 'register') {
        // Admin only or registration logic
        // Basic implementation for creating users
        $name = $data['name'];
        $email = $data['email'];
        $password = $data['password']; // Should hash this
        $role = $data['role'] ?? 'employee';
        $dept = $data['department'] ?? '';
        $desig = $data['designation'] ?? '';

        try {
            $stmt = $pdo->prepare("INSERT INTO users (name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $password, $role, $dept, $desig]);
            
            $id = $pdo->lastInsertId();
            echo json_encode(["id" => $id, "message" => "User created successfully"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create user: " . $e->getMessage()]);
        }
    }
}
?>
