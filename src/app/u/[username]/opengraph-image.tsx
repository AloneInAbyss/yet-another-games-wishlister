import { getUserByUsername } from "@/lib/accounts";
import { formatPrice } from "@/lib/format";
import { asJpeg, BrandMark, inlineImage, OG_COLORS, OG_SIZE, renderOgImage, SiteCard } from "@/lib/og";
import { getWishlist } from "@/lib/wishlist";

export const alt = "Lista de desejos no YAGW";
export const size = OG_SIZE;
export const contentType = "image/jpeg";
// Always reflect the current list (and never leak one that became private).
export const dynamic = "force-dynamic";

const TOP_GAMES = 3;

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const owner = await getUserByUsername((await params).username);
  if (!owner || !owner.username || !owner.listPublic) return asJpeg(await renderOgImage(<SiteCard />));

  const entries = await getWishlist(owner.id);
  const onSale = entries.filter((e) => e.game.discountPercent > 0).length;
  const top = entries.slice(0, TOP_GAMES);
  // Steam serves a bigger version of the same avatar under the "_full" name.
  const [avatar, ...covers] = await Promise.all([
    inlineImage(owner.avatarUrl?.replace("_medium.", "_full.") ?? null),
    ...top.map((e) => inlineImage(e.game.headerImage ?? e.game.capsuleImage)),
  ]);

  const image = await renderOgImage(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        {avatar && <img src={avatar} width={128} height={128} style={{ borderRadius: 24 }} alt="" />}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: avatar ? 900 : 1080 }}>
          <div style={{ display: "flex", fontSize: 32, color: OG_COLORS.muted }}>Lista de desejos de</div>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>
            {owner.displayName.length > 26 ? `${owner.displayName.slice(0, 25)}…` : owner.displayName}
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 30, marginTop: 8 }}>
            <span style={{ color: OG_COLORS.text }}>
              {entries.length} {entries.length === 1 ? "jogo" : "jogos"}
            </span>
            {onSale > 0 && <span style={{ color: OG_COLORS.saleText }}>· {onSale} em promoção</span>}
          </div>
        </div>
      </div>

      {top.length > 0 ? (
        <div style={{ display: "flex", gap: 24 }}>
          {top.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: "flex",
                position: "relative",
                width: 344,
                height: 161,
                borderRadius: 14,
                overflow: "hidden",
                background: OG_COLORS.surface,
                border: `2px solid ${OG_COLORS.border}`,
              }}
            >
              {covers[i] ? (
                <img src={covers[i]!} width={344} height={161} style={{ objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ display: "flex", padding: 20, fontSize: 28 }}>{e.game.name}</div>
              )}
              {e.game.discountPercent > 0 && e.game.priceFinal != null && (
                <div
                  style={{
                    position: "absolute",
                    right: 10,
                    bottom: 10,
                    display: "flex",
                    borderRadius: 8,
                    overflow: "hidden",
                    fontSize: 24,
                  }}
                >
                  <span
                    style={{
                      background: OG_COLORS.saleBg,
                      color: OG_COLORS.saleText,
                      padding: "4px 10px",
                      fontWeight: 600,
                    }}
                  >
                    -{e.game.discountPercent}%
                  </span>
                  <span style={{ background: "#1c2a12", color: OG_COLORS.saleText, padding: "4px 10px" }}>
                    {formatPrice(e.game.priceFinal)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", fontSize: 32, color: OG_COLORS.muted }}>A lista ainda está vazia.</div>
      )}

      <BrandMark size={40} />
    </div>,
  );
  return asJpeg(image);
}
