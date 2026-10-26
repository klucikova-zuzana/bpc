// Password hashing with PBKDF2-SHA256 via Web Crypto, so the same code runs in
// Node (setup script) and in Cloudflare Workers (login). QS-SEC-02.
// Stored format: pbkdf2_sha256$<iterations>$<salt base64>$<hash base64>

// 100,000 is the highest iteration count Cloudflare Workers supports.
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(password, stored) {
  const [scheme, iterations, salt, expected] = stored.split('$');
  if (scheme !== 'pbkdf2_sha256') return false;
  const actual = toBase64(await derive(password, fromBase64(salt), Number(iterations)));
  // Constant-time comparison.
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
