<?php
require_once 'config.php';

// --- Auto-Migration for 'status' column ---
try {
    $check = $db->query("SHOW COLUMNS FROM policies LIKE 'status'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE policies ADD COLUMN status VARCHAR(50) DEFAULT 'New'");
    }
} catch (Exception $e) { }

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;

    if ($user_id) {
        // Get policies with acknowledgment status for a specific user
        $sql = "SELECT p.*, 
                CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END as is_acknowledged,
                pa.acknowledged_at
                FROM policies p
                LEFT JOIN policy_acknowledgments pa ON p.id = pa.policy_id AND pa.user_id = ?
                ORDER BY p.created_at DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user_id]);
    } else {
        // Get all policies (Admin view)
        $stmt = $pdo->query("SELECT * FROM policies ORDER BY created_at DESC");
    }
    
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['action']) && $data['action'] === 'acknowledge') {
        // User acknowledging a policy
        $stmt = $pdo->prepare("INSERT INTO policy_acknowledgments (user_id, policy_id) VALUES (?, ?)");
        try {
            $stmt->execute([$data['user_id'], $data['policy_id']]);
            echo json_encode(["message" => "Policy acknowledged"]);
        } catch (PDOException $e) {
            // Ignore duplicate acknowledgments
            echo json_encode(["message" => "Already acknowledged"]);
        }
    } else {
        // Admin creating a policy
        $query = "INSERT INTO policies (title, content, version, category, status) VALUES (:title, :content, :version, :category, :status)";
        $stmt = $pdo->prepare($query);
        try {
            $stmt->execute([
                ':title' => $data['title'],
                ':content' => $data['content'],
                ':version' => $data['version'] ?? '1.0',
                ':category' => $data['category'] ?? 'General',
                ':status' => $data['status'] ?? 'New' // Default status if not provided
            ]);
            echo json_encode(["message" => "Policy created", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
elseif ($method === 'PUT') {
    // Admin updating a policy
    $data = json_decode(file_get_contents("php://input"), true);
    $id = $_GET['id'];
    
    $query = "UPDATE policies SET title = :title, content = :content, version = :version, category = :category, status = :status WHERE id = :id";
    $stmt = $pdo->prepare($query);
    try {
        $stmt->execute([
            ':title' => $data['title'],
            ':content' => $data['content'],
            ':version' => $data['version'],
            ':category' => $data['category'],
            ':status' => $data['status'],
            ':id' => $id
        ]);
        echo json_encode(["message" => "Policy updated"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => $e->getMessage()]);
    }
}
elseif ($method === 'DELETE') {
    // Admin deleting a policy
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM policies WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Policy deleted"]);
}
?>
