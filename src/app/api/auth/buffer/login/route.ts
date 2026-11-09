import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/buffer/oauth";
import { createPkcePair, randomToken } from "@/lib/crypto";
import { setOAuthState } from "@/lib/session";

export async function GET() {
  const state = randomToken();
  const { verifier, challenge } = await createPkcePair();

  // Saved in an encrypted cookie (not memory) so it survives serverless cold starts.
  await setOAuthState({ state, verifier });

  return NextResponse.redirect(buildAuthorizeUrl(state, challenge));
}
