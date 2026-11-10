"use client";

import { useActionState, useState } from "react";
import { SpinnerGapIcon, StorefrontIcon } from "@phosphor-icons/react";
import { btnPrimary, btnSecondary, field, label, Notice } from "@/components/ui";
import { submitSetup, useDemoShop, type SetupState } from "./actions";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SWATCHES = ["#c2512f", "#23312b", "#7a3b5e", "#b8862b", "#2f5d73", "#1f1c18"];

export type SetupDefaults = {
  name: string;
  city: string;
  open: string;
  close: string;
  closedDays: number[];
  voice: string;
  brandColor: string;
  currency: string;
  defaultChannelId: string;
};

export function SetupForm({
  defaults,
  channels,
  isNew,
}: {
  defaults: SetupDefaults;
  channels: { id: string; name: string; service: string }[];
  isNew: boolean;
}) {
  const [state, action, pending] = useActionState<SetupState, FormData>(submitSetup, { status: "idle" });
  const [demoState, demoAction, demoPending] = useActionState<SetupState>(useDemoShop, { status: "idle" });
  const [color, setColor] = useState(defaults.brandColor);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-14">
      {isNew && (
        <form action={demoAction} className="rounded-md border border-line bg-paper-deep p-5 lg:sticky lg:top-12 lg:order-2">
          <p className="font-semibold">Just looking around?</p>
          <p className="mt-1 text-sm text-ink-soft">
            Load Frozen Cashew, a demo café in Melbourne with a full menu and photos. Posts stay as Buffer
            drafts until you turn preview off.
          </p>
          <button type="submit" disabled={demoPending} className={`${btnSecondary} mt-4 w-full`}>
            {demoPending ? <SpinnerGapIcon size={18} className="animate-spin" aria-hidden /> : <StorefrontIcon size={18} aria-hidden />}
            Use the demo café
          </button>
          {demoState.status === "error" && <div className="mt-3"><Notice tone="error">{demoState.message}</Notice></div>}
        </form>
      )}

      <form action={action} className="max-w-xl space-y-7">
        <div>
          <label htmlFor="name" className={label}>Shop name</label>
          <input id="name" name="name" required defaultValue={defaults.name} className={field} autoComplete="organization" />
        </div>

        <div>
          <label htmlFor="city" className={label}>City</label>
          <input id="city" name="city" required defaultValue={defaults.city} className={field} autoComplete="address-level2" />
          <p className="mt-1 text-sm text-ink-soft">Used for the weather and local holidays in your weekly plan.</p>
        </div>

        <fieldset>
          <legend className={label}>Opening hours</legend>
          <div className="flex items-center gap-3">
            <label className="sr-only" htmlFor="open">Opens</label>
            <input id="open" name="open" type="time" required defaultValue={defaults.open} className={field} />
            <span aria-hidden>to</span>
            <label className="sr-only" htmlFor="close">Closes</label>
            <input id="close" name="close" type="time" required defaultValue={defaults.close} className={field} />
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>Closed on</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label
                key={d}
                className="flex min-h-11 min-w-12 cursor-pointer items-center justify-center rounded-md border border-line px-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-chalk"
              >
                <input type="checkbox" name="closedDays" value={i} defaultChecked={defaults.closedDays.includes(i)} className="sr-only" />
                {d}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="voice" className={label}>How does your shop sound?</label>
          <textarea id="voice" name="voice" rows={3} required defaultValue={defaults.voice} className={`${field} py-3`} />
          <p className="mt-1 text-sm text-ink-soft">A few words, like &ldquo;warm, a bit cheeky, short sentences&rdquo;.</p>
        </div>

        <fieldset>
          <legend className={label}>Brand color</legend>
          <div className="flex flex-wrap items-center gap-3">
            {SWATCHES.map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="swatch" value={s} checked={color === s} onChange={() => setColor(s)} className="peer sr-only" />
                <span
                  className="block size-11 rounded-full border-2 border-paper ring-2 ring-transparent peer-checked:ring-ink peer-focus-visible:ring-accent"
                  style={{ background: s }}
                />
                <span className="sr-only">{s}</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-11 cursor-pointer rounded-md border border-line bg-transparent" />
              Custom
            </label>
            <input type="hidden" name="brandColor" value={color} />
          </div>
        </fieldset>

        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <div>
            <label htmlFor="currency" className={label}>Currency</label>
            <input id="currency" name="currency" maxLength={4} defaultValue={defaults.currency} className={field} />
          </div>
          {channels.length > 0 && (
            <div>
              <label htmlFor="defaultChannelId" className={label}>Post to</label>
              <select id="defaultChannelId" name="defaultChannelId" defaultValue={defaults.defaultChannelId} className={field}>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.service}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {state.status === "error" && <Notice tone="error">{state.message}</Notice>}

        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending && <SpinnerGapIcon size={20} className="animate-spin" aria-hidden />}
          {isNew ? "Save and add my menu" : "Save"}
        </button>
      </form>
    </div>
  );
}
