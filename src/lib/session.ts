import "server-only";
import { cookies } from "next/headers";
import { seal, unseal } from "@/lib/crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "chalk_session";
export const OAUTH_COOKIE = "chalk_oauth";

// Long enough to outlive access tokens; the refresh token keeps the grant alive.
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const OAUTH_MAX_AGE = 60 * 10;

export type Session = {
  accessToken: string;
  refreshToken?: string;
  /** Unix ms when the access token expires. */
  expiresAt: number;
  /** Buffer account and organization, saved at login so pages don't refetch them. */
  accountId?: string;
  orgId?: string;
};

type OAuthState = { state: string; verifier: string };

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export async function sealSession(session: Session): Promise<string> {
  return seal(session, env().SESSION_SECRET, SESSION_MAX_AGE);
}

export async function unsealSession(value: string | undefined): Promise<Session | null> {
  if (!value) return null;
  const data = await unseal<Session>(value, env().SESSION_SECRET);
  if (!data?.accessToken || typeof data.expiresAt !== "number") return null;
  return data;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return unsealSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await sealSession(session), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function setOAuthState(value: OAuthState): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_COOKIE, await seal(value, env().SESSION_SECRET, OAUTH_MAX_AGE), {
    ...cookieOptions,
    maxAge: OAUTH_MAX_AGE,
  });
}

/** Reads and deletes the one-time OAuth state cookie. */
export async function takeOAuthState(): Promise<OAuthState | null> {
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete(OAUTH_COOKIE);
  if (!raw) return null;
  return unseal<OAuthState>(raw, env().SESSION_SECRET);
}
