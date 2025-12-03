<?php
require_once 'config.php';

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
        $stmt = $pdo->prepare("INSERT INTO policies (title, content, version, category) VALUES (?, ?, ?, ?)");
        try {
            $stmt->execute([
                $data['title'],
                $data['content'],
                $data['version'] ?? '1.0',
                $data['category'] ?? 'General'
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
    
    $stmt = $pdo->prepare("UPDATE policies SET title=?, content=?, version=?, category=? WHERE id=?");
    try {
        $stmt->execute([
            $data['title'],
            $data['content'],
            $data['version'],
            $data['category'],
            $id
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
