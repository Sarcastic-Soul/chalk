import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

const schema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

export const UPLOAD_FOLDER = "chalk/uploads";
const ALLOWED_FORMATS = "jpg,jpeg,png,webp,heic";

// Cloudinary assigns random ids inside our folder; anything else is rejected.
const PUBLIC_ID = /^chalk\/uploads\/[A-Za-z0-9_-]{1,100}$/;

// Instagram feed posts must be JPEG, between 4:5 and 1.91:1. 4:5 fills the most screen.
const FEED_TRANSFORM = "c_fill,g_auto,ar_4:5,w_1080,f_jpg,q_auto";

function config() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) throw new Error("Cloudinary environment variables are missing");
  return parsed.data;
}

export type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
};

/** Signs a direct browser upload. The browser never sees the API secret. */
export function signUpload(now = Date.now()): UploadSignature {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config();
  const timestamp = Math.floor(now / 1000);
  const params = { allowed_formats: ALLOWED_FORMATS, folder: UPLOAD_FOLDER, timestamp };
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    timestamp,
    signature: cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET),
    folder: UPLOAD_FOLDER,
    allowedFormats: ALLOWED_FORMATS,
  };
}

export function isValidPublicId(publicId: string): boolean {
  return PUBLIC_ID.test(publicId);
}

/**
 * Public, stable, non-expiring HTTPS URL. Buffer fetches the image at publish
 * time, so this must stay reachable until the post goes out.
 */
export function feedImageUrl(publicId: string): string {
  if (!isValidPublicId(publicId)) throw new Error("Invalid image id");
  return `https://res.cloudinary.com/${config().CLOUDINARY_CLOUD_NAME}/image/upload/${FEED_TRANSFORM}/${publicId}.jpg`;
}

/** Smaller copy for previews and for sending to Gemini. */
export function previewImageUrl(publicId: string, width = 800): string {
  if (!isValidPublicId(publicId)) throw new Error("Invalid image id");
  return `https://res.cloudinary.com/${config().CLOUDINARY_CLOUD_NAME}/image/upload/c_limit,w_${width},f_jpg,q_auto/${publicId}.jpg`;
}

/** 4:5 photo for the card renderer to place behind the brand band. */
export function cardPhotoUrl(publicId: string): string {
  if (!isValidPublicId(publicId)) throw new Error("Invalid image id");
  return `https://res.cloudinary.com/${config().CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,g_auto,w_1080,h_1010,f_jpg,q_auto/${publicId}.jpg`;
}

/** Server-side upload of a rendered card. Returns a JPEG URL Buffer can fetch. */
export async function uploadCard(png: Buffer): Promise<string> {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = config();
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  const result = await new Promise<{ public_id: string; version: number }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "chalk/cards", resource_type: "image" }, (err, res) =>
        err || !res ? reject(err ?? new Error("Card upload failed")) : resolve(res),
      )
      .end(png);
  });
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_jpg,q_auto/v${result.version}/${result.public_id}.jpg`;
}
