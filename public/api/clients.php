<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $id = $_GET['id'] ?? null;

    if ($id) {
        $stmt = $pdo->prepare("SELECT * FROM clients WHERE id = ?");
        $stmt->execute([$id]);
        $client = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($client) {
            // Logic for auto-balance: Get the *last* invoice's grand total
            // Assuming "Previous Balance" for the *next* invoice is roughly what was remaining on the *last* one?
            // Or is "Previous Balance" literally the *unpaid* amount?
            // The user said: "in that the data for advances and penign or partial pending paymetns should be pooulated automacailly"
            // And earlier: "Grand Total = (Previous Balance + Current) - Payment".
            // So if I fetch the last invoice, its "Grand Total" was the *payable* amount.
            // If they paid it, the new Previous Balance should be 0.
            // If they didn't, it should be that Grand Total.
            // But we don't strictly track "Amount Pending" in a separate column, we rely on Status.
            // Let's return the last invoice details and let frontend decide or simple logic here.
            // Let's Fetch the last invoice.
            
            $stmtInv = $pdo->prepare("SELECT * FROM invoices WHERE client_name = ? ORDER BY date DESC LIMIT 1");
            $stmtInv->execute([$client['name']]);
            $lastInvoice = $stmtInv->fetch(PDO::FETCH_ASSOC);
            
            $client['last_invoice'] = $lastInvoice;
        }

        echo json_encode($client);
    } else {
        $stmt = $pdo->query("SELECT * FROM clients ORDER BY name ASC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['name'])) {
        http_response_code(400);
        echo json_encode(["error" => "Name is required"]);
        exit;
    }

    $stmt = $pdo->prepare("INSERT INTO clients (name, address, email, phone) VALUES (?, ?, ?, ?)");
    
    try {
        $stmt->execute([
            $data['name'],
            $data['address'] ?? '',
            $data['email'] ?? '',
            $data['phone'] ?? ''
        ]);
        
        echo json_encode(["message" => "Client added successfully", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
?>
