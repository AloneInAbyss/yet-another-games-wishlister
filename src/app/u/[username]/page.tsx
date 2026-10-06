import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wishlist } from "@/components/Wishlist";
import { getSteamId, getUserByUsername } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { filtersFromParams } from "@/lib/filters";
import { getWishlist } from "@/lib/wishlist";

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const owner = await getUserByUsername((await params).username);
  return {
    title: owner ? `Lista de desejos de ${owner.displayName} · YAGW` : "YAGW",
    robots: { index: false, follow: false },
  };
}

export default async function UserListPage({ params, searchParams }: PageProps<"/u/[username]">) {
  const [{ username }, query, viewer] = await Promise.all([params, searchParams, getCurrentUser()]);
  const owner = await getUserByUsername(username);
  const isOwner = !!owner && viewer?.id === owner.id;
  // Private lists look exactly like missing ones to everyone else.
  if (!owner || !owner.username || (!owner.listPublic && !isOwner)) notFound();

  const [entries, steamId] = await Promise.all([getWishlist(owner.id), isOwner ? getSteamId(owner.id) : null]);
  return (
    <Wishlist
      entries={entries}
      owner={{
        username: owner.username,
        displayName: owner.displayName,
        avatarUrl: owner.avatarUrl,
        listPublic: owner.listPublic,
      }}
      isOwner={isOwner}
      viewerUsername={viewer?.username ?? null}
      steamConnected={!!steamId}
      initialFilters={filtersFromParams(query)}
      welcome={query.welcome === "1"}
      openImport={query.import === "1"}
    />
  );
}
