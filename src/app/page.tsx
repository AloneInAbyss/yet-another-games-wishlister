import { redirect } from "next/navigation";
import { LoginButtons } from "@/components/LoginButtons";
import { homePath } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";

const FEATURES = [
  {
    title: "Filtros que a Steam não tem",
    text: "Faixa de preço, % mínima de avaliações positivas, tags como Roguelike ou Cooperativo, acesso antecipado e duração.",
  },
  {
    title: "Sua prioridade",
    text: "Arraste os jogos para definir a ordem do que você mais quer, como na Steam.",
  },
  {
    title: "Importe sua wishlist",
    text: "Traga a lista de desejos da Steam em segundos e complete com os jogos que você guarda em outros lugares.",
  },
  {
    title: "Preços atualizados",
    text: "Preços da Steam Brasil atualizados todo dia, com destaque para os jogos em promoção.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homePath(user));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-12 px-4 py-12 sm:py-20">
      <section className="grid items-center gap-10 md:grid-cols-[1fr_20rem]">
        <div>
          <p className="mb-3 text-sm font-semibold text-accent">Yet Another Games Wishlister</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Sua lista de desejos de jogos, do seu jeito.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Junte os jogos que você quer, acompanhe os preços da Steam e encontre a próxima compra com filtros
            feitos para isso. Depois, é só mandar o link para os amigos.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-4 text-sm text-muted">Crie sua lista grátis:</p>
          <LoginButtons />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-medium">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
