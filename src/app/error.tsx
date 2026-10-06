"use client";

import Link from "next/link";
import { MessagePage, primaryButton, secondaryButton } from "@/components/MessagePage";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <MessagePage
      title="Algo deu errado"
      actions={
        <>
          <button type="button" onClick={() => retry()} className={primaryButton}>
            Tentar de novo
          </button>
          <Link href="/" className={secondaryButton}>
            Voltar ao início
          </Link>
        </>
      }
    >
      <p>Não foi possível carregar esta página agora. Tente de novo em alguns instantes.</p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted/70">Código do erro: {error.digest}</p>}
    </MessagePage>
  );
}
