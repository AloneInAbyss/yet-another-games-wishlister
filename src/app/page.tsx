import { Wishlist } from "@/components/Wishlist";
import { isAdmin } from "@/lib/auth";
import { filtersFromParams } from "@/lib/filters";
import { getWishlist } from "@/lib/wishlist";

export default async function Home({ searchParams }: PageProps<"/">) {
  const [entries, admin, params] = await Promise.all([getWishlist(), isAdmin(), searchParams]);
  return <Wishlist entries={entries} isAdmin={admin} initialFilters={filtersFromParams(params)} />;
}
