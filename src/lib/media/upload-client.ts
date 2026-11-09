import { getUploadSignature } from "@/app/app/upload-actions";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // Cloudinary free plan image limit

/** Uploads straight from the browser to Cloudinary with a server-made signature. */
export async function uploadPhoto(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That photo is over 10 MB. Try a smaller one.");
  const sig = await getUploadSignature();
  if (!sig) throw new Error("Your session ended. Reconnect Buffer and try again.");

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sig.apiKey);
  body.append("timestamp", String(sig.timestamp));
  body.append("signature", sig.signature);
  body.append("folder", sig.folder);
  body.append("allowed_formats", sig.allowedFormats);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { public_id?: string; error?: { message?: string } };
  if (!res.ok || !data.public_id) throw new Error(data.error?.message ?? "Upload failed. Try another photo.");
  return data.public_id;
}
