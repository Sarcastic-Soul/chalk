"use client";

import { useActionState, useId, useState } from "react";
import { CameraIcon, CheckCircleIcon, SpinnerGapIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { getUploadSignature, submitPost, type ComposeState } from "./actions";

export type ChannelOption = { id: string; label: string; service: string };

type Upload =
  | { state: "empty" }
  | { state: "uploading"; preview: string }
  | { state: "ready"; preview: string; publicId: string }
  | { state: "failed"; message: string };

const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary free plan image limit

async function uploadToCloudinary(file: File): Promise<string> {
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

export function ComposeForm({ channels }: { channels: ChannelOption[] }) {
  const [state, formAction, pending] = useActionState<ComposeState, FormData>(submitPost, { status: "idle" });
  const [upload, setUpload] = useState<Upload>({ state: "empty" });
  const [text, setText] = useState("");
  const ids = { photo: useId(), caption: useId(), alt: useId(), channel: useId() };

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUpload({ state: "failed", message: "That photo is over 10 MB. Try a smaller one." });
      return;
    }
    const preview = URL.createObjectURL(file);
    setUpload({ state: "uploading", preview });
    try {
      const publicId = await uploadToCloudinary(file);
      setUpload({ state: "ready", preview, publicId });
    } catch (err) {
      URL.revokeObjectURL(preview);
      setUpload({ state: "failed", message: err instanceof Error ? err.message : "Upload failed." });
    }
  }

  const canSubmit = upload.state === "ready" && text.trim().length > 0 && !pending;

  return (
    <form action={formAction} className="space-y-8">
      <div>
        <label htmlFor={ids.photo} className="mb-2 block font-semibold">
          Photo
        </label>
        <label
          htmlFor={ids.photo}
          className="relative flex aspect-[4/5] w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-line bg-paper-deep text-ink-soft hover:border-ink-soft"
        >
          {"preview" in upload ? (
            // Local blob preview of the user's own photo.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={upload.preview} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-2">
              <CameraIcon size={36} aria-hidden />
              Tap to take or choose a photo
            </span>
          )}
          {upload.state === "uploading" && (
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-ink/80 px-4 py-3 text-sm text-chalk">
              <SpinnerGapIcon size={18} className="animate-spin" aria-hidden /> Uploading…
            </span>
          )}
        </label>
        <input
          id={ids.photo}
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
        <input type="hidden" name="publicId" value={upload.state === "ready" ? upload.publicId : ""} />
      </div>

      <div>
        <label htmlFor={ids.caption} className="mb-2 block font-semibold">
          Caption
        </label>
        <textarea
          id={ids.caption}
          name="text"
          rows={5}
          maxLength={2200}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pumpkin loaf is back. Warm, with salted butter, until 2pm or sold out."
          className="w-full rounded-md border border-line bg-white/60 px-4 py-3 text-base"
        />
        <p className="mt-1 text-right text-xs text-ink-soft">{text.length} / 2200</p>
      </div>

      <div>
        <label htmlFor={ids.alt} className="mb-2 block font-semibold">
          Photo description <span className="font-normal text-ink-soft">(for screen readers)</span>
        </label>
        <input
          id={ids.alt}
          name="altText"
          maxLength={1000}
          placeholder="A slice of pumpkin loaf with butter on a plate"
          className="min-h-12 w-full rounded-md border border-line bg-white/60 px-4 text-base"
        />
      </div>

      <div>
        <label htmlFor={ids.channel} className="mb-2 block font-semibold">
          Post to
        </label>
        <select
          id={ids.channel}
          name="channelId"
          className="min-h-12 w-full rounded-md border border-line bg-white/60 px-4 text-base"
        >
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · {c.service}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">When</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "now", label: "Post now" },
            { value: "queue", label: "Next open slot" },
          ].map((o, i) => (
            <label
              key={o.value}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-line px-3 has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-chalk"
            >
              <input type="radio" name="when" value={o.value} defaultChecked={i === 0} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="preview" defaultChecked className="mt-1 size-5 accent-[var(--accent)]" />
        <span>
          <span className="font-semibold">Preview only</span>
          <span className="block text-sm text-ink-soft">
            Saves a draft in Buffer instead of publishing. Untick to post for real.
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-accent text-lg font-semibold text-accent-ink transition-colors hover:bg-[#a8441f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <SpinnerGapIcon size={20} className="animate-spin" aria-hidden />}
        {pending ? "Sending to Buffer…" : "Send"}
      </button>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="flex gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
            <WarningCircleIcon size={22} className="shrink-0 text-accent" aria-hidden />
            {state.message}
          </p>
        )}
        {state.status === "sent" && (
          <p className="flex gap-2 rounded-md border border-board/30 bg-board/10 px-4 py-3">
            <CheckCircleIcon size={22} className="shrink-0 text-board" aria-hidden />
            {state.preview
              ? "Saved as a draft in Buffer. Nothing was published."
              : state.postStatus === "sent"
                ? "Posted."
                : `Buffer has it (${state.postStatus})${state.dueAt ? `, going out ${new Date(state.dueAt).toLocaleString()}` : ""}.`}
          </p>
        )}
      </div>
    </form>
  );
}
