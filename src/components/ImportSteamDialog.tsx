"use client";

import { useState, useTransition } from "react";
import { importSteamWishlist } from "@/app/actions";
import { describeAddResult } from "@/lib/format";
import { SteamIcon } from "./Icons";
import { Modal } from "./Modal";

type Props = { steamConnected: boolean; welcome?: boolean; onClose: () => void };

type Outcome = { kind: "error"; text: string } | { kind: "empty" } | { kind: "done"; text: string };

export function ImportSteamDialog({ steamConnected, welcome, onClose }: Props) {
  const [profile, setProfile] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();

  function runImport(profileInput?: string) {
    setOutcome(null);
    startTransition(async () => {
      const r = await importSteamWishlist(profileInput);
      if (!r.ok) return setOutcome({ kind: "error", text: r.error });
      if (r.data.found === 0) return setOutcome({ kind: "empty" });
      const from = r.data.profileName ? ` de ${r.data.profileName}` : "";
      setOutcome({
        kind: "done",
        text: `${r.data.found} jogos na wishlist${from}: ${describeAddResult(r.data)}.`,
      });
    });
  }

  return (
    <Modal title={welcome ? "Bem-vindo ao YAGW!" : "Importar da Steam"} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {welcome ? "Quer começar trazendo a sua wishlist da Steam? " : ""}
          Os jogos entram no fim da sua lista, na ordem da Steam. Os que já estão na lista são ignorados.
        </p>

        {steamConnected && (
          <button
            type="button"
            disabled={pending}
            onClick={() => runImport()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-accent-strong py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            <SteamIcon />
            {pending ? "Importando…" : "Importar da minha conta Steam"}
          </button>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (profile.trim()) runImport(profile);
          }}
          className="space-y-2"
        >
          <label htmlFor="steam-profile" className="block text-sm text-muted">
            {steamConnected ? "Ou importe de outro perfil:" : "Link do seu perfil na Steam:"}
          </label>
          <div className="flex gap-2">
            <input
              id="steam-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              maxLength={200}
              placeholder="https://steamcommunity.com/id/seu-perfil"
              className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              disabled={pending || !profile.trim()}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {pending && !steamConnected ? "Importando…" : "Importar"}
            </button>
          </div>
        </form>

        {outcome?.kind === "error" && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{outcome.text}</p>}
        {outcome?.kind === "done" && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">{outcome.text}</p>}
        {outcome?.kind === "empty" && (
          <div className="space-y-1 rounded-md bg-surface-2 px-3 py-2 text-sm">
            <p>Não encontramos jogos. A wishlist está vazia ou é privada.</p>
            <p className="text-muted">
              Para importar, deixe <strong>Detalhes do jogo</strong> como <strong>Público</strong> nas{" "}
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                configurações de privacidade da Steam
              </a>
              . Depois de importar, você pode voltar para privado.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
