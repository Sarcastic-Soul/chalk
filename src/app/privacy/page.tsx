import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — Chalk" };

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:py-20">
      <Link href="/" className="font-display text-2xl italic text-ink-soft">
        Chalk
      </Link>
      <h1 className="mt-8 font-display text-4xl tracking-tight md:text-5xl">Privacy</h1>
      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink">
        <p>Chalk is a small hackathon project. It keeps only what it needs to make and publish your posts.</p>

        <h2>What Chalk stores</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Your Buffer account and organization IDs, and the list of channels Buffer returns.</li>
          <li>Your shop profile: name, city, hours, voice and brand colour.</li>
          <li>Your menu items, the photos you upload, and the posts Chalk drafts or schedules.</li>
        </ul>

        <h2>Buffer sign-in</h2>
        <p>
          You sign in through Buffer. Your Buffer access token is kept in an encrypted, HttpOnly cookie in your browser,
          not in our database. Chalk never sees your Buffer password.
        </p>

        <h2>Services Chalk uses</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>Buffer, to read your channels and to create, edit and delete posts.</li>
          <li>Google Gemini, to read menu photos and write captions. Photos and menu text are sent to it.</li>
          <li>Cloudinary, to host images. Buffer needs a public image link to post, so post images are public.</li>
          <li>Neon (database), Vercel (hosting), Open-Meteo (weather) and Nager.Date (public holidays).</li>
        </ul>

        <h2>What Chalk doesn&apos;t do</h2>
        <p>No ads, no tracking scripts, no selling data. Chalk doesn&apos;t read your followers, comments or messages.</p>

        <h2>Removing your data</h2>
        <p>
          &ldquo;Disconnect Buffer&rdquo; in Settings removes the sign-in cookie. You can also revoke Chalk in your
          Buffer settings at any time. To delete your shop, menu and posts from Chalk, email{" "}
          <a className="text-accent underline" href="mailto:anishisbusy@gmail.com">
            anishisbusy@gmail.com
          </a>
          .
        </p>

        <p className="text-sm">Built on the Buffer API. Not affiliated with or endorsed by Buffer.</p>
      </div>
    </main>
  );
}
