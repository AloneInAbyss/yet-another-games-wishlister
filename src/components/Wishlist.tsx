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
import { applyFilters, filtersToSearch, isFiltering, SORTS, type Filters, type SortKey } from "@/lib/filters";
import { formatPrice } from "@/lib/format";
import type { WishlistEntry } from "@/lib/wishlist";
import { AddGamesDialog } from "./AddGamesDialog";
import { EditItemDialog } from "./EditItemDialog";
import { FilterPanel } from "./FilterPanel";
import { GameRow, type RowActions } from "./GameRow";
import { FilterIcon, LinkIcon, PlusIcon, RefreshIcon, SearchIcon, SortIcon } from "./Icons";

type Props = { entries: WishlistEntry[]; isAdmin: boolean; initialFilters: Filters };

type OptimisticChange = { type: "move"; id: number; position: number } | { type: "remove"; id: number };

const updatedFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function Wishlist({ entries, isAdmin, initialFilters }: Props) {
  const [filters, setFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing] = useState<WishlistEntry | null>(null);
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
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
  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of items)
      for (const g of e.game.genres) if (g.id !== "70") counts.set(g.description, (counts.get(g.description) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
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
    const times = items.map((e) => e.game.priceUpdatedAt?.getTime() ?? 0);
    const max = Math.max(0, ...times);
    return max ? new Date(max) : null;
  }, [items]);

  const canDrag = isAdmin && filters.sort === "priority" && filters.dir === "asc";
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const patchFilters = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  function changeSort(sort: SortKey) {
    patchFilters({ sort, dir: SORTS[sort].defaultDir });
  }

  async function run(ids: number[], fn: () => Promise<unknown>, errorMessage: string) {
    setBusyIds((s) => new Set([...s, ...ids]));
    try {
      await fn();
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
      startTransition(() => run([entry.id], () => actions.refreshGame(entry.game.appId), "Falha ao atualizar")),
    onRemove: (entry) => {
      if (!confirm(`Remover "${entry.game.name}" da lista?`)) return;
      startTransition(async () => {
        applyOptimistic({ type: "remove", id: entry.id });
        await run([entry.id], () => actions.removeItem(entry.id), "Não foi possível remover");
      });
    },
  };

  function refreshPrices() {
    startRefresh(async () => {
      try {
        const n = await actions.refreshPrices();
        setToast(`Preços atualizados (${n} jogos)`);
      } catch {
        setToast("Falha ao atualizar preços");
      }
    });
  }

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
    filters.genres.length,
  ].filter(Boolean).length;

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted hover:text-text disabled:opacity-60";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lista de desejos</h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} jogo{items.length === 1 ? "" : "s"}
            {lastUpdate && ` · preços da Steam Brasil de ${updatedFormat.format(lastUpdate)}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyLink} className={buttonClass}>
            <LinkIcon /> Copiar link
          </button>
          {isAdmin ? (
            <>
              <button type="button" onClick={refreshPrices} disabled={refreshing} className={buttonClass}>
                <RefreshIcon className={refreshing ? "animate-spin" : ""} />
                {refreshing ? "Atualizando…" : "Atualizar preços"}
              </button>
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-110"
              >
                <PlusIcon /> Adicionar jogos
              </button>
              <form action={actions.logout}>
                <button className="px-2 py-1.5 text-sm text-muted hover:text-text">Sair</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="px-2 py-1.5 text-sm text-muted hover:text-text">
              Entrar
            </Link>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside
          className={`${showFilters ? "block" : "hidden"} rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-6 lg:block lg:w-64 lg:shrink-0`}
        >
          <FilterPanel filters={filters} onChange={patchFilters} genres={genres} />
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

          {isAdmin && !canDrag && visible.length > 1 && (
            <p className="mb-3 text-xs text-muted">
              Para arrastar e definir a prioridade, ordene por <strong>Prioridade</strong> (crescente).
            </p>
          )}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
              <p>A lista está vazia.</p>
              {isAdmin && (
                <button type="button" onClick={() => setAdding(true)} className="mt-3 text-accent hover:underline">
                  Adicionar o primeiro jogo
                </button>
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
                      isAdmin={isAdmin}
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
