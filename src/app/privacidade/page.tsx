import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Privacidade · YAGW",
  description: "Quais dados o YAGW guarda, para quê e como apagar tudo.",
};

const UPDATED_AT = "6 de outubro de 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-muted [&_strong]:text-text">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-10">
      <div>
        <Link href="/" className="text-sm font-semibold text-accent hover:underline">
          Yet Another Games Wishlister
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Privacidade</h1>
        <p className="mt-2 text-muted">
          O YAGW é um projeto pessoal e gratuito. Esta página explica, em linguagem simples, quais dados ele guarda,
          para quê e como você apaga tudo. Atualizada em {UPDATED_AT}.
        </p>
      </div>

      <Section title="O que guardamos quando você entra com a Steam">
        <p>
          O login é feito no site da própria Steam. O YAGW <strong>não recebe a sua senha</strong>, não tem acesso à sua
          conta e não pode comprar nem alterar nada nela. A Steam só confirma quem você é, e então guardamos:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            o seu <strong>SteamID</strong> (o número que identifica o seu perfil), para reconhecer você no próximo
            login;
          </li>
          <li>
            o seu <strong>nome e avatar públicos</strong> da Steam, exibidos na sua lista.
          </li>
        </ul>
        <p>Não pedimos nem guardamos e-mail, telefone, endereço ou dados de pagamento.</p>
      </Section>

      <Section title="O que você cria no site">
        <ul className="list-disc space-y-1 pl-5">
          <li>o nome de usuário que aparece no endereço da sua lista;</li>
          <li>a sua lista: os jogos, a ordem de prioridade, as durações e as notas que você escrever;</li>
          <li>se a lista é pública ou privada.</li>
        </ul>
        <p>
          Quando você importa a wishlist da Steam, o YAGW só lê a lista pública do perfil informado. Os dados dos jogos
          (preço, avaliações, tags) vêm da loja pública da Steam e não são dados pessoais.
        </p>
      </Section>

      <Section title="Quem vê a sua lista">
        <p>
          Por padrão a lista é <strong>pública</strong>: qualquer pessoa com o link vê os jogos, o seu nome e o seu
          avatar, mas só você edita. Pedimos aos buscadores (como o Google) para não indexarem as listas, então elas não
          aparecem em pesquisas. Em <strong>Configurações</strong> você pode deixar a lista <strong>privada</strong>: aí
          só você a vê.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Usamos apenas os cookies necessários para o login: um que mantém você conectado e outros temporários durante a
          entrada pela Steam, que expiram em até 10 minutos.{" "}
          <strong>Não usamos cookies de publicidade nem de rastreamento</strong>.
        </p>
      </Section>

      <Section title="Proteção contra abuso">
        <p>
          Para evitar abusos (como alguém criando contas em massa), o endereço IP de quem faz login ou cria conta é
          usado em contadores temporários, que expiram em até 24 horas e são apagados logo em seguida. Ações dentro da
          conta, como buscas e importações, também têm limites de frequência.
        </p>
      </Section>

      <Section title="Onde os dados ficam">
        <p>
          O site é hospedado na <strong>Vercel</strong> e os dados ficam num banco de dados da <strong>Turso</strong>.
          Esses serviços podem guardar registros técnicos de acesso (como IP e horário) por um período limitado,
          conforme as políticas deles. Não vendemos nem compartilhamos dados com mais ninguém.
        </p>
      </Section>

      <Section title="Como apagar tudo">
        <p>
          Em <strong>Configurações → Excluir conta</strong> você apaga, na hora e de forma definitiva, a sua conta, a
          sua lista e as suas sessões. Também dá para remover jogos da lista a qualquer momento.
        </p>
      </Section>

      <Section title="Dúvidas">
        <p>
          Se tiver dúvidas sobre os seus dados, abra uma conversa em{" "}
          <a
            href="https://github.com/AloneInAbyss/yet-another-games-wishlister/issues"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            Sugestões e problemas
          </a>
          .
        </p>
      </Section>
    </main>
  );
}
