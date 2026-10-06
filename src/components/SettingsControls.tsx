"use client";

import { useState, useTransition } from "react";
import { deleteAccount, setListVisibility } from "@/app/actions";

export function VisibilityToggle({ listPublic }: { listPublic: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={listPublic}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              const r = await setListVisibility(e.target.checked);
              setError(r.ok ? null : r.error);
            })
          }
          className="mt-0.5 accent-[var(--accent-strong)]"
        />
        <span>
          Lista pública
          <span className="block text-muted">
            {listPublic
              ? "Qualquer pessoa com o link pode ver sua lista (só você edita)."
              : "Só você vê sua lista. Quem abrir o link verá uma página de não encontrado."}
          </span>
        </span>
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function DeleteAccount({ username }: { username: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await deleteAccount(confirmation);
          if (r && !r.ok) setError(r.error);
        });
      }}
      className="space-y-2"
    >
      <p className="text-sm text-muted">
        Apaga sua conta e sua lista para sempre. Para confirmar, digite <strong className="text-text">{username}</strong>.
      </p>
      <div className="flex gap-2">
        <input
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          maxLength={20}
          aria-label="Confirmação do nome de usuário"
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-danger"
        />
        <button
          disabled={pending || confirmation.trim().toLowerCase() !== username}
          className="shrink-0 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-40"
        >
          {pending ? "Excluindo…" : "Excluir conta"}
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </form>
  );
}
