"use client";

import { useEffect, useRef, useState } from "react";
import { colorHex, MAX_COLLECTION_NAME, type CollectionInfo } from "@/lib/collections";

type Props = {
  collections: CollectionInfo[];
  selected: number[];
  compact: boolean;
  onToggle: (collectionId: number, member: boolean) => void;
  onCreate: (name: string) => Promise<boolean>;
  onManage: () => void;
};

/** "+ coleção" button on a game row, opening a quick menu to add/remove it from collections. */
export function CollectionMenu({ collections, selected, compact, onToggle, onCreate, onManage }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    if (await onCreate(trimmed)) setName("");
    setCreating(false);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Coleções deste jogo"
        className="rounded-full border border-dashed border-border px-2 py-px text-[11px] text-muted hover:border-accent hover:text-text"
      >
        {compact ? "+" : "+ coleção"}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-1 w-64 max-w-[calc(100vw-3rem)] rounded-lg border border-border bg-surface-2 p-2 shadow-xl shadow-black/40">
          {collections.length > 0 && (
            <ul className="mb-2 max-h-56 space-y-0.5 overflow-y-auto">
              {collections.map((c) => {
                const checked = selected.includes(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-surface-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(c.id, !checked)}
                        className="accent-[var(--accent-strong)]"
                      />
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colorHex(c.color) }} />
                      <span className="truncate">{c.name}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_COLLECTION_NAME}
              disabled={creating}
              placeholder={collections.length ? "Nova coleção…" : "Nome da primeira coleção…"}
              aria-label="Nova coleção"
              className="w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </form>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="mt-2 w-full text-left text-xs text-accent hover:underline"
          >
            Gerenciar coleções
          </button>
        </div>
      )}
    </div>
  );
}
