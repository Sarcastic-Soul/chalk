import { beforeEach, describe, expect, it } from "vitest";

beforeEach(() => {
  process.env.BUFFER_CLIENT_ID = "client-123";
  process.env.BUFFER_CLIENT_SECRET = "secret-456";
  process.env.APP_URL = "https://chalk.example.com/";
  process.env.SESSION_SECRET = "x".repeat(40);
});

describe("buildAuthorizeUrl", () => {
  it("includes PKCE, state, scopes and an exact redirect URI", async () => {
    const { buildAuthorizeUrl } = await import("./oauth");
    const url = new URL(buildAuthorizeUrl("state-1", "challenge-1"));

    expect(url.origin + url.pathname).toBe("https://auth.buffer.com/auth");
    expect(url.searchParams.get("client_id")).toBe("client-123");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("state-1");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-1");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    // Trailing slash on APP_URL must not leak into the redirect URI.
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://chalk.example.com/api/auth/buffer/callback",
    );
    expect(url.searchParams.get("scope")?.split(" ")).toContain("offline_access");
    // The secret never goes to the browser.
    expect(url.toString()).not.toContain("secret-456");
  });
});

describe("isExpired", () => {
  it("compares against expiresAt", async () => {
    const { isExpired } = await import("./oauth");
    expect(isExpired({ accessToken: "a", expiresAt: 1000 }, 999)).toBe(false);
    expect(isExpired({ accessToken: "a", expiresAt: 1000 }, 1000)).toBe(true);
  });
});
