import { redirect } from "next/navigation";
import { UsernameForm } from "@/components/UsernameForm";
import { availableUsername } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.username) redirect(`/u/${user.username}`);
  const suggestion = await availableUsername(user.displayName);

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6">
        <div>
          <p className="text-sm font-semibold text-accent">Yet Another Games Wishlister</p>
          <h1 className="mt-1 text-lg font-semibold">Olá, {user.displayName}!</h1>
          <p className="mt-1 text-sm text-muted">
            Escolha o endereço da sua lista. É ele que você vai mandar para os amigos, e dá para trocar depois.
          </p>
        </div>
        <UsernameForm initial={suggestion} submitLabel="Continuar" next="list" />
      </div>
    </main>
  );
}
