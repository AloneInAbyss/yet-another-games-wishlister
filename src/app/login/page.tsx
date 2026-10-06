"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <h1 className="text-lg font-semibold">Entrar para editar</h1>
        <input
          type="password"
          name="password"
          placeholder="Senha"
          autoFocus
          required
          className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          disabled={pending}
          className="w-full rounded-md bg-accent-strong px-3 py-2 font-medium text-white hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Entrando…" : "Entrar"}
        </button>
        <Link href="/" className="block text-center text-sm text-muted hover:text-text">
          Voltar para a lista
        </Link>
      </form>
    </main>
  );
}
