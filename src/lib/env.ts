import "server-only";
import { z } from "zod";

const schema = z.object({
  BUFFER_CLIENT_ID: z.string().min(1),
  BUFFER_CLIENT_SECRET: z.string().min(1),
  // Public base URL of the app, no trailing slash. Must be HTTPS (Buffer rejects http redirect URIs).
  APP_URL: z
    .url()
    .refine((v) => v.startsWith("https://"), "APP_URL must use https")
    .transform((v) => v.replace(/\/+$/, "")),
  // Used to encrypt session cookies. Generate with: openssl rand -base64 48
  SESSION_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

// Read lazily so `next build` works without secrets present.
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Missing or invalid environment variables: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function redirectUri(): string {
  return `${env().APP_URL}/api/auth/buffer/callback`;
}
