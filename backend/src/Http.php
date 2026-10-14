<?php
declare(strict_types=1);

namespace App;

final class Http
{
    public static function json(array $body, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        header('Cache-Control: no-store');
        echo json_encode($body);
        exit;
    }

    public static function body(): array
    {
        $data = json_decode(file_get_contents('php://input') ?: '', true);
        return is_array($data) ? $data : [];
    }

    public static function clientIp(): string
    {
        // Behind Vercel's rewrite the real client is the first X-Forwarded-For entry.
        $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        return trim(explode(',', $xff)[0]) ?: ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    }
}
