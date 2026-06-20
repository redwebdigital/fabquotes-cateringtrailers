<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'u394921017_fabquotes1');
define('DB_USER', 'u394921017_fabquotes1');
define('DB_PASS', '@1Liverpool8686');

function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}
