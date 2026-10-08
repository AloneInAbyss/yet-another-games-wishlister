"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import type { Game } from "@/db/schema";
import { EARLY_ACCESS_TAG_ID, formatHours, formatPrice, reviewLabel, reviewTone, storeUrl } from "@/lib/format";
import type { WishlistEntry } from "@/lib/wishlist";
import type { CollectionInfo } from "@/lib/collections";
import { CollectionPill } from "./CollectionChips";
import { CollectionMenu } from "./CollectionMenu";
import { ClockIcon, GripIcon, PencilIcon, RefreshIcon, TopIcon, TrashIcon, UndoIcon } from "./Icons";

export type RowActions = {
  onEdit: (entry: WishlistEntry) => void;
  onMoveToTop: (entry: WishlistEntry) => void;
  onSetRank: (entry: WishlistEntry, rank: number) => void;
  onRefresh: (entry: WishlistEntry) => void;
  onRemove: (entry: WishlistEntry) => void;
  onRestore: (entry: WishlistEntry) => void;
  onToggleCollection: (entry: WishlistEntry, collectionId: number, member: boolean) => void;
  /** Creates a collection and puts this game in it. Resolves to whether it worked. */
  onCreateCollection: (entry: WishlistEntry, name: string) => Promise<boolean>;
  onManageCollections: () => void;
};

type Props = {
  entry: WishlistEntry;
  rank: number;
  total: number;
  showRank: boolean;
  highlighted: boolean;
  /** Removed in this visit: shown faded in place, with a button to restore it. */
  removed: boolean;
  draggable: boolean;
  isOwner: boolean;
  busy: boolean;
  /** All collections of the list owner, to show this game's ones by name and color. */
  collections: CollectionInfo[];
  actions: RowActions;
};

const toneClass = {
  positive: "text-positive",
  mixed: "text-mixed",
  negative: "text-negative",
  none: "text-muted",
} as const;

const TAGS_IN_ROW = 5;

/** The priority number. For the owner it is a button that turns into an input to type a new position. */
function Rank({
  rank,
  total,
  editable,
  onSubmit,
  prefix = "",
  className,
}: {
  rank: number;
  total: number;
  editable: boolean;
  onSubmit: (rank: number) => void;
  prefix?: string;
  className: string;
}) {
  const [editing, setEditing] = useState(false);
  if (!editable) return <span className={className}>{prefix + rank}</span>;
  if (editing) {
    const commit = (value: string) => {
      setEditing(false);
      const n = Math.round(Number(value));
      if (Number.isFinite(n) && value.trim() !== "" && n !== rank) onSubmit(Math.min(Math.max(n, 1), total));
    };
    return (
      <input
        type="number"
        min={1}
        max={total}
        defaultValue={rank}
        autoFocus
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value);
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label={`Nova posição (1 a ${total})`}
        className="w-14 shrink-0 rounded border border-accent bg-bg px-1 py-0.5 text-center font-mono text-sm outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Clique para digitar a posição"
      aria-label={`Posição ${rank}. Clique para mudar`}
      className={`${className} cursor-text rounded hover:bg-surface-3 hover:text-text`}
    >
      {prefix + rank}
    </button>
  );
}

