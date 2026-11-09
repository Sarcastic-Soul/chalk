import "server-only";

const API_URL = "https://api.buffer.com";

export class BufferApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Seconds to wait, set on 429 responses. */
    readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "BufferApiError";
  }

  get isRateLimited() {
    return this.status === 429;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: { message: string; extensions?: { code?: string; window?: string } }[];
};

/**
 * One POST to Buffer's GraphQL endpoint. Does not retry: a 429 is surfaced
 * with its Retry-After so the caller can show it, since the rate limit is
 * shared by every user of this app client (judges included).
 */
export async function bufferGraphQL<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as GraphQLResponse<T>;

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || undefined;
    throw new BufferApiError("Buffer rate limit reached. Try again shortly.", 429, retryAfter);
  }

  if (!res.ok || body.errors?.length || !body.data) {
    const message = body.errors?.[0]?.message ?? `Buffer API request failed (${res.status})`;
    throw new BufferApiError(message, res.status);
  }

  return body.data;
}
