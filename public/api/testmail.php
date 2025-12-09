<?php
// Simple test script to verify email functionality
// Usage: Access via browser: yourdomain.com/api/testmail.php

$to = 'aravinth@alphagobi.com'; // Admin email
$subject = 'Test Mail: Backup System Check';
$message = "Report is in progress.\n\nThis is a test email to confirm that PHP mail() is working on your server.";

// Basic headers
$headers = 'From: reports@' . $_SERVER['SERVER_NAME'] . "\r\n" .
    'Reply-To: no-reply@' . $_SERVER['SERVER_NAME'] . "\r\n" .
    'X-Mailer: PHP/' . phpversion();

// Attempt to send
if(mail($to, $subject, $message, $headers)) {
    echo "Success: Email sent to $to";
} else {
    http_response_code(500);
    echo "Error: Failed to send email to $to";
}
?>
