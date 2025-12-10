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
} else {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed."));
}
?>
