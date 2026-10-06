import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { BRAND_GRADIENT, HEART_PATH } from "./brand";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_COLORS = {
  bg: "#0b1118",
  surface: "#121b26",
  border: "#263649",
  text: "#e4ebf2",
  muted: "#8a9bb0",
  accent: "#66c0f4",
  saleBg: "#4c6b22",
  saleText: "#beee11",
};

// Fonts don't depend on the request, so they are read once per server instance.
const fonts = Promise.all([
  readFile(join(process.cwd(), "assets/fonts/Geist-Regular.ttf")),
  readFile(join(process.cwd(), "assets/fonts/Geist-SemiBold.ttf")),
]).then(([regular, semibold]) => [
  { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
  { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
]);

export async function renderOgImage(content: ReactNode) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 56,
        background: OG_COLORS.bg,
        color: OG_COLORS.text,
        fontFamily: "Geist",
      }}
    >
      {content}
    </div>,
    { ...OG_SIZE, fonts: await fonts },
  );
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.22,
          background: BRAND_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24">
          <path d={HEART_PATH} fill="#fff" />
        </svg>
      </div>
      <div style={{ display: "flex", fontSize: size * 0.6, fontWeight: 600, color: OG_COLORS.accent }}>
        Yet Another Games Wishlister
      </div>
    </div>
  );
}

/**
 * Re-encodes a generated image as JPEG. Previews with game covers are ~500 KB as PNG, too
 * big for some apps (WhatsApp skips large previews); as JPEG they are a fraction of that.
 */
export async function asJpeg(image: Response): Promise<Response> {
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(Buffer.from(await image.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=0, must-revalidate" },
  });
}

/**
 * Downloads an image and inlines it as a data URL, so one broken Steam image can't break
 * the whole preview. Returns null when the image can't be fetched quickly.
 */
export async function inlineImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

const FEATURES = ["Preços da Steam todo dia", "Filtros por preço, nota e tags", "Prioridade do seu jeito"];

/** The generic YAGW card, used for the home page and for lists that can't be shown. */
export function SiteCard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
      <BrandMark size={52} />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: -2 }}>
          Sua lista de desejos de jogos, do seu jeito.
        </div>
        <div style={{ display: "flex", fontSize: 32, color: OG_COLORS.muted }}>
          Monte a sua, acompanhe as promoções e mande o link para os amigos.
        </div>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {FEATURES.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              padding: "10px 20px",
              borderRadius: 999,
              border: `2px solid ${OG_COLORS.border}`,
              background: OG_COLORS.surface,
              fontSize: 24,
              color: OG_COLORS.text,
            }}
          >
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
