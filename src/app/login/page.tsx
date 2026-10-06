import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginButtons } from "@/components/LoginButtons";
import { homePath } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

const ERRORS: Record<string, string> = {
  steam: "Não foi possível confirmar o login com a Steam. Tente de novo.",
  google: "Não foi possível confirmar o login com o Google. Tente de novo.",
  google_unavailable: "O login com o Google ainda não está disponível.",
  rate_limited: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  failed: "Algo deu errado ao entrar. Tente de novo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(homePath(user));
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? ERRORS.failed) : null;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-sm font-semibold text-accent">Yet Another Games Wishlister</p>
          <h1 className="mt-1 text-lg font-semibold">Entrar ou criar conta</h1>
        </div>
        {message && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{message}</p>}
        <LoginButtons />
        <p className="text-xs text-muted">
          Entrar com a Steam só confirma quem você é. O YAGW não recebe sua senha nem acessa sua conta.
        </p>
        <Link href="/" className="block text-center text-sm text-muted hover:text-text">
          Voltar
        </Link>
      </div>
    </main>
  );
}
