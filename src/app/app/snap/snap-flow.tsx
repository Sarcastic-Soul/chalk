"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowCounterClockwiseIcon, PaperPlaneTiltIcon, SparkleIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { PhotoPicker } from "@/components/photo-picker";
import { btnPrimary, btnSecondary, field, label, Notice } from "@/components/ui";
import { draftSpecial, sendSpecial, type SendResult, type SnapDraft } from "./actions";

type Channel = { id: string; name: string; service: string };

export function SnapFlow({
  channels,
  defaultChannelId,
  previewMode,
  suggestedTime,
}: {
  channels: Channel[];
  defaultChannelId: string;
  previewMode: boolean;
  suggestedTime: string;
}) {
  const [publicId, setPublicId] = useState("");
  const [note, setNote] = useState("");
  const [channelId, setChannelId] = useState(defaultChannelId);
  const [draft, setDraft] = useState<SnapDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [when, setWhen] = useState<"now" | "at">("now");
  const [time, setTime] = useState(suggestedTime);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Extract<SendResult, { ok: true }> | null>(null);
  const [drafting, startDraft] = useTransition();
  const [sending, startSend] = useTransition();

  function reset() {
    setDraft(null);
    setSent(null);
    setError("");
    setNote("");
    setPublicId("");
  }

  if (sent) {
    const whenText = sent.dueAt
      ? new Date(sent.dueAt).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })
      : "";
    return (
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-12">
        <div className="space-y-6 lg:order-2">
        <Notice tone="ok">
          {sent.preview
            ? "Saved as a draft in Buffer. Nothing was published. Turn preview off in settings to post for real."
            : sent.status === "sent" || when === "now"
              ? "Sent to Buffer. It goes out in a moment."
              : `Scheduled in Buffer for ${whenText}.`}
        </Notice>
        <button type="button" className={btnPrimary} onClick={reset}>
          <ArrowCounterClockwiseIcon size={20} aria-hidden /> Snap another
        </button>
        <Link href="/app" className={`${btnSecondary} w-full`}>
          Back to today
        </Link>
        </div>
        {draft && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.imageUrl} alt={draft.altText} className="w-full rounded-md lg:order-1" />
        )}
      </div>
    );
  }

  if (draft) {
    return (
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-12">
        {/* Rendered card on Cloudinary: exactly what Buffer will publish. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.imageUrl} alt={draft.altText} className="w-full rounded-md shadow-sm lg:sticky lg:top-12" />

        <div className="space-y-6">
        <div>
          <label htmlFor="caption" className={label}>
            Caption for {draft.channelName} <span className="font-normal capitalize text-ink-soft">· {draft.service}</span>
          </label>
          <textarea
            id="caption"
            rows={9}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className={`${field} py-3`}
            maxLength={2200}
          />
          <p className="mt-1 text-right text-sm text-ink-soft">{caption.length} / 2200</p>
        </div>

        <fieldset>
          <legend className={label}>When</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["now", "at"] as const).map((w) => (
              <label
                key={w}
                className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-line font-semibold has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-chalk"
              >
                <input type="radio" name="when" value={w} checked={when === w} onChange={() => setWhen(w)} className="sr-only" />
                {w === "now" ? "Post now" : "Later today"}
              </label>
            ))}
          </div>
          {when === "at" && (
            <div className="mt-3">
              <label htmlFor="time" className="sr-only">Time</label>
              <input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
            </div>
          )}
        </fieldset>

        {previewMode && (
          <p className="text-sm text-ink-soft">Preview mode is on: this goes to Buffer as a draft and won&rsquo;t publish.</p>
        )}

        <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>

        <button
          type="button"
          className={btnPrimary}
          disabled={sending || !caption.trim()}
          onClick={() =>
            startSend(async () => {
              setError("");
              const res = await sendSpecial({ postId: draft.postId, caption, when, time: when === "at" ? time : undefined });
              if (res.ok) setSent(res);
              else setError(res.message);
            })
          }
        >
          {sending ? <SpinnerGapIcon size={20} className="animate-spin" aria-hidden /> : <PaperPlaneTiltIcon size={20} aria-hidden />}
          {previewMode ? "Save draft to Buffer" : when === "now" ? "Post through Buffer" : "Schedule in Buffer"}
        </button>
        <button type="button" className={`${btnSecondary} w-full`} onClick={reset} disabled={sending}>
          Start over
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-12">
      <PhotoPicker
        label="Photo of the special"
        hint="Tap to snap the dish or your chalkboard"
        onReady={setPublicId}
        onClear={() => setPublicId("")}
      />
      <div className="space-y-6 lg:pt-8">
      <div>
        <label htmlFor="note" className={label}>
          Anything to add? <span className="font-normal text-ink-soft">(optional)</span>
        </label>
        <input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={400}
          className={field}
          placeholder="pumpkin loaf, warm, till 2pm"
        />
      </div>
      {channels.length > 1 && (
        <div>
          <label htmlFor="channel" className={label}>Post to</label>
          <select id="channel" value={channelId} onChange={(e) => setChannelId(e.target.value)} className={field}>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.service}</option>
            ))}
          </select>
        </div>
      )}

      <div aria-live="polite">{error && <Notice tone="error">{error}</Notice>}</div>

      <button
        type="button"
        className={btnPrimary}
        disabled={drafting || (!publicId && !note.trim())}
        onClick={() =>
          startDraft(async () => {
            setError("");
            const res = await draftSpecial({ publicId, note, channelId });
            if (res.ok) {
              setDraft(res.draft);
              setCaption(res.draft.caption);
            } else setError(res.message);
          })
        }
      >
        {drafting ? <SpinnerGapIcon size={20} className="animate-spin" aria-hidden /> : <SparkleIcon size={20} aria-hidden />}
        {drafting ? "Writing your post…" : "Make the post"}
      </button>
      </div>
    </div>
  );
}
