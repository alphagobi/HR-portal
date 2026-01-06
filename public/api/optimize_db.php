<?php
require_once 'config.php';

echo "<h1>Anti Gravity Database Optimizer</h1>";

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Helper function to safely add index
    function addIndexIfNotExists($pdo, $table, $column, $indexName) {
        try {
            // Check if index exists
            $check = $pdo->query("SHOW INDEX FROM $table WHERE Key_name = '$indexName'");
            if ($check->rowCount() == 0) {
                $pdo->exec("CREATE INDEX $indexName ON $table($column)");
                echo "<p style='color: green;'>✅ Values Index <b>$indexName</b> added to table <b>$table</b>.</p>";
            } else {
                echo "<p style='color: gray;'>ℹ️ Index <b>$indexName</b> already exists on table <b>$table</b>.</p>";
            }
        } catch (PDOException $e) {
            echo "<p style='color: red;'>❌ Failed to add index $indexName: " . $e->getMessage() . "</p>";
        }
    }

    // 1. Planned Tasks: Search by user_id and date
    addIndexIfNotExists($pdo, 'planned_tasks', 'user_id, planned_date', 'idx_tasks_user_date');

    // 2. Timesheets: Search by employee and date
    addIndexIfNotExists($pdo, 'timesheets', 'employee_id, date', 'idx_timesheets_emp_date');

    // 3. Timesheet Entries: Look up by timesheet_id
    addIndexIfNotExists($pdo, 'timesheet_entries', 'timesheet_id', 'idx_entries_timesheet_id');

    echo "<hr><p><b>Optimization Complete!</b> Additional indexes have been applied safely.</p>";

} catch (PDOException $e) {
    echo "<p style='color: red;'>Critical Error: " . $e->getMessage() . "</p>";
}
?>
