import Link from "next/link";
import type { ReactNode } from "react";
import { HEART_PATH } from "@/lib/brand";

/** Centered message used by the not-found and error pages. */
export function MessagePage({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <svg viewBox="0 0 24 24" className="mx-auto mb-5 size-10 text-accent/70" aria-hidden="true">
          <path d={HEART_PATH} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 text-muted">{children}</div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </main>
  );
}

export const primaryButton =
  "rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:brightness-110";
export const secondaryButton = "rounded-md border border-border px-4 py-2 text-sm text-muted hover:text-text";

export function HomeLinks({ username }: { username: string | null }) {
  return username ? (
    <Link href={`/u/${username}`} className={primaryButton}>
      Ir para a minha lista
    </Link>
  ) : (
    <>
      <Link href="/login" className={primaryButton}>
        Criar a minha lista
      </Link>
      <Link href="/" className={secondaryButton}>
        Conhecer o YAGW
      </Link>
    </>
  );
}
