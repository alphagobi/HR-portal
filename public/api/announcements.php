<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $user_id = $_GET['user_id'] ?? null;
    $announcement_id = $_GET['id'] ?? null;
    $action = $_GET['action'] ?? null;

    if ($action === 'acknowledgements' && $announcement_id) {
        // Admin: Get acknowledgements for a specific announcement
        $stmt = $pdo->prepare("
            SELECT u.id, u.name, aa.acknowledged_at 
            FROM announcement_acknowledgements aa
            JOIN users u ON aa.user_id = u.id
            WHERE aa.announcement_id = ?
            ORDER BY aa.acknowledged_at DESC
        ");
        $stmt->execute([$announcement_id]);
        echo json_encode($stmt->fetchAll());
    } elseif ($user_id) {
        // User: Get announcements with acknowledgement status
        $stmt = $pdo->prepare("
            SELECT a.*, 
                   CASE WHEN aa.id IS NOT NULL THEN 1 ELSE 0 END as is_acknowledged,
                   (SELECT name FROM users WHERE id = a.created_by) as author_name
            FROM announcements a
            LEFT JOIN announcement_acknowledgements aa ON a.id = aa.announcement_id AND aa.user_id = ?
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
    } else {
        // Admin/Default: Get announcements with ack count
        $stmt = $pdo->query("
            SELECT a.*, 
                   (SELECT COUNT(*) FROM announcement_acknowledgements WHERE announcement_id = a.id) as ack_count,
                   (SELECT name FROM users WHERE id = a.created_by) as author_name
            FROM announcements a 
            ORDER BY a.created_at DESC
        ");
        echo json_encode($stmt->fetchAll());
    }
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (isset($data['action']) && $data['action'] === 'acknowledge') {
        // Acknowledge an announcement
        $stmt = $pdo->prepare("INSERT IGNORE INTO announcement_acknowledgements (announcement_id, user_id) VALUES (?, ?)");
        try {
            $stmt->execute([$data['announcement_id'], $data['user_id']]);
            echo json_encode(["message" => "Acknowledged successfully"]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    } else {
        // Create announcement
        $stmt = $pdo->prepare("INSERT INTO announcements (title, content, type, created_by) VALUES (?, ?, ?, ?)");
        
        try {
            $stmt->execute([
                $data['title'],
                $data['content'],
                $data['type'],
                $data['created_by']
            ]);
            echo json_encode(["message" => "Announcement posted", "id" => $pdo->lastInsertId()]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => $e->getMessage()]);
        }
    }
}
elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Announcement deleted"]);
}
?>
