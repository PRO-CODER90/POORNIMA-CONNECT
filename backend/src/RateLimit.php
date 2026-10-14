<?php
declare(strict_types=1);

namespace App;

/**
 * File-backed limiter: 5 failures / 10 minutes per key. Works on a single host
 * (shared hosting, one VPS/container). Swap for Redis/DB if you scale out.
 */
final class RateLimit
{
    private const WINDOW = 600;
    private const MAX = 5;

    private static function path(string $key): string
    {
        $dir = Config::get('RATE_LIMIT_DIR', sys_get_temp_dir() . '/pu_ratelimit');
        if (!is_dir($dir)) @mkdir($dir, 0700, true);
        return $dir . '/' . hash('sha256', $key);
    }

    private static function recent(string $key): array
    {
        $f = self::path($key);
        $times = is_file($f) ? (json_decode((string) file_get_contents($f), true) ?: []) : [];
        $cut = time() - self::WINDOW;
        return array_values(array_filter($times, fn($t) => $t > $cut));
    }

    public static function limited(string ...$keys): bool
    {
        foreach ($keys as $k) if (count(self::recent($k)) >= self::MAX) return true;
        return false;
    }

    public static function fail(string ...$keys): void
    {
        foreach ($keys as $k) {
            $t = self::recent($k);
            $t[] = time();
            file_put_contents(self::path($k), json_encode($t), LOCK_EX);
        }
    }

    public static function clear(string ...$keys): void
    {
        foreach ($keys as $k) @unlink(self::path($k));
    }
}
