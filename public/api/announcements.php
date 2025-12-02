<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM announcements ORDER BY created_at DESC");
    echo json_encode($stmt->fetchAll());
} 
elseif ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
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
elseif ($method === 'DELETE') {
    $id = $_GET['id'];
    $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(["message" => "Announcement deleted"]);
}
?>
