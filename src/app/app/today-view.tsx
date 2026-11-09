"use client";

import { useState, useTransition } from "react";
import { ArrowCounterClockwiseIcon, ProhibitIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react";
import { Notice } from "@/components/ui";
import { clearSoldOut, markSoldOut, pullPost, setPreviewMode, type SoldOutResult } from "./today-actions";

export type TodayItem = { id: string; name: string; price: string; soldOut: boolean };
export type TodayPost = {
  id: string;
  when: string;
  headline: string;
  status: string;
  imageUrl: string;
  error: string | null;
  reason: string;
  canPull: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  draft: "Buffer draft",
  approved: "Waiting for space in Buffer",
  sent: "Sent",
  pulled: "Pulled",
  error: "Failed",
};

export function PreviewToggle({ on }: { on: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-paper-deep px-4 py-3">
      <div>
        <p className="font-semibold" id="preview-label">Preview mode</p>
        <p className="text-sm text-ink-soft">
          {on ? "Posts go to Buffer as drafts. Nothing publishes." : "Posts publish for real through Buffer."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="preview-label"
        disabled={pending}
        onClick={() => start(() => setPreviewMode(!on))}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-board" : "bg-ink-soft/40"} disabled:opacity-50`}
      >
        <span className={`absolute top-1 size-6 rounded-full bg-chalk transition-all ${on ? "left-7" : "left-1"}`} />
      </button>
    </div>
  );
}

export function SoldOutList({ items }: { items: TodayItem[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; res: SoldOutResult } | null>(null);
  const [, start] = useTransition();

  if (items.length === 0) return <p className="text-ink-soft">Add menu items to use this.</p>;

  return (
    <div className="space-y-3">
      <div aria-live="polite" className="space-y-2">
        {result && !result.res.ok && <Notice tone="error">{result.res.message}</Notice>}
        {result && result.res.ok && (
          <>
            <Notice tone="ok">
              {result.name} marked sold out.{" "}
              {result.res.pulled.length
                ? `Pulled ${result.res.pulled.length} post${result.res.pulled.length === 1 ? "" : "s"} from Buffer: ${result.res.pulled.join(", ")}.`
                : "No posts about it were waiting today."}
            </Notice>
            {result.res.failed.map((f, i) => (
              <Notice key={i} tone="error">{f}</Notice>
            ))}
          </>
        )}
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {items.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <p className={`truncate font-semibold ${p.soldOut ? "text-ink-soft line-through" : ""}`}>{p.name}</p>
              {p.price && <p className="text-sm text-ink-soft">{p.price}</p>}
            </div>
            {p.soldOut ? (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setBusy(p.id);
                  start(async () => {
                    await clearSoldOut(p.id);
                    setBusy(null);
                  });
                }}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-3 text-sm font-semibold text-ink-soft hover:text-ink disabled:opacity-50"
              >
                <ArrowCounterClockwiseIcon size={16} aria-hidden /> Back in stock
              </button>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setBusy(p.id);
                  start(async () => {
                    setResult({ name: p.name, res: await markSoldOut(p.id) });
                    setBusy(null);
                  });
                }}
                className="inline-flex min-h-11 items-center gap-1 rounded-md border border-accent/50 px-3 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-50"
              >
                {busy === p.id ? <SpinnerGapIcon size={16} className="animate-spin" aria-hidden /> : <ProhibitIcon size={16} aria-hidden />}
                Sold out
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PostList({ posts }: { posts: TodayPost[] }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  return (
    <div className="space-y-3">
      {error && <Notice tone="error">{error}</Notice>}
      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="flex gap-3 rounded-md border border-line bg-white/50 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="" className="h-20 w-16 shrink-0 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.headline}</p>
              <p className="text-sm text-ink-soft">{p.when}</p>
              <p
                className={`text-sm font-semibold ${p.status === "error" ? "text-accent" : p.status === "pulled" ? "text-ink-soft" : "text-board"}`}
              >
                {STATUS_LABEL[p.status] ?? p.status}
                {p.status === "pulled" && p.reason ? ` · ${p.reason}` : ""}
              </p>
              {p.error && <p className="mt-1 text-sm text-accent">{p.error}</p>}
            </div>
            {p.canPull && (
              <button
                type="button"
                aria-label={`Remove ${p.headline} from Buffer`}
                disabled={busy !== null}
                onClick={() => {
                  setBusy(p.id);
                  start(async () => {
                    const res = await pullPost(p.id);
                    setError(res.error ?? "");
                    setBusy(null);
                  });
                }}
                className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-soft hover:text-accent disabled:opacity-50"
              >
                {busy === p.id ? <SpinnerGapIcon size={20} className="animate-spin" aria-hidden /> : <TrashIcon size={20} aria-hidden />}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
