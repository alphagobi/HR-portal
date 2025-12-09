<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM invoices ORDER BY date DESC");
        echo json_encode($stmt->fetchAll());
    } catch (PDOException $e) {
        // Fallback or empty array if table doesn't exist yet (though it should)
        echo json_encode([]);
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Basic validation
    if (!isset($data['client_name']) || !isset($data['amount']) || !isset($data['date'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO invoices (client_name, amount, date, status) VALUES (?, ?, ?, 'Pending')");
    
    try {
        $stmt->execute([
            $data['client_name'],
            $data['amount'],
            $data['date']
        ]);
        
        // Log Activity
        $log = $pdo->prepare("INSERT INTO activities (text, type, created_at) VALUES (?, 'invoice', NOW())");
        $log->execute(["New invoice created for " . $data['client_name'] . ": $" . $data['amount']]);

        echo json_encode(["message" => "Invoice created successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'];
    
    if (!isset($id) || !isset($data['status'])) {
         http_response_code(400);
         echo json_encode(["error" => "Missing ID or Status"]);
         exit;
    }

    $stmt = $pdo->prepare("UPDATE invoices SET status = ? WHERE id = ?");
    
    try {
        $stmt->execute([$data['status'], $id]);
        echo json_encode(["message" => "Invoice status updated"]);
    } catch (PDOException $e) {
         http_response_code(500);
         echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
