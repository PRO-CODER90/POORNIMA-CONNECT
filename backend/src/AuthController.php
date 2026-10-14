<?php
declare(strict_types=1);

namespace App;

final class AuthController
{
    private const DOMAIN = '@poornima.edu.in';

    /** POST /api/auth/login  { role, enrollmentNo, passcode } */
    public static function login(): never
    {
        $body = Http::body();
        $role = $body['role'] ?? '';
        $enr = trim((string) ($body['enrollmentNo'] ?? ''));
        $passcode = is_string($body['passcode'] ?? null) ? $body['passcode'] : '';

        if ($enr === '' || $passcode === '') Errors::fail('MISSING_FIELDS');
        if (!preg_match('/^\d{1,20}$/', $enr)) Errors::fail('INVALID_ENROLLMENT_FORMAT');

        // Per IP+enrollment (spec) and per enrollment alone, so spoofing X-Forwarded-For
        // can't be used to brute-force one account.
        $keys = ['ipenr:' . Http::clientIp() . ':' . $enr, 'enr:' . $enr];
        if (RateLimit::limited(...$keys)) Errors::fail('TOO_MANY_ATTEMPTS');

        $user = is_string($role) ? Users::findByEnrollment($role, $enr) : null;
        $hash = $user ? Users::passcodeHash($user['enrollmentNo']) : null;
        // Always run one bcrypt comparison so timing doesn't reveal which enrollments exist.
        $ok = password_verify($passcode, $hash ?: Users::DUMMY_HASH) && $user !== null && $hash !== null;

        if (!$ok) {
            RateLimit::fail(...$keys);
            Errors::fail('INVALID_CREDENTIALS');
        }
        RateLimit::clear(...$keys);
        self::startSession($user);
    }

    /** POST /api/auth/google  { idToken } — verified, registered university email logs in directly. */
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
        self::startSession($user);
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

    private static function startSession(array $user): never
    {
        Session::setCookie(Session::sign([
            'enrollmentNo' => $user['enrollmentNo'],
            'name' => $user['name'],
            'role' => $user['role'],
            'email' => $user['email'],
        ], Session::MAX_AGE));
        Http::json(['success' => true, 'redirect' => '/dashboard']);
    }
}
