<?php
declare(strict_types=1);

namespace App;

final class AuthController
{
    private const DOMAIN = '@poornima.edu.in';

    /** POST /api/auth/google  { idToken } */
    public static function google(): never
    {
        $ipKey = 'ip:' . Http::clientIp();
        if (RateLimit::limited($ipKey)) Errors::fail('TOO_MANY_ATTEMPTS');

        try {
            $idToken = Http::body()['idToken'] ?? null;
            if (!is_string($idToken) || $idToken === '') throw new \InvalidArgumentException('missing token');

            $claims = GoogleVerifier::verify($idToken);
            $email = $claims['email'] ?? null;
            if (!is_string($email) || ($claims['email_verified'] ?? false) !== true) {
                throw new \UnexpectedValueException('unverified email');
            }
        } catch (\Throwable) {
            RateLimit::fail($ipKey);
            Errors::fail('GOOGLE_FAILED');
        }

        if (!str_ends_with(Users::normalize($email), self::DOMAIN)) {
            RateLimit::fail($ipKey);
            Errors::fail('INVALID_DOMAIN');
        }
        $user = Users::findByEmail($email);
        if (!$user) {
            RateLimit::fail($ipKey);
            Errors::fail('NOT_REGISTERED');
        }

        $tempToken = Session::sign(['email' => $user['email'], 'step' => 'google'], 300);
        Http::json(['success' => true, 'needsVerification' => true, 'tempToken' => $tempToken]);
    }

    /** POST /api/auth/verify  { tempToken, enrollmentNo, passcode } */
    public static function verify(): never
    {
        $body = Http::body();
        $temp = Session::verify(is_string($body['tempToken'] ?? null) ? $body['tempToken'] : null);
        if (!$temp || ($temp['step'] ?? '') !== 'google' || !is_string($temp['email'] ?? null)) {
            Errors::fail('SESSION_EXPIRED');
        }

        $keys = ['ip:' . Http::clientIp(), 'email:' . Users::normalize($temp['email'])];
        if (RateLimit::limited(...$keys)) Errors::fail('TOO_MANY_ATTEMPTS');

        $user = Users::findByEmail($temp['email']);
        $enrollmentNo = trim((string) ($body['enrollmentNo'] ?? ''));
        $passcode = is_string($body['passcode'] ?? null) ? $body['passcode'] : '';

        if (!$user || !hash_equals($user['enrollmentNo'], $enrollmentNo)) {
            RateLimit::fail(...$keys);
            Errors::fail('ENROLLMENT_MISMATCH');
        }
        $hash = Users::passcodeHash($user['enrollmentNo']);
        if (!$hash || $passcode === '' || !password_verify($passcode, $hash)) {
            RateLimit::fail(...$keys);
            Errors::fail('INVALID_PASSCODE');
        }

        RateLimit::clear(...$keys);
        Session::setCookie(Session::sign([
            'enrollmentNo' => $user['enrollmentNo'],
            'name' => $user['name'],
            'role' => $user['role'],
            'email' => $user['email'],
        ], Session::MAX_AGE));
        Http::json(['success' => true, 'redirect' => '/dashboard']);
    }

    /** POST /api/auth/logout */
    public static function logout(): never
    {
        Session::clearCookie();
        Http::json(['success' => true]);
    }

    /** GET /api/me */
    public static function me(): never
    {
        $s = Session::fromCookie();
        if (!$s) Errors::fail('SESSION_EXPIRED');
        Http::json(['name' => $s['name'], 'role' => $s['role'], 'enrollmentNo' => $s['enrollmentNo']]);
    }
}
