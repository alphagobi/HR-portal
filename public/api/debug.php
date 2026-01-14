<?php
require_once 'config.php';

header('Content-Type: application/json');

$response = [
    'status' => 'ok',
    'db_connection' => null,
    'tables' => [],
    'planned_tasks_schema' => [],
    'company_calendar_schema' => [],
    'framework_id_check' => null,
    'errors' => []
];

// 1. Check DB Connection
try {
    $response['db_connection'] = 'Connected ' . $host;
} catch (Exception $e) {
    $response['db_connection'] = 'Failed';
    $response['errors'][] = $e->getMessage();
}

// 2. Check Tables
try {
    $tables = [];
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }
    $response['tables'] = $tables;
} catch (Exception $e) {
    $response['errors'][] = "Tables check failed: " . $e->getMessage();
}

// 3. Check planned_tasks Schema
try {
    $stmt = $pdo->query("DESCRIBE planned_tasks");
    $response['planned_tasks_schema'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $pdo->query("DESCRIBE company_calendar");
    $response['company_calendar_schema'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    $response['errors'][] = "planned_tasks schema check failed: " . $e->getMessage();
}

// 4. Specific Check for framework_id
try {
    $stmt = $pdo->query("SHOW COLUMNS FROM planned_tasks LIKE 'framework_id'");
    $col = $stmt->fetch(PDO::FETCH_ASSOC);
    $response['framework_id_check'] = $col ? 'Exists' : 'Missing';
} catch (Exception $e) {
    $response['errors'][] = "framework_id check failed: " . $e->getMessage();
}

echo json_encode($response);
?>
