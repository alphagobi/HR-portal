<?php
require_once 'config.php';

// Simple Auth Check (Simulated for this context, ideally use a proper Auth middleware)
// Assuming the frontend sends a user_id or we rely on session if implemented.
// Since this is a simple API set, we'll verify the user exists and is admin via a passed ID or just proceed if protected by frontend (NOT RECOMMENDED for production without JWT/Session).
// Given the existing code structure, we'll look for user_id in GET or POST to check role, or better, just check the database if we had session.
// For now, to keep it simple and consistent with other files which might be open:
// We will Require the user_id to be sent.

$userId = $_GET['user_id'] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(['error' => 'User ID required']);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Access Denied: Admins only']);
        exit;
    }

    // Path to backup script
    // Check multiple locations
    $possiblePaths = [
        realpath(__DIR__ . '/../../database/backup_db.php'), // Local / Repo structure
        realpath(__DIR__ . '/../database/backup_db.php'),   // cPanel structure (api and database are siblings)
        '/home2/alphagnn/public_html/insidemyfarm.com/database/backup_db.php' // Explicit cPanel Path
    ];

    $backupScript = null;
    foreach ($possiblePaths as $path) {
        if ($path && file_exists($path)) {
            $backupScript = $path;
            break;
        }
    }

    if ($backupScript && file_exists($backupScript)) {
        // Execute via PHP CLI
        // "2>&1" redirects stderr to stdout so we capture errors
        $cmd = "php " . escapeshellarg($backupScript) . " 2>&1";
        
        $output = [];
        $returnVar = 0;
        exec($cmd, $output, $returnVar);

        $outputStr = implode("\n", $output);

        if ($returnVar === 0) {
            echo json_encode([
                'success' => true, 
                'message' => 'Backup process finished.',
                'details' => $outputStr
            ]);
        } else {
             echo json_encode([
                'success' => false, 
                'message' => 'Backup script returned error code ' . $returnVar,
                'details' => $outputStr
            ]);
        }

    } else {
         http_response_code(500);
         // Return checked paths for debugging
         echo json_encode([
            'error' => 'Backup script not found. Checked paths: ' . implode(', ', array_filter($possiblePaths)) . ' | Current Dir: ' . __DIR__
         ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
