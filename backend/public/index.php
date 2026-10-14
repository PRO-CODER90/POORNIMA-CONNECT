<?php
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use App\AuthController;
use App\Http;

$path = rtrim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/', '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$routes = [
    'POST /api/auth/google' => [AuthController::class, 'google'],
    'POST /api/auth/login' => [AuthController::class, 'login'],
    'POST /api/auth/logout' => [AuthController::class, 'logout'],
    'GET /api/me' => [AuthController::class, 'me'],
];

try {
    if (isset($routes["$method $path"])) {
        $routes["$method $path"]();
    }
    $known = array_filter(array_keys($routes), fn($r) => str_ends_with($r, " $path"));
    Http::json(['success' => false, 'message' => $known ? 'Method not allowed' : 'Not found'], $known ? 405 : 404);
} catch (\Throwable $e) {
    error_log((string) $e);
    Http::json(['success' => false, 'code' => 'NETWORK_ERROR', 'message' => 'Server error.'], 500);
}
