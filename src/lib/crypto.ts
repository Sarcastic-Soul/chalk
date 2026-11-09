import { EncryptJWT, jwtDecrypt } from "jose";

const encoder = new TextEncoder();

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(byteLength = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256(input: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
}

/** PKCE pair (RFC 7636, S256). */
export async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = randomToken(48);
  const challenge = base64url(await sha256(verifier));
  return { verifier, challenge };
}

async function keyFrom(secret: string): Promise<Uint8Array> {
  // A256GCM needs exactly 32 bytes; derive them from the configured secret.
  return sha256(secret);
}

/** Encrypt a JSON payload into a compact JWE string. */
export async function seal<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  maxAgeSeconds: number,
): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .encrypt(await keyFrom(secret));
}

/** Decrypt a JWE string. Returns null if tampered, expired or malformed. */
export async function unseal<T>(token: string, secret: string): Promise<T | null> {
  try {
    const { payload } = await jwtDecrypt(token, await keyFrom(secret));
    return payload as T;
  } catch {
    return null;
  }
}
