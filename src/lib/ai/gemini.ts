import "server-only";
import { z } from "zod";

const MODEL = "gemini-3.5-flash-lite";
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

type Part = { text: string } | { inline_data: { mime_type: string; data: string } };

export type ImageInput = { mimeType: string; base64: string };

/**
 * One structured-output call. The schema is sent as JSON Schema so Gemini
 * returns valid JSON, then zod checks it again on our side.
 */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: z.ZodType<T>;
  temperature?: number;
}): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("GEMINI_API_KEY is not set");

  const parts: Part[] = [
    ...(opts.images ?? []).map((img) => ({ inline_data: { mime_type: img.mimeType, data: img.base64 } })),
    { text: opts.prompt },
  ];

  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.7,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (res.status === 429) throw new AiError("The AI is busy right now. Try again in a minute.", 429);
    throw new AiError(body.error?.message ?? `Gemini request failed (${res.status})`, res.status);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new AiError("The AI returned nothing. Try again.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AiError("The AI returned something unreadable. Try again.");
  }
  const checked = opts.schema.safeParse(parsed);
  if (!checked.success) throw new AiError("The AI's answer didn't fit. Try again.");
  return checked.data;
}

/** Fetches an image URL and returns it ready for Gemini. */
export async function imageFromUrl(url: string): Promise<ImageInput> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new AiError(`Couldn't load the image (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { mimeType, base64 };
}
