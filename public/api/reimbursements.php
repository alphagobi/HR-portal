<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $employee_id = $_GET['employee_id'] ?? null;
    
    if ($employee_id) {
        $stmt = $pdo->prepare("SELECT * FROM reimbursements WHERE employee_id = ? ORDER BY created_at DESC");
        $stmt->execute([$employee_id]);
    } else {
        $sql = "SELECT r.*, u.name as employee_name, u.department 
                FROM reimbursements r 
                JOIN users u ON r.employee_id = u.id 
                ORDER BY r.created_at DESC";
        $stmt = $pdo->query($sql);
    }
    
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $stmt = $pdo->prepare("INSERT INTO reimbursements (employee_id, category, amount, date, description, status) VALUES (?, ?, ?, ?, ?, 'Pending')");
    
    try {
        $stmt->execute([
            $data['employee_id'],
            $data['category'],
            $data['amount'],
            $data['date'],
            $data['description']
        ]);
        
        // Log Activity
        $log = $pdo->prepare("INSERT INTO activities (text, type, created_at) VALUES (?, 'reimbursement', NOW())");
        $log->execute(["New reimbursement claim: $" . $data['amount'] . " for " . $data['category']]);

        echo json_encode(["message" => "Claim submitted successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'];
    
    $stmt = $pdo->prepare("UPDATE reimbursements SET status = ? WHERE id = ?");
    $stmt->execute([$data['status'], $id]);
    
    echo json_encode(["message" => "Claim updated"]);
}
?>
