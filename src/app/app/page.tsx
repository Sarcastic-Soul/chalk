import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BufferApiError } from "@/lib/buffer/client";
import { getAccount, getChannels, type Channel } from "@/lib/buffer/queries";
import { getSession } from "@/lib/session";
import { ConnectButton } from "@/components/connect-button";

export default function AppPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <header className="mb-10 flex items-center justify-between">
        <p className="font-display text-2xl italic">Chalk</p>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="min-h-11 rounded-md px-3 text-sm text-ink-soft underline-offset-4 hover:underline"
          >
            Disconnect
          </button>
        </form>
      </header>
      <Suspense fallback={<p className="text-ink-soft">Loading your Buffer channels…</p>}>
        <Workspace />
      </Suspense>
    </main>
  );
}

type WorkspaceData =
  | { kind: "ok"; orgName: string; channels: Channel[] }
  | { kind: "no-org" }
  | { kind: "expired" }
  | { kind: "error"; message: string };

async function loadWorkspace(accessToken: string): Promise<WorkspaceData> {
  try {
    const account = await getAccount(accessToken);
    const org = account.organizations[0];
    if (!org) return { kind: "no-org" };
    const channels = await getChannels(accessToken, org.id);
    return { kind: "ok", orgName: org.name, channels };
  } catch (err) {
    if (err instanceof BufferApiError && err.isUnauthorized) return { kind: "expired" };
    const message =
      err instanceof BufferApiError && err.isRateLimited
        ? `Buffer is busy right now${err.retryAfter ? `. Try again in ${Math.ceil(err.retryAfter / 60)} min` : ""}.`
        : "We couldn't reach Buffer. Please refresh in a moment.";
    return { kind: "error", message };
  }
}

async function Workspace() {
  const session = await getSession();
  if (!session) redirect("/");

  const data = await loadWorkspace(session.accessToken);

  switch (data.kind) {
    case "ok":
      return <ChannelList orgName={data.orgName} channels={data.channels} />;
    case "no-org":
      return <p>Your Buffer account has no organization yet. Open Buffer once, then come back.</p>;
    case "expired":
      return (
        <div>
          <p className="mb-6">Your Buffer connection has expired.</p>
          <ConnectButton label="Reconnect Buffer" />
        </div>
      );
    case "error":
      return (
        <p role="alert" className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3">
          {data.message}
        </p>
      );
  }
}

function ChannelList({ orgName, channels }: { orgName: string; channels: Channel[] }) {
  const usable = channels.filter((c) => !c.isDisconnected && !c.isLocked);
  const hasInstagram = usable.some((c) => c.service === "instagram");

  return (
    <section>
      <h1 className="font-display text-4xl tracking-tight">{orgName}</h1>
      <p className="mt-2 text-ink-soft">
        {usable.length === 0
          ? "No channels connected in Buffer yet."
          : `${usable.length} channel${usable.length === 1 ? "" : "s"} ready to post.`}
      </p>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {channels.map((c) => (
          <li key={c.id} className="flex items-center gap-4 py-4">
            {/* Remote avatar from the social network; size is fixed and small. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.avatar} alt="" width={40} height={40} className="size-10 rounded-full bg-paper-deep" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{c.displayName ?? c.name}</p>
              <p className="text-sm capitalize text-ink-soft">{c.service}</p>
            </div>
            {c.isDisconnected || c.isLocked ? (
              <span className="text-sm text-accent">{c.isLocked ? "Locked" : "Reconnect in Buffer"}</span>
            ) : null}
          </li>
        ))}
      </ul>

      {!hasInstagram && (
        <p className="mt-6 text-sm text-ink-soft">
          Tip: connect an Instagram professional account in Buffer to post specials.
        </p>
      )}
    </section>
  );
}
