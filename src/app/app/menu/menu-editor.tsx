"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ImageIcon, PencilSimpleIcon, PlusIcon, SpinnerGapIcon, TrashIcon } from "@phosphor-icons/react";
import { PhotoPicker } from "@/components/photo-picker";
import { Bone, Loading } from "@/components/skeleton";
import { btnPrimary, btnSecondary, field, label, Notice } from "@/components/ui";
import { deleteProduct, importMenu, saveProduct, type ImportState } from "./actions";

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  photoPublicId: string;
  photoPreview: string;
  soldOutToday: boolean;
};

const EMPTY: Omit<MenuItem, "id" | "photoPreview" | "soldOutToday"> = {
  name: "",
  category: "",
  price: "",
  description: "",
  photoPublicId: "",
};

export function MenuEditor({ products, welcome }: { products: MenuItem[]; welcome: boolean }) {
  const [menuPhoto, setMenuPhoto] = useState("");
  const [result, setResult] = useState<ImportState>({ status: "idle" });
  const [importing, startImport] = useTransition();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  const groups = new Map<string, MenuItem[]>();
  for (const p of products) {
    const key = p.category || "Other";
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-start lg:gap-14">
      <section className="space-y-4 lg:sticky lg:top-12">
        <PhotoPicker
          label="Menu photo"
          hint="Tap to snap your menu or price board"
          aspect="aspect-[4/3]"
          onReady={setMenuPhoto}
          onClear={() => setMenuPhoto("")}
        />
        <button
          type="button"
          className={btnPrimary}
          disabled={!menuPhoto || importing}
          onClick={() => startImport(async () => setResult(await importMenu(menuPhoto)))}
        >
          {importing && <SpinnerGapIcon size={20} className="animate-spin" aria-hidden />}
          {importing ? "Reading the menu…" : "Read my menu"}
        </button>
        <div aria-live="polite">
          {result.status === "error" && <Notice tone="error">{result.message}</Notice>}
          {result.status === "done" && (
            <Notice tone="ok">
              Added {result.added} item{result.added === 1 ? "" : "s"}
              {result.skipped ? `, skipped ${result.skipped} already on your list` : ""}.
            </Notice>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-2xl">{products.length} items</h2>
          <button type="button" className={btnSecondary} onClick={() => setEditing("new")}>
            <PlusIcon size={18} aria-hidden /> Add
          </button>
        </div>

        {editing === "new" && <ItemForm item={{ ...EMPTY, photoPreview: "" }} onDone={() => setEditing(null)} />}

        {importing && (
          <Loading label="Reading the menu" className="mt-4">
            <ul className="divide-y divide-line border-y border-line">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <Bone className="size-12 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Bone className="h-4 w-2/5" />
                    <Bone className="h-3 w-1/5" />
                  </div>
                </li>
              ))}
            </ul>
          </Loading>
        )}

        {products.length === 0 && editing !== "new" && !importing && (
          <p className="text-ink-soft">Nothing yet. Read a menu photo above or add items by hand.</p>
        )}

        {[...groups].map(([category, items]) => (
          <div key={category} className="mt-6">
            <h3 className="mb-1 text-sm uppercase tracking-[0.18em] text-ink-soft">{category}</h3>
            <ul className="divide-y divide-line border-y border-line xl:grid xl:grid-cols-2 xl:gap-x-8 xl:divide-y-0 xl:border-b-0 xl:[&>li]:border-b xl:[&>li]:border-line">
              {items.map((p) =>
                editing === p.id ? (
                  <li key={p.id} className="py-4">
                    <ItemForm item={p} onDone={() => setEditing(null)} />
                  </li>
                ) : (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    {p.photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoPreview} alt="" className="size-12 rounded-md object-cover" />
                    ) : (
                      <span className="flex size-12 items-center justify-center rounded-md bg-paper-deep text-ink-soft">
                        <ImageIcon size={20} aria-hidden />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {p.name}
                        {p.soldOutToday && <span className="ml-2 text-sm font-normal text-accent">Sold out today</span>}
                      </p>
                      <p className="truncate text-sm text-ink-soft">
                        {[p.price, p.description].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Edit ${p.name}`}
                      className="flex size-11 items-center justify-center rounded-md text-ink-soft hover:text-ink"
                      onClick={() => setEditing(p.id)}
                    >
                      <PencilSimpleIcon size={20} aria-hidden />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </section>

      {(welcome || products.length > 0) && (
        <Link href="/app" className={`${btnPrimary} lg:col-start-2 lg:max-w-sm`}>
          {welcome ? "Done, show me today" : "Back to today"}
        </Link>
      )}
    </div>
  );
}

function ItemForm({
  item,
  onDone,
}: {
  item: Omit<MenuItem, "id" | "soldOutToday"> & { id?: string };
  onDone: () => void;
}) {
  const [values, setValues] = useState(item);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const key = item.id ?? "new";

  return (
    <form
      className="space-y-4 rounded-md border border-line bg-paper-deep p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveProduct({
            id: item.id,
            name: values.name,
            category: values.category,
            price: values.price,
            description: values.description,
            photoPublicId: values.photoPublicId,
          });
          if (res.error) setError(res.error);
          else onDone();
        });
      }}
    >
      <div>
        <label htmlFor={`name-${key}`} className={label}>Name</label>
        <input id={`name-${key}`} required value={values.name} onChange={set("name")} className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`cat-${key}`} className={label}>Section</label>
          <input id={`cat-${key}`} value={values.category} onChange={set("category")} className={field} placeholder="Coffee" />
        </div>
        <div>
          <label htmlFor={`price-${key}`} className={label}>Price</label>
          <input id={`price-${key}`} value={values.price} onChange={set("price")} className={field} placeholder="$5.50" />
        </div>
      </div>
      <div>
        <label htmlFor={`desc-${key}`} className={label}>Short note</label>
        <input id={`desc-${key}`} value={values.description} onChange={set("description")} className={field} />
      </div>
      <PhotoPicker
        label="Photo (used in planned posts)"
        aspect="aspect-[4/3]"
        initialPreview={item.photoPreview || undefined}
        onReady={(publicId) => setValues((v) => ({ ...v, photoPublicId: publicId }))}
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={`${btnSecondary} flex-1 border-ink bg-ink text-chalk hover:bg-ink/90`}>
          {pending && <SpinnerGapIcon size={18} className="animate-spin" aria-hidden />} Save
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>Cancel</button>
        {item.id && (
          <button
            type="button"
            aria-label="Delete item"
            disabled={pending}
            className={btnSecondary}
            onClick={() => start(async () => { await deleteProduct(item.id!); onDone(); })}
          >
            <TrashIcon size={18} aria-hidden />
          </button>
        )}
      </div>
    </form>
  );
}
