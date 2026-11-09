import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, OAuthError } from "@/lib/buffer/oauth";
import { env } from "@/lib/env";
import { setSession, takeOAuthState } from "@/lib/session";

function home(error?: string) {
  const url = new URL("/", env().APP_URL);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = await takeOAuthState();

  if (params.get("error")) {
    return home(params.get("error") === "access_denied" ? "denied" : "oauth");
  }

  const code = params.get("code");
  const state = params.get("state");

  // State must match the value we issued, or the flow did not start here.
  if (!saved || !code || !state || state !== saved.state) {
    return home("state");
  }

  try {
    const session = await exchangeCode(code, saved.verifier);
    await setSession(session);
  } catch (err) {
    console.error("Buffer token exchange failed", err instanceof OAuthError ? err.code : err);
    return home("token");
  }

  return NextResponse.redirect(new URL("/app", env().APP_URL));
}
