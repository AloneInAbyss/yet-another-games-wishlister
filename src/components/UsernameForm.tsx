"use client";

import { useActionState, useState } from "react";
import { saveUsername } from "@/app/actions";

type Props = { initial: string; submitLabel: string; next?: "list" };

export function UsernameForm({ initial, submitLabel, next }: Props) {
  const [result, action, pending] = useActionState(saveUsername, null);
  const [value, setValue] = useState(initial);
  return (
    <form action={action} className="space-y-2">
      {next && <input type="hidden" name="next" value={next} />}
      <label htmlFor="username" className="block text-sm text-muted">
        Nome de usuário
      </label>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-md border border-border bg-bg focus-within:border-accent">
          <span className="pl-3 text-sm text-muted">/u/</span>
          <input
            id="username"
            name="username"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_\-]+"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 pr-3 text-sm outline-none"
          />
        </div>
        <button
          disabled={pending}
          className="shrink-0 rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Salvando…" : submitLabel}
        </button>
      </div>
      <p className="text-xs text-muted">Letras minúsculas, números, _ e -, de 3 a 20 caracteres.</p>
      {result && !result.ok && <p className="text-sm text-danger">{result.error}</p>}
      {result?.ok && !next && <p className="text-sm text-positive">Nome salvo.</p>}
    </form>
  );
}
