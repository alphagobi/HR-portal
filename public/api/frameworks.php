<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once 'config.php';
include_once 'db.php';

$database = new Database();
$db = $database->getConnection();

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['user_id'])) {
        $user_id = $_GET['user_id'];
        
        $query = "SELECT * FROM work_allocations WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        $allocations = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            array_push($allocations, $row);
        }
        
        echo json_encode($allocations);
    } else {
        http_response_code(400);
        echo json_encode(array("message" => "Missing user_id parameter."));
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (isset($data->user_id) && isset($data->allocations)) {
        $user_id = $data->user_id;
        $allocations = $data->allocations;

        try {
            $db->beginTransaction();

            // 1. Delete existing allocations for this user
            $query = "DELETE FROM work_allocations WHERE user_id = :user_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            // 2. Insert new allocations with position
            $query = "INSERT INTO work_allocations (user_id, category_name, percentage, position) VALUES (:user_id, :category_name, :percentage, :position)";
            $stmt = $db->prepare($query);

            foreach ($allocations as $index => $allocation) {
                $stmt->bindParam(":user_id", $user_id);
                $stmt->bindParam(":category_name", $allocation->category_name);
                $stmt->bindParam(":percentage", $allocation->percentage);
                $stmt->bindParam(":position", $index); // Use array index as position
                $stmt->execute();
            }

            $db->commit();
            echo json_encode(array("message" => "Allocations updated successfully."));

        } catch (Exception $e) {
            $db->rollBack();
            http_response_code(500);
            echo json_encode(array("message" => "Failed to update allocations.", "error" => $e->getMessage()));
        }
    } else {
        http_response_code(400);
        echo json_encode(array("message" => "Incomplete data."));
    }
} else {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed."));
}
?>