function Price({ game }: { game: Game }) {
  if (game.isFree) return <span className="text-sm">Gratuito</span>;
  if (game.priceFinal == null) {
    return <span className="text-sm text-muted">{game.comingSoon ? "Em breve" : "Sem preço"}</span>;
  }
  return (
    <div className="flex items-stretch overflow-hidden rounded">
      {game.discountPercent > 0 && (
        <span className="flex items-center bg-sale-bg px-1.5 text-base font-semibold text-sale-text">
          -{game.discountPercent}%
        </span>
      )}
      <div
        className={`flex flex-col items-end justify-center px-2 py-0.5 leading-tight ${
          game.discountPercent > 0 ? "bg-sale-bg/40" : "bg-surface-3"
        }`}
      >
        {game.discountPercent > 0 && game.priceInitial != null && (
          <span className="text-[11px] text-muted line-through">{formatPrice(game.priceInitial)}</span>
        )}
        <span className={`text-sm ${game.discountPercent > 0 ? "text-sale-text" : ""}`}>
          {formatPrice(game.priceFinal)}
        </span>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded p-1.5 text-muted transition-colors hover:bg-surface-3 ${danger ? "hover:text-danger" : "hover:text-text"}`}
    >
      {children}
    </button>
  );
}

export function GameRow({
  entry,
  rank,
  total,
  showRank,
  highlighted,
  removed,
  draggable,
  isOwner,
  busy,
  collections,
  actions,
}: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: !draggable || removed,
  });
  const { game } = entry;
  const pct = game.reviewPercent;
  const release = game.releaseDateText;
  const setRank = (n: number) => actions.onSetRank(entry, n);
  const myCollections = collections.filter((c) => entry.collectionIds.includes(c.id));

  return (
    <li
      ref={setNodeRef}
      id={`item-${entry.id}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group relative flex gap-3 rounded-lg border bg-surface p-2 sm:items-center sm:p-2.5 ${
        isDragging
          ? "z-10 border-accent shadow-2xl shadow-black/50"
          : highlighted
            ? "border-accent"
            : removed
              ? "border-dashed border-border"
              : "border-border"
      } ${busy ? "opacity-60" : ""} transition-colors duration-700`}
    >
      {draggable && removed && (
        <span aria-hidden="true" className="-mx-1 flex items-center self-stretch px-1 text-transparent">
          <GripIcon />
        </span>
      )}
      {draggable && !removed && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${game.name}`}
          className="-mx-1 flex cursor-grab touch-none items-center self-stretch px-1 text-muted hover:text-text active:cursor-grabbing"
        >
          <GripIcon />
        </button>
      )}
      {showRank && (
        <div className="hidden w-14 shrink-0 justify-end sm:flex">
          {!removed && (
            <Rank
              rank={rank}
              total={total}
              editable={isOwner}
              onSubmit={setRank}
              className="px-1.5 py-0.5 text-right font-mono text-sm text-muted tabular-nums"
            />
          )}
        </div>
      )}

      {/* Mobile: cover and price side by side, text on the line below. Desktop (sm): one row as before. */}
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 sm:flex sm:items-center sm:gap-4">
        <a
          href={storeUrl(game.appId)}
          target="_blank"
          rel="noreferrer"
          className={`col-start-1 row-start-1 block sm:-mr-1 sm:shrink-0 ${removed ? "opacity-40 grayscale" : ""}`}
        >
          {/* The wider header image keeps the bigger mobile cover sharp; desktop uses the small capsule. */}
          <picture className="block">
            {game.capsuleImage && <source media="(min-width: 640px)" srcSet={game.capsuleImage} />}
            <img
              src={game.headerImage ?? game.capsuleImage ?? ""}
              alt=""
              loading="lazy"
              className="aspect-[460/215] w-full rounded bg-surface-3 object-cover sm:aspect-[231/87] sm:w-44"
            />
          </picture>
        </a>
        <div className={`col-span-2 row-start-2 min-w-0 space-y-1 sm:flex-1 ${removed ? "opacity-40" : ""}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* Rank and name stay on one line; a long name is truncated instead of wrapping below "#3". */}
            <span className="flex min-w-0 max-w-full items-center gap-1">
              {showRank && !removed && (
                <span className="shrink-0 sm:hidden">
                  <Rank
                    rank={rank}
                    total={total}
                    editable={isOwner}
                    onSubmit={setRank}
                    prefix="#"
                    className="px-1 font-mono text-xs text-muted"
                  />
                </span>
              )}
              <a
                href={storeUrl(game.appId)}
                target="_blank"
                rel="noreferrer"
                className={`truncate font-medium hover:text-accent ${removed ? "line-through" : ""}`}
              >
                {game.name}
              </a>
            </span>
            {game.isEarlyAccess && (
              <span className="rounded bg-amber-500/15 px-1.5 py-px text-[11px] font-medium text-amber-300">
                Acesso antecipado
              </span>
            )}
            {game.comingSoon && (
              <span className="rounded bg-violet-500/15 px-1.5 py-px text-[11px] font-medium text-violet-300">
                Em breve
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span className={toneClass[reviewTone(game.reviewScore)]}>
              {reviewLabel(game)}
              {pct != null && ` · ${pct}%`}
              {game.reviewTotal ? (
                <span className="text-muted"> ({game.reviewTotal.toLocaleString("pt-BR")})</span>
              ) : null}
            </span>
            {release && <span>{release}</span>}
            {entry.durationHours != null ? (
              <span className="inline-flex items-center gap-1">
                <ClockIcon width={12} height={12} />
                {formatHours(entry.durationHours)}
              </span>
            ) : (
              isOwner &&
              !removed && (
                <button type="button" onClick={() => actions.onEdit(entry)} className="hover:text-text">
                  + duração
                </button>
              )
            )}
          </div>

          {/* Collections (colored, also on mobile) come before the grey Steam tags (desktop only). */}
          <div className="flex flex-wrap items-center gap-1">
            {myCollections.map((c) => (
              <CollectionPill key={c.id} name={c.name} color={c.color} />
            ))}
            {isOwner && !removed && (
              <CollectionMenu
                collections={collections}
                selected={entry.collectionIds}
                compact={myCollections.length > 0}
                onToggle={(id, member) => actions.onToggleCollection(entry, id, member)}
                onCreate={(name) => actions.onCreateCollection(entry, name)}
                onManage={actions.onManageCollections}
              />
            )}
            {game.tags
              .filter((t) => t.id !== EARLY_ACCESS_TAG_ID)
              .slice(0, TAGS_IN_ROW)
              .map((t) => (
                <span key={t.id} className="hidden rounded bg-surface-3 px-1.5 py-px text-[11px] text-muted sm:inline">
                  {t.name}
                </span>
              ))}
          </div>

          {entry.notes && <p className="line-clamp-2 text-xs text-muted italic">{entry.notes}</p>}
        </div>

        {removed ? (
          <div className="col-start-2 row-start-1 flex flex-col items-end justify-center gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs text-muted">Removido da lista</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => actions.onRestore(entry)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm hover:border-accent hover:text-accent disabled:opacity-60"
            >
              <UndoIcon /> Restaurar
            </button>
          </div>
        ) : (
          <div className="col-start-2 row-start-1 flex flex-col items-end justify-between gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Price game={game} />
            {isOwner && (
              <div className="flex items-center sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <IconButton label="Editar duração e notas" onClick={() => actions.onEdit(entry)}>
                  <PencilIcon />
                </IconButton>
                <IconButton label="Mover para o topo" onClick={() => actions.onMoveToTop(entry)}>
                  <TopIcon />
                </IconButton>
                <IconButton label="Atualizar dados da Steam" onClick={() => actions.onRefresh(entry)}>
                  <RefreshIcon />
                </IconButton>
                <IconButton label="Remover da lista" danger onClick={() => actions.onRemove(entry)}>
                  <TrashIcon />
                </IconButton>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
