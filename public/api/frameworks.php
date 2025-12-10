<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once 'config.php';
include_once 'db.php';

// ENABLE DEBUG LOGGING
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');
function debug_log($msg) {
    file_put_contents('debug_frameworks.txt', date('[Y-m-d H:i:s] ') . print_r($msg, true) . "\n", FILE_APPEND);
}

$database = new Database();
$db = $database->getConnection();

// --- Auto-Migration to ensure 'position' column exists ---
try {
    $check = $db->query("SHOW COLUMNS FROM work_allocations LIKE 'position'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE work_allocations ADD COLUMN position INT DEFAULT 0");
        debug_log("Added position column");
    }
} catch (Exception $e) {
    debug_log("Migration error: " . $e->getMessage());
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    if (isset($_GET['user_id'])) {
        $user_id = $_GET['user_id'];
        
        $query = "SELECT * FROM work_allocations WHERE user_id = :user_id ORDER BY position ASC, id ASC"; // Apply sort
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
    $inputRaw = file_get_contents("php://input");
    debug_log("POST Raw: " . $inputRaw);
    
    $data = json_decode($inputRaw);

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
                // Validate data
                $cat = htmlspecialchars(strip_tags($allocation->category_name));
                $pct = intval($allocation->percentage);
                $pos = intval($index);

                $stmt->bindParam(":user_id", $user_id);
                $stmt->bindParam(":category_name", $cat);
                $stmt->bindParam(":percentage", $pct);
                $stmt->bindParam(":position", $pos);
                $stmt->execute();
            }

            $db->commit();
            debug_log("Success user $user_id");
            echo json_encode(array("message" => "Allocations updated successfully."));

        } catch (Exception $e) {
            $db->rollBack();
            debug_log("DB Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(array("message" => "Failed to update allocations.", "error" => $e->getMessage()));
        }
    } else {
        debug_log("Incomplete Data");
        http_response_code(400);
        echo json_encode(array("message" => "Incomplete data."));
    }
} else {
    http_response_code(405);
    echo json_encode(array("message" => "Method not allowed."));
}
?>
