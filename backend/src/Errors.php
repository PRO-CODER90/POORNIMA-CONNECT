<?php
declare(strict_types=1);

namespace App;

final class Errors
{
    public const MAP = [
        'MISSING_FIELDS' => [400, 'Please enter your enrollment number and passcode.'],
        'INVALID_ENROLLMENT_FORMAT' => [400, 'Enrollment number should contain digits only.'],
        'INVALID_CREDENTIALS' => [401, 'Incorrect enrollment number or passcode. Please try again.'],
        'TOO_MANY_ATTEMPTS' => [429, 'Too many failed attempts. Please try again in 10 minutes.'],
        'INVALID_DOMAIN' => [403, 'Please sign in with your Poornima University email (@poornima.edu.in).'],
        'NOT_REGISTERED' => [403, "This email isn't registered in the University Portal. Contact support if this is a mistake."],
        'GOOGLE_FAILED' => [401, "We couldn't sign you in with Google. Please try again or use your passcode."],
        'GOOGLE_POPUP_CLOSED' => [400, 'Sign-in was cancelled. Please try again.'],
        'SESSION_EXPIRED' => [401, 'Your session has expired. Please sign in again.'],
        'NETWORK_ERROR' => [500, 'Network error. Check your connection and try again.'],
    ];

    public static function fail(string $code): never
    {
        [$status, $message] = self::MAP[$code];
        Http::json(['success' => false, 'code' => $code, 'message' => $message], $status);
    }
}
