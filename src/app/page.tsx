import { Suspense } from "react";
import { ConnectButton } from "@/components/connect-button";

const ERRORS: Record<string, string> = {
  denied: "You cancelled the Buffer connection. Connect again whenever you're ready.",
  state: "That sign-in link expired or was already used. Please try connecting again.",
  token: "Buffer didn't accept the sign-in. Please try connecting again.",
  oauth: "Buffer returned an error during sign-in. Please try again.",
};

async function ErrorNotice({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error ? ERRORS[error] : undefined;
  if (!message) return null;
  return (
    <p role="alert" className="mb-8 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
      {message}
    </p>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-12 px-6 py-12 md:grid-cols-[1.1fr_1fr] md:items-center md:py-20">
      <section>
        <p className="mb-6 font-display text-2xl italic text-ink-soft">Chalk</p>
        <Suspense>
          <ErrorNotice searchParams={props.searchParams as Promise<{ error?: string }>} />
        </Suspense>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
          Today&apos;s special, on Instagram before the coffee cools.
        </h1>
        <p className="mt-6 max-w-md text-lg text-ink-soft">
          Snap the chalkboard or type the special. Chalk writes the post in your shop&apos;s voice,
          plans the week around the weather, and pulls posts the moment something sells out.
        </p>
        <div className="mt-10">
          <ConnectButton />
        </div>
        <p className="mt-4 text-sm text-ink-soft">
          Built on the Buffer API. Posts go to the channels you&apos;ve connected in Buffer.
        </p>
      </section>

      <figure
        aria-label="Example chalkboard special"
        className="relative rotate-[-1.5deg] rounded-sm border-[14px] border-[#6b4a2f] bg-board p-8 text-chalk shadow-[0_18px_40px_-18px_rgba(31,28,24,0.6)]"
      >
        <p className="font-display text-sm uppercase tracking-[0.2em] opacity-70">Today</p>
        <p className="mt-4 font-display text-4xl italic">Pumpkin loaf</p>
        <p className="mt-1 text-lg opacity-80">warm, with salted butter</p>
        <p className="mt-8 font-display text-3xl">$4</p>
        <p className="mt-1 text-sm opacity-70">until 2pm or sold out</p>
      </figure>
    </main>
  );
}
