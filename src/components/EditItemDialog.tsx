"use client";

import { useState, useTransition } from "react";
import { updateItem } from "@/app/actions";
import { hltbUrl } from "@/lib/format";
import type { WishlistEntry } from "@/lib/wishlist";
import { Modal } from "./Modal";

export function EditItemDialog({ entry, onClose }: { entry: WishlistEntry; onClose: () => void }) {
  const [duration, setDuration] = useState(entry.durationHours?.toString() ?? "");
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    const hours = duration.trim() === "" ? null : Number(duration.replace(",", "."));
    if (hours != null && (!Number.isFinite(hours) || hours < 0)) return setError("Duração inválida");
    startTransition(async () => {
      try {
        const r = await updateItem(entry.id, { durationHours: hours, notes });
        if (!r.ok) return setError(r.error);
        onClose();
      } catch {
        setError("Não foi possível salvar");
      }
    });
  }

  return (
    <Modal title={entry.game.name} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Duração (horas)</span>
          <input
            inputMode="decimal"
            autoFocus
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ex.: 25"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
          />
          <a
            href={hltbUrl(entry.game.name)}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-accent hover:underline"
          >
            Ver no HowLongToBeat ↗
          </a>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">Notas</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Ex.: jogar em coop com fulano, esperar abaixo de R$ 30…"
            className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-muted hover:text-text">
            Cancelar
          </button>
          <button
            disabled={pending}
            className="rounded-md bg-accent-strong px-4 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
