<?php
declare(strict_types=1);

namespace App;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

final class Session
{
    public const COOKIE = 'session';
    public const MAX_AGE = 3600;

    public static function sign(array $claims, int $ttl): string
    {
        $now = time();
        return JWT::encode($claims + ['iat' => $now, 'exp' => $now + $ttl], Config::require('JWT_SECRET'), 'HS256');
    }

    /** Returns the claims, or null if missing/invalid/expired. */
    public static function verify(?string $token): ?array
    {
        if (!$token) return null;
        try {
            return (array) JWT::decode($token, new Key(Config::require('JWT_SECRET'), 'HS256'));
        } catch (\Throwable) {
            return null;
        }
    }

    public static function fromCookie(): ?array
    {
        return self::verify($_COOKIE[self::COOKIE] ?? null);
    }

    public static function setCookie(string $token): void
    {
        self::cookie($token, time() + self::MAX_AGE);
    }

    public static function clearCookie(): void
    {
        self::cookie('', time() - 3600);
    }

    private static function cookie(string $value, int $expires): void
    {
        setcookie(self::COOKIE, $value, [
            'expires' => $expires,
            'path' => '/',
            'secure' => Config::get('COOKIE_SECURE', '1') !== '0',
            'httponly' => true,
            'samesite' => 'Lax',
        ]);
    }
}
