import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SteamIcon } from "@/components/Icons";
import { DeleteAccount, VisibilityToggle } from "@/components/SettingsControls";
import { UsernameForm } from "@/components/UsernameForm";
import { getSteamId } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Configurações · YAGW", robots: { index: false } };

const MESSAGES: Record<string, string> = {
  "linked=steam": "Conta Steam conectada.",
  "error=account_in_use": "Essa conta já está ligada a outro usuário do YAGW.",
  "error=provider_already_linked": "Você já tem uma conta Steam conectada.",
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.username) redirect("/onboarding");
  const [steamId, params] = await Promise.all([getSteamId(user.id), searchParams]);
  const messageKey = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .find((k) => k in MESSAGES);

  return (
    <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <Link href={`/u/${user.username}`} className="text-sm text-accent hover:underline">
          Voltar para a lista
        </Link>
      </div>
      {messageKey && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${messageKey.startsWith("error") ? "bg-danger/10 text-danger" : "bg-surface-2"}`}
        >
          {MESSAGES[messageKey]}
        </p>
      )}

      <Card title="Endereço da lista">
        <UsernameForm initial={user.username} submitLabel="Salvar" />
        <p className="text-xs text-muted">Ao trocar o nome, links antigos da sua lista deixam de funcionar.</p>
      </Card>

      <Card title="Privacidade">
        <VisibilityToggle listPublic={user.listPublic} />
      </Card>

      <Card title="Conta Steam">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2">
            <SteamIcon />
            {steamId ? (
              <a
                href={`https://steamcommunity.com/profiles/${steamId}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent"
              >
                Conectada
              </a>
            ) : (
              "Não conectada"
            )}
          </span>
          {!steamId && (
            <a href="/api/auth/steam" className="text-accent hover:underline">
              Conectar
            </a>
          )}
        </div>
        <p className="text-xs text-muted">
          Com a Steam conectada, você importa sua wishlist com um clique (ela precisa estar pública).{" "}
          <Link href={`/u/${user.username}?import=1`} className="text-accent hover:underline">
            Importar agora
          </Link>
        </p>
      </Card>

      <Card title="Excluir conta">
        <DeleteAccount username={user.username} />
      </Card>
    </main>
  );
}
