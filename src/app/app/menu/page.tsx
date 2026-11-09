import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { requireShop } from "@/lib/identity";
import { isValidPublicId, previewImageUrl } from "@/lib/media/cloudinary";
import { listProducts, today } from "@/lib/shop";
import { MenuEditor } from "./menu-editor";

export default function MenuPage(props: PageProps<"/app/menu">) {
  return (
    <Suspense fallback={<p className="text-ink-soft">Loading your menu…</p>}>
      <Menu searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Menu({ searchParams }: { searchParams: PageProps<"/app/menu">["searchParams"] }) {
  const { shop } = await requireShop();
  const { welcome } = await searchParams;
  const items = await listProducts(shop.id);
  const date = today(shop);

  return (
    <>
      <PageHeader eyebrow={welcome ? "Step 2 of 2" : shop.name} title="Your menu">
        Snap your menu board and Chalk lists every item. Fix anything it got wrong.
      </PageHeader>
      <MenuEditor
        products={items.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          description: p.description,
          photoPublicId: p.photoPublicId ?? "",
          photoPreview: p.photoPublicId && isValidPublicId(p.photoPublicId) ? previewImageUrl(p.photoPublicId, 200) : "",
          soldOutToday: p.soldOutOn === date,
        }))}
        welcome={Boolean(welcome)}
      />
    </>
  );
}
