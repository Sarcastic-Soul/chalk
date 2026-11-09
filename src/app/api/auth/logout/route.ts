import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  // 303 so the browser follows with GET after the form POST.
  return NextResponse.redirect(new URL("/", env().APP_URL), 303);
}
