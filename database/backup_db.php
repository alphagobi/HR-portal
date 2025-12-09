<?php
// Prevent browser access without a key (Basic Security)
// Usage via Browser: backup_db.php?key=YOUR_SECRET_KEY
// Usage via Cron: php /path/to/backup_db.php
$secret_key = 'backup123'; // CHANGE THIS

if (php_sapi_name() !== 'cli' && (!isset($_GET['key']) || $_GET['key'] !== $secret_key)) {
    die("Access Denied");
}

// 1. Configuration
// Auto-detect config path (Works for both Local and cPanel)
$config_paths = [
    __DIR__ . '/../public/api/config.php', // Local structure
    __DIR__ . '/home2/alphagnn/public_html/insidemyfarm.com/api/config.php'        // standard cPanel structure
];

$config_loaded = false;
foreach ($config_paths as $path) {
    if (file_exists($path)) {
        require_once $path;
        $config_loaded = true;
        break;
    }
}

if (!$config_loaded) {
    die("Error: Could not find config.php. Please check file structure.");
}

$to_email = 'aravinth@alphagobi.com'; // <--- CHANGE THIS TO YOUR EMAIL
$from_email = 'reports@' . $_SERVER['SERVER_NAME']; // Sender email
$zip_password = 'YourStrongPassword123!'; // <--- SET YOUR ZIP PASSWORD

$backup_dir = __DIR__ . '/temp_backups'; // Temp folder
if (!file_exists($backup_dir)) {
    mkdir($backup_dir, 0755, true);
}

$date = date('Y-m-d_H-i-s');
$sql_file = $backup_dir . "/db_backup_$date.sql";
$zip_file = $backup_dir . "/db_backup_$date.zip";

// 2. Dump Database
// Using mysqldump command
$cmd = sprintf(
    "mysqldump -h %s -u %s -p%s %s > %s",
    escapeshellarg($host),
    escapeshellarg($username),
    escapeshellarg($password),
    escapeshellarg($db_name),
    escapeshellarg($sql_file)
);

exec($cmd, $output, $return_var);

if ($return_var !== 0) {
    die("Error during mysqldump. Output: " . implode("\n", $output));
}

// 3. Zip and Encrypt
// Using system zip command (usually available on Linux servers)
// -P sets password, -j junks paths (stores only file name)
$zip_cmd = sprintf(
    "zip -P %s -j %s %s",
    escapeshellarg($zip_password),
    escapeshellarg($zip_file),
    escapeshellarg($sql_file)
);

exec($zip_cmd, $zip_output, $zip_return);

if ($zip_return !== 0) {
    // Fallback: Try creating zip without password if password fails (or zip command missing)
    // But user requested password.
    die("Error during zipping. Ensure 'zip' command is installed. Output: " . implode("\n", $zip_output));
}

// 4. Email the Zip
if (file_exists($zip_file)) {
    $subject = "Daily Database Backup - " . $date;
    $message = "Attached is the daily database backup.\nDate: $date\n\nPassword Protected.";
    
    // Boundary for multipart
    $boundary = md5(time());
    
    // Headers
    $headers = "From: $from_email\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    
    // Body
    $body = "--$boundary\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $body .= "$message\r\n";
    
    // Attachment
    $file_content = file_get_contents($zip_file);
    $encoded_content = chunk_split(base64_encode($file_content));
    
    $body .= "--$boundary\r\n";
    $body .= "Content-Type: application/zip; name=\"" . basename($zip_file) . "\"\r\n";
    $body .= "Content-Disposition: attachment; filename=\"" . basename($zip_file) . "\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body .= "$encoded_content\r\n";
    $body .= "--$boundary--";
    
    if (mail($to_email, $subject, $body, $headers)) {
        echo "Backup sent to $to_email successfully.\n";
    } else {
        echo "Failed to send email.\n";
    }
} else {
    echo "Zip file creation failed.\n";
}

// 5. Cleanup
if (file_exists($sql_file)) unlink($sql_file);
if (file_exists($zip_file)) unlink($zip_file);
// Optional: remove dir if empty
// rmdir($backup_dir);

?>
