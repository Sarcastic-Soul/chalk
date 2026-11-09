import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { getAccount, getChannels } from "@/lib/buffer/queries";
import { getSession } from "@/lib/session";
import { ComposeForm, type ChannelOption } from "./compose-form";

export default function ComposePage() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link
        href="/app"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-ink-soft hover:text-ink"
      >
        <ArrowLeftIcon size={18} aria-hidden /> Back
      </Link>
      <h1 className="mb-8 font-display text-4xl tracking-tight">New post</h1>
      <Suspense fallback={<p className="text-ink-soft">Loading your channels…</p>}>
        <Composer />
      </Suspense>
    </main>
  );
}

async function loadChannels(accessToken: string): Promise<ChannelOption[] | null> {
  try {
    const account = await getAccount(accessToken);
    const lists = await Promise.all(account.organizations.map((o) => getChannels(accessToken, o.id)));
    return lists
      .flat()
      .filter((c) => !c.isDisconnected && !c.isLocked)
      .map((c) => ({ id: c.id, label: c.displayName ?? c.name, service: c.service }));
  } catch {
    return null;
  }
}

async function Composer() {
  const session = await getSession();
  if (!session) redirect("/");

  const channels = await loadChannels(session.accessToken);
  if (channels === null) {
    return (
      <p role="alert" className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
        We couldn&apos;t reach Buffer. Please refresh in a moment.
      </p>
    );
  }
  if (channels.length === 0) {
    return <p>Connect a channel in Buffer first, then come back.</p>;
  }
  return <ComposeForm channels={channels} />;
}
