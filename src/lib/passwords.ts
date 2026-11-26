import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/** Password / passcode hashing with scrypt (random 16-byte salt). Format: `scrypt$N$r$p$salt$hash`. */
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(secret: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(secret, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(secret.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Same work as a real check, so unknown accounts can't be told apart by timing.
    await scrypt(secret, Buffer.alloc(16), KEYLEN, { N, r: R, p: P });
    return false;
  }
  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(secret.normalize("NFKC"), Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
