<?php
declare(strict_types=1);

namespace App;

final class Errors
{
    public const MAP = [
        'GOOGLE_POPUP_CLOSED' => [400, 'Sign-in was cancelled. Please try again.'],
        'GOOGLE_FAILED' => [401, "We couldn't sign you in with Google. Please try again."],
        'INVALID_DOMAIN' => [403, 'Please sign in with your Poornima University email (@poornima.edu.in).'],
        'NOT_REGISTERED' => [403, 'This email is not registered in the University Portal. Contact support if you think this is a mistake.'],
        'ENROLLMENT_MISMATCH' => [403, "The enrollment number doesn't match this account. Please check and try again."],
        'INVALID_PASSCODE' => [401, 'Incorrect passcode. Please try again.'],
        'TOO_MANY_ATTEMPTS' => [429, 'Too many failed attempts. Please try again after 10 minutes.'],
        'SESSION_EXPIRED' => [401, 'Your session has expired. Please sign in again.'],
        'NETWORK_ERROR' => [500, 'Network error. Check your connection and try again.'],
    ];

    public static function fail(string $code): never
    {
        [$status, $message] = self::MAP[$code];
        Http::json(['success' => false, 'code' => $code, 'message' => $message], $status);
    }
}
