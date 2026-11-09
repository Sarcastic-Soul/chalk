"use client";

import { useId, useState } from "react";
import { CameraIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { uploadPhoto } from "@/lib/media/upload-client";

type Upload =
  | { state: "empty" }
  | { state: "uploading"; preview: string }
  | { state: "ready"; preview: string; publicId: string }
  | { state: "failed"; message: string };

/** Tap-to-shoot photo box that uploads to Cloudinary and reports the public id. */
export function PhotoPicker({
  label,
  hint = "Tap to take or choose a photo",
  aspect = "aspect-[4/5]",
  initialPreview,
  onReady,
  onClear,
}: {
  label: string;
  hint?: string;
  aspect?: string;
  initialPreview?: string;
  onReady: (publicId: string) => void;
  onClear?: () => void;
}) {
  const id = useId();
  const [upload, setUpload] = useState<Upload>(
    initialPreview ? { state: "ready", preview: initialPreview, publicId: "" } : { state: "empty" },
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setUpload({ state: "uploading", preview });
    onClear?.();
    try {
      const publicId = await uploadPhoto(file);
      setUpload({ state: "ready", preview, publicId });
      onReady(publicId);
    } catch (err) {
      URL.revokeObjectURL(preview);
      setUpload({ state: "failed", message: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block font-semibold">
        {label}
      </label>
      <label
        htmlFor={id}
        className={`relative flex ${aspect} w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-line bg-paper-deep text-ink-soft hover:border-ink-soft`}
      >
        {"preview" in upload ? (
          // Local blob or Cloudinary preview of the user's own photo.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={upload.preview} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-6 text-center">
            <CameraIcon size={36} aria-hidden />
            {hint}
          </span>
        )}
        {upload.state === "uploading" && (
          <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/80 px-4 py-3 text-sm text-chalk">
            <SpinnerGapIcon size={18} className="animate-spin" aria-hidden /> Uploading…
          </span>
        )}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {upload.state === "failed" && (
        <p role="alert" className="mt-2 text-sm text-accent">
          {upload.message}
        </p>
      )}
    </div>
  );
}
