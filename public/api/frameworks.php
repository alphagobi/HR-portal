<?php
// config.php handles headers and DB connection ($pdo)
require_once 'config.php';

// Global Error Handler for JSON
function handle_fatal_error() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_clean(); // Clear any partial output
        http_response_code(500);
        echo json_encode(["status" => 500, "message" => "Fatal Error", "error" => $error['message'], "line" => $error['line']]);
        exit;
    }
}
register_shutdown_function('handle_fatal_error');

// --- Auto-Migration to ensure 'position' column exists ---
try {
    // $pdo is provided by config.php
    $check = $pdo->query("SHOW COLUMNS FROM work_allocations LIKE 'position'");
    if ($check->rowCount() == 0) {
        $pdo->exec("ALTER TABLE work_allocations ADD COLUMN position INT DEFAULT 0");
    }
} catch (Exception $e) {
    // Ignore migration errors
}

$method = $_SERVER['REQUEST_METHOD'];

// Ensure JSON encoding works even if errors occur
ob_start();

try {
    if ($method == 'GET') {
        if (isset($_GET['user_id'])) {
            $user_id = $_GET['user_id'];
            
            $query = "SELECT * FROM work_allocations WHERE user_id = :user_id ORDER BY position ASC, id ASC";
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();
            
            $allocations = $stmt->fetchAll();
            
            ob_clean();
            echo json_encode($allocations);
        } else {
            ob_clean();
            http_response_code(400);
            echo json_encode(["message" => "Missing user_id parameter."]);
        }
    } elseif ($method == 'POST') {
        $input = file_get_contents("php://input");
        $data = json_decode($input);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON received: " . json_last_error_msg());
        }

        if (isset($data->user_id) && isset($data->allocations)) {
            $user_id = $data->user_id;
            $allocations = $data->allocations;

            $pdo->beginTransaction();

            // 1. Delete existing allocations for this user
            $query = "DELETE FROM work_allocations WHERE user_id = :user_id";
            $stmt = $pdo->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            // 2. Insert new allocations with position
            $query = "INSERT INTO work_allocations (user_id, category_name, percentage, position) VALUES (:user_id, :category_name, :percentage, :position)";
            $stmt = $pdo->prepare($query);

            foreach ($allocations as $index => $allocation) {
                // Validate data
                $cat = htmlspecialchars(strip_tags($allocation->category_name));
                $pct = intval($allocation->percentage);
                $pos = intval($index);

                $stmt->bindValue(":user_id", $user_id);
                $stmt->bindValue(":category_name", $cat);
                $stmt->bindValue(":percentage", $pct);
                $stmt->bindValue(":position", $pos);
                $stmt->execute();
            }

            $pdo->commit();
            
            ob_clean();
            echo json_encode(["message" => "Allocations updated successfully."]);

        } else {
            ob_clean();
            http_response_code(400);
            echo json_encode(["message" => "Incomplete data."]);
        }
    } else {
        ob_clean();
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed."]);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ob_clean();
    http_response_code(500);
    echo json_encode(["message" => "Server Error", "error" => $e->getMessage()]);
}
?>
