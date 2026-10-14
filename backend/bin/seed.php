<?php
// Dev helper: generates a random passcode per sample user, prints them once,
// and writes bcrypt hashes + a JWT secret into backend/.env.
declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Users;

// --demo: use the fixed, publicly-known test passcodes. NEVER on a real deployment.
$demo = ['20070' => 'Hj@20070', '18915' => 'Vs@18915', '18221' => 'Ar@18221', '1234' => 'Rk@1234', '1532' => 'Kv@1532'];
$useDemo = in_array('--demo', $argv, true);

$hashes = [];
foreach (Users::enrollmentNumbers() as $id) {
    $pass = $useDemo ? $demo[$id] : (string) random_int(100000, 999999);
    $hashes[$id] = password_hash($pass, PASSWORD_BCRYPT);
    echo "$id: $pass\n";
}

$file = dirname(__DIR__) . '/.env';
$env = is_file($file) ? file($file, FILE_IGNORE_NEW_LINES) : [];
$set = function (string $k, string $v) use (&$env) {
    $env = array_values(array_filter($env, fn($l) => !str_starts_with($l, "$k=")));
    $env[] = "$k=$v";
};
$set('PASSCODE_HASHES', base64_encode(json_encode($hashes)));
if (!preg_grep('/^JWT_SECRET=./', $env)) $set('JWT_SECRET', bin2hex(random_bytes(32)));
file_put_contents($file, implode("\n", $env) . "\n");
echo "\nWrote backend/.env. Add GOOGLE_CLIENT_ID yourself.\n";
