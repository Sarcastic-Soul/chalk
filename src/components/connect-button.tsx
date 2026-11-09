import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

export function ConnectButton({ label = "Connect your Buffer account" }: { label?: string }) {
  return (
    // Plain link, not <Link>: the route redirects off-site to Buffer.
    <a
      href="/api/auth/buffer/login"
      className="inline-flex min-h-12 items-center gap-3 rounded-md bg-accent px-6 text-base font-semibold text-accent-ink transition-colors hover:bg-[#a8441f]"
    >
      {label}
      <ArrowRightIcon size={20} weight="bold" aria-hidden />
    </a>
  );
}
