<?php
declare(strict_types=1);

namespace App;

final class Users
{
    /** Sample records from the spec. Passcode hashes live in PASSCODE_HASHES, not here. */
    private const RECORDS = [
        ['enrollmentNo' => '20070', 'name' => 'HJ',     'email' => '2024bcaaidshj20070@poornima.edu.in', 'role' => 'student'],
        ['enrollmentNo' => '18915', 'name' => 'VS',     'email' => '2024bcaaidsvs18915@poornima.edu.in', 'role' => 'student'],
        ['enrollmentNo' => '18221', 'name' => 'Aryan',  'email' => '2024bcaaidshj18221@poornima.edu.in', 'role' => 'student'],
        ['enrollmentNo' => '1234',  'name' => 'Rockey', 'email' => 'Rockey.Kumar@poornima.edu.in',       'role' => 'faculty'],
        ['enrollmentNo' => '1532',  'name' => 'Kavita', 'email' => 'Kavita.Jain@poornima.edu.in',        'role' => 'faculty'],
    ];

    public static function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    public static function findByEmail(string $email): ?array
    {
        $n = self::normalize($email);
        foreach (self::RECORDS as $u) {
            if (self::normalize($u['email']) === $n) return $u;
        }
        return null;
    }

    public static function findByEnrollment(string $role, string $enrollmentNo): ?array
    {
        foreach (self::RECORDS as $u) {
            if ($u['role'] === $role && $u['enrollmentNo'] === $enrollmentNo) return $u;
        }
        return null;
    }

    /** Valid bcrypt hash used so unknown users cost the same time as known ones. */
    public const DUMMY_HASH = '$2y$10$0pLO0itaTshYcRpQtawL.OmziAaltOTC2u1NEqnajpLqUCwfnna6i';

    public static function passcodeHash(string $enrollmentNo): ?string
    {
        $raw = base64_decode(Config::get('PASSCODE_HASHES', ''), true);
        $map = $raw ? json_decode($raw, true) : null;
        return is_array($map) ? ($map[$enrollmentNo] ?? null) : null;
    }

    public static function enrollmentNumbers(): array
    {
        return array_column(self::RECORDS, 'enrollmentNo');
    }
}
