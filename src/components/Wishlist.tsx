"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import * as actions from "@/app/actions";
import type { ActionResult } from "@/app/actions";
import { applyFilters, filtersToSearch, isFiltering, SORTS, type Filters, type SortKey } from "@/lib/filters";
import { EARLY_ACCESS_TAG_ID, formatPrice } from "@/lib/format";
import type { WishlistEntry } from "@/lib/wishlist";
import { AddGamesDialog } from "./AddGamesDialog";
import { EditItemDialog } from "./EditItemDialog";
import { ImportSteamDialog } from "./ImportSteamDialog";
import { FilterPanel } from "./FilterPanel";
import { GameRow, type RowActions } from "./GameRow";
import { FilterIcon, LinkIcon, PlusIcon, SearchIcon, SortIcon, SteamIcon } from "./Icons";

export type ListOwner = { username: string; displayName: string; avatarUrl: string | null; listPublic: boolean };

type Props = {
  entries: WishlistEntry[];
  owner: ListOwner;
  isOwner: boolean;
  viewerUsername: string | null;
  steamConnected: boolean;
  initialFilters: Filters;
  welcome: boolean;
  openImport: boolean;
};

type OptimisticChange = { type: "move"; id: number; position: number } | { type: "remove"; id: number };

const updatedFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function Wishlist({ entries, owner, isOwner, viewerUsername, steamConnected, initialFilters, welcome, openImport }: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<WishlistEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(isOwner && (welcome || openImport));
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [items, applyOptimistic] = useOptimistic(entries, (state: WishlistEntry[], change: OptimisticChange) =>
    change.type === "remove"
      ? state.filter((e) => e.id !== change.id)
      : state.map((e) => (e.id === change.id ? { ...e, position: change.position } : e)),
  );

  // Keep the URL in sync so a filtered view can be shared as a link.
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname + filtersToSearch(filters));
  }, [filters]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => applyFilters([...items], filters), [items, filters]);
  const ranks = useMemo(
    () => new Map([...items].sort((a, b) => a.position - b.position).map((e, i) => [e.id, i + 1])),
    [items],
  );
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of items)
      for (const t of e.game.tags) if (t.id !== EARLY_ACCESS_TAG_ID) counts.set(t.name, (counts.get(t.name) ?? 0) + 1);
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  const stats = useMemo(() => {
    let total = 0;
    let full = 0;
    let onSale = 0;
    for (const e of visible) {
      if (e.game.priceFinal == null || e.game.isFree) continue;
      total += e.game.priceFinal;
      full += e.game.priceInitial ?? e.game.priceFinal;
      if (e.game.discountPercent > 0) onSale++;
    }
    return { total, full, onSale };
  }, [visible]);

  const lastUpdate = useMemo(() => {
    const times = items.map((e) => e.game.updatedAt?.getTime() ?? 0);
    const max = Math.max(0, ...times);
    return max ? new Date(max) : null;
  }, [items]);

  const canDrag = isOwner && filters.sort === "priority" && filters.dir === "asc";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const patchFilters = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  function changeSort(sort: SortKey) {
    patchFilters({ sort, dir: SORTS[sort].defaultDir });
  }

  async function run(ids: number[], fn: () => Promise<ActionResult>, errorMessage: string) {
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      const r = await fn();
      if (!r.ok) setToast(r.error);
    } catch {
      setToast(errorMessage);
    } finally {
      setBusyIds((s) => new Set([...s].filter((id) => !ids.includes(id))));
    }
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = visible.findIndex((e) => e.id === active.id);
    const to = visible.findIndex((e) => e.id === over.id);
    const moved = arrayMove(visible, from, to);
    const prev = moved[to - 1] ?? null;
    const next = moved[to + 1] ?? null;
    const id = Number(active.id);
    const position =
      prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1 : next ? next.position - 1 : 0;
    startTransition(async () => {
      applyOptimistic({ type: "move", id, position });
      await run([id], () => actions.moveItem(id, prev?.id ?? null, next?.id ?? null), "Não foi possível reordenar");
    });
  }

  const rowActions: RowActions = {
    onEdit: setEditing,
    onMoveToTop: (entry) => {
      const first = Math.min(...items.map((e) => e.position));
      startTransition(async () => {
        applyOptimistic({ type: "move", id: entry.id, position: first - 1 });
        await run([entry.id], () => actions.moveItemToTop(entry.id), "Não foi possível mover");
      });
    },
    onRefresh: (entry) =>
      startTransition(() => run([entry.id], () => actions.refreshItem(entry.id), "Falha ao atualizar")),
    onRemove: (entry) => {
      if (!confirm(`Remover "${entry.game.name}" da lista?`)) return;
      startTransition(async () => {
        applyOptimistic({ type: "remove", id: entry.id });
        await run([entry.id], () => actions.removeItem(entry.id), "Não foi possível remover");
      });
    },
  };

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setToast("Link copiado");
  }

  const activeFilterCount = [
    filters.priceMin || filters.priceMax,
    filters.onSale,
    filters.minReview,
    filters.earlyAccess !== "any",
    filters.release !== "any",
    filters.tags.length,
  ].filter(Boolean).length;

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-text disabled:opacity-60";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href="/" className="mb-1 block text-sm font-semibold text-accent hover:underline">
            Yet Another Games Wishlister
          </Link>
          <div className="flex items-center gap-3">
            {owner.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={owner.avatarUrl} alt="" className="size-10 shrink-0 rounded-full bg-surface-3 sm:size-12" />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                {isOwner ? "Minha lista de desejos" : `Lista de desejos de ${owner.displayName}`}
              </h1>
              <p className="mt-0.5 text-sm text-muted">
                {items.length} jogo{items.length === 1 ? "" : "s"}
                {lastUpdate && ` · preços da Steam de ${updatedFormat.format(lastUpdate)}`}
                {isOwner && !owner.listPublic && (
                  <span className="ml-2 rounded bg-surface-3 px-1.5 py-px text-xs">Privada</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {owner.listPublic && (
            <button type="button" onClick={copyLink} className={buttonClass}>
              <LinkIcon /> Copiar link
            </button>
          )}
          {isOwner ? (
            <>
              <button type="button" onClick={() => setImporting(true)} className={buttonClass}>
                <SteamIcon /> Importar da Steam
              </button>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
              >
                <PlusIcon /> Adicionar jogos
              </button>
              <Link href="/settings" className="px-2 py-1.5 text-sm text-muted hover:text-text">
                Configurações
              </Link>
              <form action={actions.logout}>
                <button className="px-2 py-1.5 text-sm text-muted hover:text-text">Sair</button>
              </form>
            </>
          ) : viewerUsername ? (
            <Link href={`/u/${viewerUsername}`} className="px-2 py-1.5 text-sm text-muted hover:text-text">
              Minha lista
            </Link>
          ) : (
            <Link href="/login" className="px-2 py-1.5 text-sm text-accent hover:underline">
              Criar minha lista
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={`${showFilters ? "block" : "hidden"} rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-6 lg:block lg:w-64 lg:shrink-0`}
        >
          <FilterPanel filters={filters} onChange={patchFilters} tags={tags} />
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
              <input
                value={filters.q}
                onChange={(e) => patchFilters({ q: e.target.value })}
                placeholder="Buscar na lista"
                className="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-sm outline-none focus:border-accent"
              />
            </div>
            <button type="button" onClick={() => setShowFilters((s) => !s)} className={`${buttonClass} lg:hidden`}>
              <FilterIcon /> Filtros{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
            <div className="flex items-center gap-1">
              <label htmlFor="sort" className="text-sm text-muted">
                Ordenar:
              </label>
              <select
                id="sort"
                value={filters.sort}
                onChange={(e) => changeSort(e.target.value as SortKey)}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
              >
                {Object.entries(SORTS).map(([key, s]) => (
                  <option key={key} value={key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => patchFilters({ dir: filters.dir === "asc" ? "desc" : "asc" })}
                title={filters.dir === "asc" ? "Crescente" : "Decrescente"}
                aria-label={filters.dir === "asc" ? "Ordem crescente" : "Ordem decrescente"}
                className="rounded-md border border-border bg-surface p-2 text-muted hover:text-text"
              >
                <SortIcon desc={filters.dir === "desc"} />
              </button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
            <span>
              {isFiltering(filters) ? `${visible.length} de ${items.length} jogos` : `${visible.length} jogos`}
              {stats.onSale > 0 && ` · ${stats.onSale} em promoção`}
            </span>
            {stats.total > 0 && (
              <span>
                Total: <span className="text-text">{formatPrice(stats.total)}</span>
                {stats.full > stats.total && <span className="ml-1 line-through">{formatPrice(stats.full)}</span>}
              </span>
            )}
          </div>

          {isOwner && !canDrag && visible.length > 1 && (
            <p className="mb-3 text-xs text-muted">
              Para arrastar e definir a prioridade, ordene por <strong>Prioridade</strong> (crescente).
            </p>
          )}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
              <p>A lista está vazia.</p>
              {isOwner && (
                <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                  <button type="button" onClick={() => setImporting(true)} className="text-accent hover:underline">
                    Importar da Steam
                  </button>
                  <button type="button" onClick={() => setAdding(true)} className="text-accent hover:underline">
                    Adicionar jogos manualmente
                  </button>
                </div>
              )}
            </div>
          ) : visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
              Nenhum jogo corresponde aos filtros.
            </p>
          ) : (
            <DndContext
              id="wishlist-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={visible.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2">
                  {visible.map((entry) => (
                    <GameRow
                      key={entry.id}
                      entry={entry}
                      rank={ranks.get(entry.id) ?? 0}
                      showRank={filters.sort === "priority"}
                      draggable={canDrag}
                      isOwner={isOwner}
                      busy={busyIds.has(entry.id)}
                      actions={rowActions}
                    />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </main>
      </div>

      {adding && <AddGamesDialog existing={new Set(items.map((e) => e.game.appId))} onClose={() => setAdding(false)} />}
      {importing && (
        <ImportSteamDialog steamConnected={steamConnected} welcome={welcome} onClose={() => setImporting(false)} />
      )}
      {editing && <EditItemDialog entry={editing} onClose={() => setEditing(null)} />}
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-border bg-surface-3 px-4 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
