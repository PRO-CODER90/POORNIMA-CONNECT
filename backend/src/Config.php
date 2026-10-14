<?php
declare(strict_types=1);

namespace App;

final class Config
{
    private static bool $loaded = false;

    /** Load backend/.env once (real environment variables win over the file). */
    private static function load(): void
    {
        if (self::$loaded) return;
        self::$loaded = true;
        $file = dirname(__DIR__) . '/.env';
        if (!is_readable($file)) return;
        foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
            [$k, $v] = explode('=', $line, 2);
            $k = trim($k);
            if (getenv($k) === false) putenv($k . '=' . trim($v, " \t\"'"));
        }
    }

    public static function get(string $key, ?string $default = null): ?string
    {
        self::load();
        $v = getenv($key);
        return ($v === false || $v === '') ? $default : $v;
    }

    public static function require(string $key): string
    {
        $v = self::get($key);
        if ($v === null) throw new \RuntimeException("$key is not set");
        return $v;
    }
}
