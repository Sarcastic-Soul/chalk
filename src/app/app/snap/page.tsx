import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/identity";
import { parseHours, usableChannels } from "@/lib/shop";
import { clampTime, localDate } from "@/lib/time";
import { SnapFlow } from "./snap-flow";

export default function SnapPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading…</p>}>
      <Snap />
    </Suspense>
  );
}

async function Snap() {
  const { shop } = await requireShop();
  const channels = usableChannels(shop);
  const { open, close } = parseHours(shop.hours);


  return (
    <>
      <PageHeader eyebrow="Today's special" title="Snap it, post it">
        One photo. Chalk reads it, writes the caption in your voice and makes the image.
      </PageHeader>
      <SnapFlow
        channels={channels.map((c) => ({ id: c.id, name: c.name, service: c.service }))}
        defaultChannelId={shop.defaultChannelId ?? channels[0]?.id ?? ""}
        previewMode={shop.previewMode}
        suggestedTime={laterToday(shop.timezone, open, close)}
      />
    </>
  );
}

/** One hour from now in the shop's timezone, kept inside opening hours. */
function laterToday(timeZone: string, open: string, close: string): string {
  const later = new Date(Date.now() + 3600000);
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(later);
  const sameDay = localDate(later, timeZone) === localDate(new Date(), timeZone);
  return sameDay ? clampTime(hhmm, open, close) : close;
}
