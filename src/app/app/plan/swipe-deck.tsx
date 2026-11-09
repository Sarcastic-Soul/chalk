"use client";

import { useRef, useState, useTransition } from "react";
import { CheckIcon, PencilSimpleIcon, SparkleIcon, SpinnerGapIcon, XIcon } from "@phosphor-icons/react";
import { PlanSkeleton } from "@/components/skeleton";
import { btnPrimary, btnSecondary, field, Notice } from "@/components/ui";
import { decide, generatePlan } from "./actions";

export type Idea = {
  id: string;
  when: string;
  reason: string;
  caption: string;
  imageUrl: string;
  altText: string;
};

const THRESHOLD = 110;

export function SwipeDeck({ ideas, previewMode }: { ideas: Idea[]; previewMode: boolean }) {
  const [index, setIndex] = useState(0);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [dx, setDx] = useState(0);
  const [messages, setMessages] = useState<{ tone: "ok" | "error"; text: string }[]>([]);
  const [approved, setApproved] = useState(0);
  const [pending, start] = useTransition();
  const [planning, startPlan] = useTransition();
  const [planError, setPlanError] = useState("");
  const drag = useRef<{ x: number; id: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const idea = ideas[index];

  if (planning) {
    return (
      <PlanSkeleton
        label="Planning your week. This takes about fifteen seconds."
        note="Checking the forecast and holidays, matching your menu, writing captions, making images…"
      />
    );
  }

  function plan() {
    startPlan(async () => {
      setPlanError("");
      const res = await generatePlan();
      if (!res.ok) setPlanError(res.message);
      else {
        setIndex(0);
        setApproved(0);
        setMessages([]);
      }
    });
  }

  function choose(decision: "approve" | "skip") {
    if (!idea || pending) return;
    const current = idea;
    setEditing(false);
    setDx(decision === "approve" ? 500 : -500);
    start(async () => {
      const res = await decide({
        postId: current.id,
        decision,
        caption: captions[current.id] ?? undefined,
      });
      if (!res.ok) {
        setMessages((m) => [...m, { tone: "error", text: `${current.when}: ${res.message}` }]);
      } else if (decision === "approve") {
        setApproved((n) => n + 1);
        if (res.note) setMessages((m) => [...m, { tone: "error", text: `${current.when}: ${res.note}` }]);
      }
      setDx(0);
      setIndex((i) => i + 1);
    });
  }

  if (ideas.length === 0) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-ink-soft">
          Chalk looks at your menu, the next 7 days of weather and local holidays, and suggests one post a day.
          Swipe right to schedule it in Buffer, left to skip.
        </p>
        {planError && <Notice tone="error">{planError}</Notice>}
        <button type="button" className={btnPrimary} onClick={plan} disabled={planning}>
          {planning ? <SpinnerGapIcon size={20} className="animate-spin" aria-hidden /> : <SparkleIcon size={20} aria-hidden />}
          {planning ? "Planning your week…" : "Plan my week"}
        </button>
      </div>
    );
  }

  if (!idea) {
    return (
      <div className="max-w-xl space-y-4" aria-live="polite">
        <Notice tone="ok">
          {approved === 0
            ? "You skipped them all. Plan again for new ideas."
            : `${approved} post${approved === 1 ? "" : "s"} ${previewMode ? "saved as Buffer drafts" : "scheduled in Buffer"}.`}
        </Notice>
        {messages.map((m, i) => (
          <Notice key={i} tone={m.tone}>{m.text}</Notice>
        ))}
        {planError && <Notice tone="error">{planError}</Notice>}
        <button type="button" className={`${btnSecondary} w-full`} onClick={plan} disabled={planning}>
          {planning && <SpinnerGapIcon size={18} className="animate-spin" aria-hidden />} Plan again
        </button>
      </div>
    );
  }

  const caption = captions[idea.id] ?? idea.caption;
  const tilt = dx / 25;

  return (
    <div className="max-w-4xl space-y-5">
      <p className="text-sm text-ink-soft" aria-live="polite">
        {index + 1} of {ideas.length}
      </p>

      <article
        aria-label={`Idea for ${idea.when}`}
        className="touch-pan-y select-none overflow-hidden rounded-md border border-line bg-white/60 shadow-sm lg:grid lg:grid-cols-[minmax(0,420px)_1fr]"
        style={{
          transform: `translateX(${dx}px) rotate(${tilt}deg)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
        onPointerDown={(e) => {
          if (editing || (e.target as HTMLElement).closest("button,textarea")) return;
          drag.current = { x: e.clientX, id: e.pointerId };
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x);
        }}
        onPointerUp={() => {
          if (!drag.current) return;
          drag.current = null;
          setDragging(false);
          if (dx > THRESHOLD) choose("approve");
          else if (dx < -THRESHOLD) choose("skip");
          else setDx(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={idea.imageUrl} alt={idea.altText} draggable={false} className="aspect-[4/5] w-full object-cover" />
          {dx !== 0 && (
            <span
              aria-hidden
              className={`absolute top-5 rounded-md border-4 px-3 py-1 font-display text-3xl ${dx > 0 ? "left-5 border-board bg-board/80 text-chalk" : "right-5 border-accent bg-accent/80 text-accent-ink"}`}
              style={{ opacity: Math.min(Math.abs(dx) / THRESHOLD, 1) }}
            >
              {dx > 0 ? "Post" : "Skip"}
            </span>
          )}
        </div>
        <div className="space-y-2 p-4 lg:p-8">
          <p className="font-semibold lg:font-display lg:text-2xl">{idea.when}</p>
          {idea.reason && <p className="text-sm text-ink-soft">{idea.reason}</p>}
          {editing ? (
            <>
              <label htmlFor="plan-caption" className="sr-only">Caption</label>
              <textarea
                id="plan-caption"
                rows={6}
                maxLength={2200}
                value={caption}
                onChange={(e) => setCaptions((c) => ({ ...c, [idea.id]: e.target.value }))}
                className={`${field} py-3`}
              />
            </>
          ) : (
            <p className="whitespace-pre-line text-sm lg:text-base">{caption}</p>
          )}
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline"
            onClick={() => setEditing((e) => !e)}
          >
            <PencilSimpleIcon size={16} aria-hidden /> {editing ? "Done editing" : "Edit caption"}
          </button>
        </div>
      </article>

      <div className="grid grid-cols-2 gap-3 lg:max-w-md">
        <button type="button" className={`${btnSecondary} min-h-14`} onClick={() => choose("skip")} disabled={pending}>
          <XIcon size={20} aria-hidden /> Skip
        </button>
        <button
          type="button"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-md bg-board px-4 font-semibold text-chalk hover:bg-[#1a2621] disabled:opacity-50"
          onClick={() => choose("approve")}
          disabled={pending}
        >
          {pending ? <SpinnerGapIcon size={20} className="animate-spin" aria-hidden /> : <CheckIcon size={20} aria-hidden />}
          {previewMode ? "Draft it" : "Schedule"}
        </button>
      </div>

      {messages.map((m, i) => (
        <Notice key={i} tone={m.tone}>{m.text}</Notice>
      ))}
    </div>
  );
}
