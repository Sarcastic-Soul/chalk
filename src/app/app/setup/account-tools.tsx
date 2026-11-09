"use client";

import { useState, useTransition } from "react";
import { ArrowsClockwiseIcon, SignOutIcon, SpinnerGapIcon } from "@phosphor-icons/react";
import { btnSecondary, Notice } from "@/components/ui";
import { refreshChannels } from "../today-actions";

export function AccountTools({ channels }: { channels: { id: string; name: string; service: string; usable: boolean }[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  return (
    <section className="mt-12 space-y-4 border-t border-line pt-8">
      <h2 className="font-display text-2xl">Buffer channels</h2>
      <ul className="space-y-1 text-sm">
        {channels.map((c) => (
          <li key={c.id} className="flex justify-between gap-2">
            <span className="truncate">{c.name} <span className="capitalize text-ink-soft">· {c.service}</span></span>
            {!c.usable && <span className="text-accent">Reconnect in Buffer</span>}
          </li>
        ))}
        {channels.length === 0 && <li className="text-ink-soft">None yet.</li>}
      </ul>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={btnSecondary}
          disabled={pending}
          onClick={() => start(async () => setError((await refreshChannels()).error ?? ""))}
        >
          {pending ? <SpinnerGapIcon size={18} className="animate-spin" aria-hidden /> : <ArrowsClockwiseIcon size={18} aria-hidden />}
          Refresh channels
        </button>
        <form action="/api/auth/logout" method="post">
          <button type="submit" className={btnSecondary}>
            <SignOutIcon size={18} aria-hidden /> Disconnect Buffer
          </button>
        </form>
      </div>
    </section>
  );
}
