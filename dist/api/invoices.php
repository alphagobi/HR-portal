<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM invoices ORDER BY date DESC");
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch items for each invoice (could be optimized with a join, but this is simpler for now)
        foreach ($invoices as &$invoice) {
            $stmtItems = $pdo->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
            $stmtItems->execute([$invoice['id']]);
            $invoice['items'] = $stmtItems->fetchAll(PDO::FETCH_ASSOC);
        }

        echo json_encode($invoices);
    } catch (PDOException $e) {
        echo json_encode([]);
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['client_name']) || !isset($data['amount'])) {
        http_response_code(400);
        echo json_encode(["error" => "Missing required fields"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO invoices (
            client_name, client_address, billing_period_start, billing_period_end,
            amount, date, status, 
            previous_balance, payment_received, payment_date, grand_total
        ) VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)");
        
        $stmt->execute([
            $data['client_name'],
            $data['client_address'] ?? '',
            $data['billing_period_start'] ?? null,
            $data['billing_period_end'] ?? null,
            $data['amount'],
            $data['date'],
            $data['previous_balance'] ?? 0,
            $data['payment_received'] ?? 0,
            $data['payment_date'] ?? null,
            $data['grand_total'] ?? 0
        ]);
        
        $invoiceId = $pdo->lastInsertId();

        if (isset($data['items']) && is_array($data['items'])) {
            $stmtItem = $pdo->prepare("INSERT INTO invoice_items (invoice_id, description, quantity, duration, cost) VALUES (?, ?, ?, ?, ?)");
            foreach ($data['items'] as $item) {
                $stmtItem->execute([
                    $invoiceId,
                    $item['description'],
                    $item['quantity'] ?? 1,
                    $item['duration'] ?? '',
                    $item['cost']
                ]);
            }
        }

        // Log Activity
        $log = $pdo->prepare("INSERT INTO activities (text, type, created_at) VALUES (?, 'invoice', NOW())");
        $log->execute(["New invoice created for " . $data['client_name'] . ": $" . $data['grand_total']]);

        $pdo->commit();
        echo json_encode(["message" => "Invoice created successfully", "id" => $invoiceId]);
    } catch (PDOException $e) {
        $pdo->rollBack();
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
