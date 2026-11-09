import type { ReactNode } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

export const btnPrimary =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 text-lg font-semibold text-accent-ink transition-colors hover:bg-[#a8441f] disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-ink/20 bg-white/50 px-4 font-semibold text-ink transition-colors hover:border-ink/50 disabled:cursor-not-allowed disabled:opacity-50";
export const btnBoard =
  "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-board px-5 text-lg font-semibold text-chalk transition-colors hover:bg-[#1a2621] disabled:cursor-not-allowed disabled:opacity-50";
export const field = "min-h-12 w-full rounded-md border border-line bg-white/60 px-4 text-base";
export const label = "mb-2 block font-semibold";

export function Notice({ tone, children }: { tone: "error" | "ok" | "info"; children: ReactNode }) {
  if (tone === "error") {
    return (
      <p role="alert" className="flex gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
        <WarningCircleIcon size={22} className="shrink-0 text-accent" aria-hidden />
        <span>{children}</span>
      </p>
    );
  }
  return (
    <p className="flex gap-2 rounded-md border border-board/30 bg-board/10 px-4 py-3">
      <CheckCircleIcon size={22} className="shrink-0 text-board" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 lg:mb-12">
      {eyebrow && <p className="mb-1 text-sm uppercase tracking-[0.18em] text-ink-soft">{eyebrow}</p>}
      <h1 className="font-display text-4xl leading-tight tracking-tight lg:text-5xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-ink-soft lg:text-lg">{children}</div>}
    </header>
  );
}
