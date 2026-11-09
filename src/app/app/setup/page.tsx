import { Suspense } from "react";
import { SetupSkeleton } from "@/components/skeleton";
import { PageHeader } from "@/components/ui";
import { getShop, requireIdentity } from "@/lib/identity";
import { fetchChannels, parseHours } from "@/lib/shop";
import { AccountTools } from "./account-tools";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  return (
    <Suspense fallback={<SetupSkeleton />}>
      <Setup />
    </Suspense>
  );
}

async function Setup() {
  const identity = await requireIdentity();
  const shop = await getShop(identity.accountId);
  const channels = shop
    ? shop.channels.filter((c) => c.usable)
    : await fetchChannels(identity.session.accessToken, identity.orgId)
        .then((list) => list.filter((c) => c.usable))
        .catch(() => []);
  const hours = parseHours(shop?.hours ?? "");

  return (
    <>
      <PageHeader eyebrow={shop ? "Settings" : "Step 1 of 2"} title={shop ? "Your shop" : "Tell us about your shop"}>
        {shop ? null : "Two minutes, once. Chalk uses this to write posts that sound like you."}
      </PageHeader>
      <SetupForm
        isNew={!shop}
        channels={channels}
        defaults={{
          name: shop?.name ?? "",
          city: shop?.city ?? "",
          open: hours.open,
          close: hours.close,
          closedDays: shop?.closedDays ?? [],
          voice: shop?.voice ?? "",
          brandColor: shop?.brandColor ?? "#c2512f",
          currency: shop?.currency ?? "₹",
          defaultChannelId: shop?.defaultChannelId ?? channels.find((c) => c.service === "instagram")?.id ?? "",
        }}
      />
      {shop && <AccountTools channels={shop.channels} />}
    </>
  );
}
