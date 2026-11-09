"use server";

import { signUpload, type UploadSignature } from "@/lib/media/cloudinary";
import { getSession } from "@/lib/session";

export async function getUploadSignature(): Promise<UploadSignature | null> {
  // Only signed-in users may upload to our Cloudinary account.
  if (!(await getSession())) return null;
  return signUpload();
}
