import { NextResponse, type NextRequest } from "next/server";
import { isExpired, refreshSession } from "@/lib/buffer/oauth";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  cookieOptions,
  sealSession,
  unsealSession,
} from "@/lib/session";

/**
 * Refreshes an expired Buffer access token before the request reaches a page
 * or route, so Server Components always see a valid token.
 *
 * Known limit: two requests arriving at the exact moment of expiry could both
 * refresh. Buffer rotates refresh tokens, so the second would revoke the grant
 * and the user would reconnect. Moving tokens to a DB with a lock fixes this.
 */
export async function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return NextResponse.next();

  const session = await unsealSession(raw);
  if (!session) return clearAndContinue(request);
  if (!isExpired(session)) return NextResponse.next();
  if (!session.refreshToken) return clearAndContinue(request);

  try {
    const fresh = await refreshSession(session.refreshToken);
    // Keep the old refresh token only if Buffer did not send a new one.
    const next = { ...fresh, refreshToken: fresh.refreshToken ?? session.refreshToken };
    const sealed = await sealSession(next);

    // Forward the new cookie to this request and persist it in the browser.
    request.cookies.set(SESSION_COOKIE, sealed);
    const response = NextResponse.next({ request: { headers: request.headers } });
    response.cookies.set(SESSION_COOKIE, sealed, { ...cookieOptions, maxAge: SESSION_MAX_AGE });
    return response;
  } catch {
    // Never retry a failed refresh with the same token.
    return clearAndContinue(request);
  }
}

function clearAndContinue(request: NextRequest) {
  request.cookies.delete(SESSION_COOKIE);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Skip static assets and the OAuth routes themselves.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/).*)"],
};
