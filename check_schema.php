<?php
require_once 'public/api/config.php';
$stmt = $pdo->query("DESCRIBE timesheet_entries");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
