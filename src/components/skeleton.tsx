/** Placeholder shapes shown while server data or AI results load. */

export function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-ink/[0.07] ${className}`} />;
}

/** Wraps skeletons so screen readers hear one short status instead of empty boxes. */
export function Loading({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function HeaderBones() {
  return (
    <div className="mb-8 space-y-3 lg:mb-12">
      <Bone className="h-4 w-32" />
      <Bone className="h-10 w-64 lg:h-12 lg:w-80" />
      <Bone className="h-4 w-full max-w-md" />
    </div>
  );
}

function RowBones({ count, thumb = false }: { count: number; thumb?: boolean }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          {thumb && <Bone className="size-12 shrink-0" />}
          <div className="flex-1 space-y-2">
            <Bone className="h-4 w-2/5" />
            <Bone className="h-3 w-1/5" />
          </div>
          <Bone className="h-11 w-24 shrink-0" />
        </li>
      ))}
    </ul>
  );
}

export function TodaySkeleton() {
  return (
    <Loading label="Loading today">
      <HeaderBones />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
        <div className="space-y-10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Bone className="h-14" />
            <Bone className="h-14" />
          </div>
          <div className="space-y-3">
            <Bone className="h-7 w-36" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 rounded-md border border-line p-3">
                <Bone className="h-20 w-16 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Bone className="h-4 w-1/2" />
                  <Bone className="h-3 w-1/3" />
                  <Bone className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Bone className="h-20" />
          <Bone className="h-7 w-32" />
          <RowBones count={5} />
        </div>
      </div>
    </Loading>
  );
}

export function SnapSkeleton() {
  return (
    <Loading label="Loading">
      <HeaderBones />
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <Bone className="aspect-[4/5] w-full" />
        <div className="space-y-6 lg:pt-8">
          <Bone className="h-12" />
          <Bone className="h-14" />
        </div>
      </div>
    </Loading>
  );
}

/** Shown in place of the result while Gemini writes and the card renders. */
export function DraftSkeleton() {
  return (
    <Loading label="Writing your post. This takes about ten seconds." className="grid gap-6 lg:grid-cols-2 lg:gap-12">
      <div className="relative overflow-hidden rounded-md">
        <Bone className="aspect-[4/5] w-full rounded-none" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 bg-ink/[0.06] p-6">
          <Bone className="h-3 w-24" />
          <Bone className="h-8 w-3/5" />
          <Bone className="h-4 w-2/5" />
        </div>
      </div>
      <div className="space-y-3">
        <Bone className="h-5 w-48" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-11/12" />
        <Bone className="h-4 w-4/5" />
        <Bone className="mt-4 h-4 w-3/5" />
        <p className="pt-4 text-sm text-ink-soft">Reading the photo, writing the caption, making the image…</p>
      </div>
    </Loading>
  );
}

export function PlanSkeleton({ label = "Loading your week", note }: { label?: string; note?: string }) {
  return (
    <Loading label={label} className="max-w-4xl space-y-5">
      <Bone className="h-4 w-16" />
      <div className="overflow-hidden rounded-md border border-line lg:grid lg:grid-cols-[minmax(0,420px)_1fr]">
        <Bone className="aspect-[4/5] w-full rounded-none" />
        <div className="space-y-3 p-4 lg:p-8">
          <Bone className="h-6 w-48" />
          <Bone className="h-4 w-40" />
          <Bone className="mt-4 h-4 w-full" />
          <Bone className="h-4 w-11/12" />
          <Bone className="h-4 w-3/4" />
          {note && <p className="pt-4 text-sm text-ink-soft">{note}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:max-w-md">
        <Bone className="h-14" />
        <Bone className="h-14" />
      </div>
    </Loading>
  );
}

export function PlanPageSkeleton() {
  return (
    <>
      <HeaderBones />
      <PlanSkeleton />
    </>
  );
}

export function MenuSkeleton() {
  return (
    <Loading label="Loading your menu">
      <HeaderBones />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-14">
        <div className="space-y-4">
          <Bone className="aspect-[4/3] w-full" />
          <Bone className="h-14" />
        </div>
        <div className="space-y-4">
          <Bone className="h-7 w-28" />
          <RowBones count={6} thumb />
        </div>
      </div>
    </Loading>
  );
}

export function SetupSkeleton() {
  return (
    <Loading label="Loading">
      <HeaderBones />
      <div className="max-w-xl space-y-7">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Bone className="h-4 w-28" />
            <Bone className="h-12" />
          </div>
        ))}
        <Bone className="h-14" />
      </div>
    </Loading>
  );
}
