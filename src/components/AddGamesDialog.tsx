"use client";

import { useEffect, useState, useTransition } from "react";
import { addGames } from "@/app/actions";
import { formatPrice } from "@/lib/format";
import { parseAppIds, type SearchResult } from "@/lib/steam";
import { SearchIcon } from "./Icons";
import { Modal } from "./Modal";

export function AddGamesDialog({ existing, onClose }: { existing: Set<number>; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set());
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  // Pasted links (or app IDs) are added directly; anything else is a name search.
  const linkIds = /store\.steampowered\.com\/app\/\d+|^[\d\s,;]+$/.test(query.trim()) ? parseAppIds(query) : [];

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || linkIds.length) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
        setMessage(Array.isArray(data) ? null : data.error);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setMessage("Falha ao buscar na Steam");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, linkIds.length]);

  function add(ids: number[]) {
    setAddingIds((s) => new Set([...s, ...ids]));
    setMessage(null);
    startTransition(async () => {
      try {
        const r = await addGames(ids);
        setAdded((s) => new Set([...s, ...ids.filter((id) => !r.failed.includes(id))]));
        const parts = [];
        if (r.added) parts.push(`${r.added} adicionado${r.added > 1 ? "s" : ""}`);
        if (r.skipped) parts.push(`${r.skipped} já estava${r.skipped > 1 ? "m" : ""} na lista`);
        if (r.failed.length) parts.push(`${r.failed.length} não encontrado${r.failed.length > 1 ? "s" : ""} na Steam`);
        setMessage(parts.join(" · "));
        if (linkIds.length) setQuery("");
      } catch {
        setMessage("Não foi possível adicionar");
      } finally {
        setAddingIds((s) => new Set([...s].filter((id) => !ids.includes(id))));
      }
    });
  }

  const visibleResults = query.trim().length >= 2 && !linkIds.length ? results : [];

  return (
    <Modal title="Adicionar jogos" onClose={onClose}>
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nome do jogo ou links da Steam"
            className="w-full rounded-md border border-border bg-bg py-2 pr-3 pl-9 outline-none focus:border-accent"
          />
        </div>
        <p className="text-xs text-muted">
          Busque pelo nome ou cole um ou vários links da loja (store.steampowered.com/app/…) de uma vez.
        </p>

        {linkIds.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => add(linkIds)}
            className="w-full rounded-md bg-accent-strong py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Adicionando…" : `Adicionar ${linkIds.length} jogo${linkIds.length > 1 ? "s" : ""} pelos links`}
          </button>
        )}

        {message && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">{message}</p>}
        {searching && <p className="text-sm text-muted">Buscando…</p>}

        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {visibleResults.map((r) => {
            const inList = existing.has(r.appId) || added.has(r.appId);
            const busy = addingIds.has(r.appId);
            return (
              <li key={r.appId} className="flex items-center gap-3 rounded-md p-1.5 hover:bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt="" className="aspect-[231/87] w-24 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.name}</p>
                  <p className="text-xs text-muted">
                    {r.priceFinal != null ? formatPrice(r.priceFinal) : "—"}
                    {r.priceInitial != null && r.priceFinal != null && r.priceInitial > r.priceFinal && (
                      <span className="ml-1 line-through">{formatPrice(r.priceInitial)}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={inList || busy}
                  onClick={() => add([r.appId])}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs hover:border-accent hover:text-accent disabled:border-transparent disabled:text-muted"
                >
                  {inList ? "Na lista ✓" : busy ? "…" : "Adicionar"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
