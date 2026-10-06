import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6 text-center text-xs text-muted">
      <nav className="mb-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/privacidade" className="hover:text-text">
          Privacidade
        </Link>
        <a
          href="https://github.com/AloneInAbyss/yet-another-games-wishlister/issues"
          target="_blank"
          rel="noreferrer"
          className="hover:text-text"
        >
          Sugestões e problemas
        </a>
      </nav>
      <p>O YAGW não tem relação com a Valve ou a Steam. Os dados dos jogos vêm da loja pública da Steam.</p>
    </footer>
  );
}
