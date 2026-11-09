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
