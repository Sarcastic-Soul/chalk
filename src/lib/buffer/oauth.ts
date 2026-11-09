import "server-only";
import { env, redirectUri } from "@/lib/env";
import type { Session } from "@/lib/session";

const AUTH_URL = "https://auth.buffer.com/auth";
const TOKEN_URL = "https://auth.buffer.com/token";

// Request only what the app uses. offline_access returns a refresh token.
export const SCOPES = ["account:read", "posts:read", "posts:write", "offline_access"];

// Refresh a little early so a token never expires mid-request.
const EXPIRY_MARGIN_MS = 60_000;

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

export function buildAuthorizeUrl(state: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: env().BUFFER_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });
  return `${AUTH_URL}?${params}`;
}

async function postToken(body: Record<string, string>): Promise<Session> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => ({}))) as Partial<TokenResponse> & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new OAuthError(
      data.error_description ?? `Token request failed (${res.status})`,
      data.error,
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - EXPIRY_MARGIN_MS,
  };
}

export function exchangeCode(code: string, codeVerifier: string): Promise<Session> {
  const { BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET } = env();
  return postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: BUFFER_CLIENT_ID,
    client_secret: BUFFER_CLIENT_SECRET,
    code_verifier: codeVerifier,
  });
}

/**
 * Refresh tokens are single-use and rotate. Reusing a spent one revokes the
 * whole grant, so callers must persist the returned session immediately and
 * never retry with the old token.
 */
export function refreshSession(refreshToken: string): Promise<Session> {
  const { BUFFER_CLIENT_ID, BUFFER_CLIENT_SECRET } = env();
  return postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: BUFFER_CLIENT_ID,
    client_secret: BUFFER_CLIENT_SECRET,
  });
}

export function isExpired(session: Session, now = Date.now()): boolean {
  return now >= session.expiresAt;
}
