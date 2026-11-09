import { describe, expect, it } from "vitest";
import { base64url, createPkcePair, randomToken, seal, sha256, unseal } from "./crypto";

const SECRET = "test-secret-that-is-at-least-32-characters-long";

describe("PKCE", () => {
  it("creates a verifier within RFC 7636 length and charset", async () => {
    const { verifier } = await createPkcePair();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("derives the challenge as base64url(sha256(verifier))", async () => {
    const { verifier, challenge } = await createPkcePair();
    expect(challenge).toBe(base64url(await sha256(verifier)));
    expect(challenge).not.toMatch(/[+/=]/);
  });

  it("matches the RFC 7636 appendix B test vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(base64url(await sha256(verifier))).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("randomToken", () => {
  it("returns distinct url-safe values", () => {
    const a = randomToken();
    const b = randomToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9\-_]+$/);
  });
});

describe("seal / unseal", () => {
  it("round-trips a payload", async () => {
    const token = await seal({ accessToken: "abc", expiresAt: 1 }, SECRET, 60);
    expect(await unseal(token, SECRET)).toMatchObject({ accessToken: "abc", expiresAt: 1 });
  });

  it("does not expose the payload in plain text", async () => {
    const token = await seal({ accessToken: "very-secret-token" }, SECRET, 60);
    expect(token).not.toContain("very-secret-token");
  });

  it("rejects a different secret", async () => {
    const token = await seal({ a: 1 }, SECRET, 60);
    expect(await unseal(token, `${SECRET}-other`)).toBeNull();
  });

  it("rejects tampered tokens", async () => {
    const token = await seal({ a: 1 }, SECRET, 60);
    const tampered = token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await unseal(tampered, SECRET)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await seal({ a: 1 }, SECRET, -10);
    expect(await unseal(token, SECRET)).toBeNull();
  });
});
