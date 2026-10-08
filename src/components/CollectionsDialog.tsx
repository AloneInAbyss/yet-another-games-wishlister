"use client";

import { useState, useTransition } from "react";
import * as actions from "@/app/actions";
import {
  COLLECTION_COLORS,
  COLOR_KEYS,
  colorHex,
  MAX_COLLECTION_NAME,
  MAX_COLLECTIONS,
  nextColor,
  type CollectionColor,
  type CollectionInfo,
} from "@/lib/collections";
import { TrashIcon } from "./Icons";
import { Modal } from "./Modal";

type Props = {
  collections: CollectionInfo[];
  onClose: () => void;
  /** Called after a collection is deleted, so filters can forget it. */
  onDeleted: (id: number) => void;
};

function Palette({ value, onChange }: { value: string; onChange: (c: CollectionColor) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor">
      {COLOR_KEYS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLLECTION_COLORS[c].label}
          title={COLLECTION_COLORS[c].label}
          onClick={() => onChange(c)}
          className={`size-6 rounded-full ring-offset-2 ring-offset-surface transition ${value === c ? "ring-2 ring-text" : "hover:scale-110"}`}
          style={{ backgroundColor: COLLECTION_COLORS[c].hex }}
        />
      ))}
    </div>
  );
}

function CollectionRow({
  collection,
  onError,
  onDeleted,
}: {
  collection: CollectionInfo;
  onError: (message: string | null) => void;
  onDeleted: (id: number) => void;
}) {
  const [name, setName] = useState(collection.name);
  const [showPalette, setShowPalette] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = (data: { name?: string; color?: CollectionColor }) =>
    startTransition(async () => {
      const r = await actions.updateCollection(collection.id, data);
      onError(r.ok ? null : r.error);
      if (!r.ok && data.name != null) setName(collection.name);
    });

  return (
    <li className={`space-y-2 rounded-md border border-border p-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPalette((s) => !s)}
          aria-label={`Mudar a cor de ${collection.name}`}
          title="Mudar a cor"
          className="size-5 shrink-0 rounded-full"
          style={{ backgroundColor: colorHex(collection.color) }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== collection.name && save({ name })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          maxLength={MAX_COLLECTION_NAME}
          aria-label="Nome da coleção"
          className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-border focus:border-accent"
        />
        <span className="shrink-0 text-xs text-muted">
          {collection.count} {collection.count === 1 ? "jogo" : "jogos"}
        </span>
        {!confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Excluir ${collection.name}`}
            className="shrink-0 rounded p-1.5 text-muted hover:bg-surface-3 hover:text-danger"
          >
            <TrashIcon />
          </button>
        )}
      </div>
      {showPalette && (
        <Palette
          value={collection.color}
          onChange={(color) => {
            setShowPalette(false);
            save({ color });
          }}
        />
      )}
      {confirming && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded bg-danger/10 px-2 py-1.5 text-sm">
          <span>Excluir “{collection.name}”? Os jogos continuam na lista.</span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="text-muted hover:text-text">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  const r = await actions.deleteCollection(collection.id);
                  onError(r.ok ? null : r.error);
                  if (r.ok) onDeleted(collection.id);
                })
              }
              className="font-medium text-danger hover:underline"
            >
              Excluir
            </button>
          </span>
        </div>
      )}
    </li>
  );
}

export function CollectionsDialog({ collections, onClose, onDeleted }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<CollectionColor>(() => nextColor(collections.map((c) => c.color)));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const r = await actions.createCollection(name, color);
      setError(r.ok ? null : r.error);
      if (r.ok) {
        setName("");
        setColor(nextColor([...collections.map((c) => c.color), color]));
      }
    });
  }

  return (
    <Modal title="Coleções" onClose={onClose}>
      <div className="space-y-4">
        {collections.length === 0 ? (
          <p className="text-sm text-muted">
            Coleções agrupam jogos do seu jeito, por exemplo “Para jogar com amigos” ou “Esperar &lt; R$ 50”. Quem vê a
            sua lista também vê as coleções e pode filtrar por elas.
          </p>
        ) : (
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
            {collections.map((c) => (
              <CollectionRow
                key={`${c.id}-${c.name}-${c.color}`}
                collection={c}
                onError={setError}
                onDeleted={onDeleted}
              />
            ))}
          </ul>
        )}

        {collections.length < MAX_COLLECTIONS ? (
          <form onSubmit={create} className="space-y-2 rounded-md border border-dashed border-border p-2">
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_COLLECTION_NAME}
                placeholder="Nova coleção"
                aria-label="Nome da nova coleção"
                className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              />
              <button
                disabled={pending || !name.trim()}
                className="shrink-0 rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
              >
                Criar
              </button>
            </div>
            <Palette value={color} onChange={setColor} />
          </form>
        ) : (
          <p className="text-xs text-muted">Você chegou ao limite de {MAX_COLLECTIONS} coleções.</p>
        )}

        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
