import { OG_SIZE, renderOgImage, SiteCard } from "@/lib/og";

export const alt = "YAGW: monte sua lista de desejos de jogos com preços da Steam";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return renderOgImage(<SiteCard />);
}
