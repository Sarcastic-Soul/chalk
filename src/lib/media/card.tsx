import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

export type CardProps = {
  shopName: string;
  brandColor: string;
  headline: string;
  detail: string;
  price: string;
  until: string;
  /** Public photo URL. Without one, the card is a chalkboard text card. */
  photoUrl?: string | null;
};

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" }[]> | undefined;

function loadFonts() {
  fonts ??= Promise.all(
    [
      ["Fraunces", "Fraunces-600.ttf", 600],
      ["Manrope", "Manrope-500.ttf", 500],
      ["Manrope", "Manrope-700.ttf", 700],
    ].map(async ([name, file, weight]) => ({
      name: name as string,
      data: await readFile(join(process.cwd(), "assets/fonts", file as string)),
      weight: weight as 500 | 600 | 700,
      style: "normal" as const,
    })),
  );
  return fonts;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function safeColor(color: string): string {
  return HEX.test(color) ? color : "#c2512f";
}

/** Readable text color on top of the brand color. */
export function inkOn(hex: string): string {
  const n = parseInt(safeColor(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#1f1c18" : "#fbf6ef";
}

/** Branded 4:5 post image. Rendered with Satori, so flexbox only. */
export async function renderCard(p: CardProps): Promise<ImageResponse> {
  const brand = safeColor(p.brandColor);
  const ink = inkOn(brand);
  const meta = [p.price, p.until].filter(Boolean).join("  ·  ");

  const body = p.photoUrl ? (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#1f1c18" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.photoUrl}
        alt=""
        width={CARD_WIDTH}
        height={1010}
        style={{ width: CARD_WIDTH, height: 1010, objectFit: "cover" }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          height: 340,
          padding: "0 72px",
          background: brand,
          color: ink,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 700, fontSize: 26, letterSpacing: 4, opacity: 0.8 }}>
          {p.shopName.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 84, lineHeight: 1.05, marginTop: 14 }}>
          {p.headline}
        </div>
        {(p.detail || meta) && (
          <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 500, fontSize: 34, marginTop: 16, opacity: 0.92 }}>
            {[p.detail, meta].filter(Boolean).join("  ·  ")}
          </div>
        )}
      </div>
    </div>
  ) : (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 40,
        background: "#6b4a2f",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#23312b",
          color: "#f1ede4",
          textAlign: "center",
          padding: 60,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 700, fontSize: 30, letterSpacing: 8, opacity: 0.75 }}>
          TODAY AT {p.shopName.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 120, lineHeight: 1.05, marginTop: 60 }}>
          {p.headline}
        </div>
        {p.detail && (
          <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 500, fontSize: 44, marginTop: 30, opacity: 0.85 }}>
            {p.detail}
          </div>
        )}
        {p.price && (
          <div style={{ display: "flex", fontFamily: "Fraunces", fontSize: 96, marginTop: 70, color: brand === "#23312b" ? "#f3c9a0" : lighten(brand) }}>
            {p.price}
          </div>
        )}
        {p.until && (
          <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 500, fontSize: 38, marginTop: 30, opacity: 0.75 }}>
            {p.until}
          </div>
        )}
      </div>
    </div>
  );

  return new ImageResponse(body, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts: await loadFonts() });
}

/** Mix the brand color toward white so it reads on the dark board. */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.45);
  const [r, g, b] = [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)];
  return `rgb(${r}, ${g}, ${b})`;
}
