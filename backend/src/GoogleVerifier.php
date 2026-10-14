<?php
declare(strict_types=1);

namespace App;

use Firebase\JWT\JWT;

/** Verifies a Google ID token: RS256 signature, issuer, audience and expiry. */
final class GoogleVerifier
{
    private const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

    /** @return array<string,mixed> verified claims; throws on any failure */
    public static function verify(string $idToken): array
    {
        $clientId = Config::require('GOOGLE_CLIENT_ID');
        $jwksUri = Config::get('GOOGLE_JWKS_URI', 'https://www.googleapis.com/oauth2/v3/certs');

        $keys = self::keys($jwksUri);
        $claims = (array) JWT::decode($idToken, $keys); // checks signature + exp/nbf (RS256 only via JWK alg)

        if (!in_array($claims['iss'] ?? '', self::ISSUERS, true)) throw new \UnexpectedValueException('bad issuer');
        $aud = (array) ($claims['aud'] ?? []);
        if (!in_array($clientId, $aud, true)) throw new \UnexpectedValueException('bad audience');
        return $claims;
    }

    private static function keys(string $uri): array
    {
        $cache = sys_get_temp_dir() . '/pu_jwks_' . md5($uri) . '.json';
        $json = (is_file($cache) && filemtime($cache) > time() - 3600) ? file_get_contents($cache) : false;
        if ($json === false) {
            $ctx = stream_context_create(['http' => ['timeout' => 5]]);
            $json = file_get_contents($uri, false, $ctx);
            if ($json === false) throw new \RuntimeException('cannot fetch Google keys');
            file_put_contents($cache, $json, LOCK_EX);
        }
        return \Firebase\JWT\JWK::parseKeySet(json_decode($json, true), 'RS256');
    }
}
