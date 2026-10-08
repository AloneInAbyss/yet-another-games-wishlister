"use client";

import { useState, useTransition } from "react";
import { addGames, resolveGameNames } from "@/app/actions";
import type { ResolvedLine } from "@/lib/bulk-resolve";
import { describeAddResult, formatPrice } from "@/lib/format";
import { BULK_CHUNK_SIZE, MAX_BULK_NAMES } from "@/lib/bulk-limits";

type Row = ResolvedLine & { key: number; selectedAppId: number | null; checked: boolean; added: boolean };

type Props = {
  existing: Set<number>;
  /** Opens the single search tab with this name filled in. */
  onSearchOne: (name: string) => void;
};

/** One name per line; for spreadsheet columns pasted with tabs, only the first cell counts. */
function parseLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("\t")[0].trim().slice(0, 100);
    if (!line || seen.has(line.toLowerCase())) continue;
    seen.add(line.toLowerCase());
    lines.push(line);
  }
  return lines;
}

function toRow(line: ResolvedLine, key: number, existing: Set<number>): Row {
  const appId = line.match?.appId ?? null;
  const findable = line.status === "exact" || line.status === "approx";
  return {
    ...line,
    key,
    selectedAppId: appId,
    checked: findable && appId != null && !existing.has(appId),
    added: false,
  };
}

const STATUS_STYLE: Record<ResolvedLine["status"], string> = {
  exact: "border-border",
  approx: "border-amber-500/50 bg-amber-500/5",
  notfound: "border-danger/40 bg-danger/5",
  error: "border-danger/40 bg-danger/5",
};

export function BulkAddPanel({ existing, onSearchOne }: Props) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, startAdding] = useTransition();
  const [, startTransition] = useTransition();

  const lines = parseLines(text);
  const tooMany = lines.length > MAX_BULK_NAMES;

  /** Looks lines up in chunks, so results show up as they arrive. */
  async function resolve(queries: string[], onChunk: (lines: ResolvedLine[], offset: number) => void) {
    for (let i = 0; i < queries.length; i += BULK_CHUNK_SIZE) {
      const chunk = queries.slice(i, i + BULK_CHUNK_SIZE);
      const r = await resolveGameNames(chunk).catch(() => null);
      if (!r || !r.ok) {
        setMessage(r && !r.ok ? r.error : "Falha ao buscar na Steam.");
        // The rest stays as "error", so it can be retried later.
        onChunk(
          queries.slice(i).map((query) => ({ query, status: "error", match: null, alternatives: [] })),
          i,
        );
        return;
      }
      onChunk(r.data, i);
      setProgress((p) => (p ? { ...p, done: Math.min(p.total, p.done + chunk.length) } : p));
    }
  }

  function search() {
    if (!lines.length || tooMany) return;
    setMessage(null);
    setRows([]);
    setProgress({ done: 0, total: lines.length });
    startTransition(async () => {
      await resolve(lines, (chunk, offset) =>
        setRows((prev) => [...(prev ?? []), ...chunk.map((l, j) => toRow(l, offset + j, existing))]),
      );
      setProgress(null);
    });
  }

  function retryFailed() {
    const failed = (rows ?? []).filter((r) => r.status === "error");
    if (!failed.length) return;
    setMessage(null);
    setProgress({ done: 0, total: failed.length });
    startTransition(async () => {
      await resolve(
        failed.map((r) => r.query),
        (chunk, offset) =>
          setRows((prev) => {
            const next = [...(prev ?? [])];
            chunk.forEach((line, j) => {
              const key = failed[offset + j].key;
              next[next.findIndex((r) => r.key === key)] = toRow(line, key, existing);
            });
            return next;
          }),
      );
      setProgress(null);
    });
  }

  const update = (key: number, patch: Partial<Row>) =>
    setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? prev);

  const inList = (r: Row) => r.selectedAppId != null && existing.has(r.selectedAppId) && !r.added;
  // The same game typed twice (e.g. by name and by link): only the first row counts.
  const firstRowOfGame = new Map<number, number>();
  for (const r of rows ?? []) {
    if (r.selectedAppId != null && !firstRowOfGame.has(r.selectedAppId)) firstRowOfGame.set(r.selectedAppId, r.key);
  }
  const isRepeat = (r: Row) => r.selectedAppId != null && firstRowOfGame.get(r.selectedAppId) !== r.key;
  const toAdd = [
    ...new Set(
      (rows ?? [])
        .filter((r) => r.checked && !r.added && r.selectedAppId != null && !inList(r) && !isRepeat(r))
        .map((r) => r.selectedAppId!),
    ),
  ];

  function add() {
    if (!toAdd.length) return;
    setMessage(null);
    startAdding(async () => {
      const r = await addGames(toAdd).catch(() => null);
      if (!r || !r.ok) return setMessage(r && !r.ok ? r.error : "Não foi possível adicionar.");
      setMessage(describeAddResult(r.data));
      if (!r.data.notFound && !r.data.overLimit) {
        setRows(
          (prev) =>
            prev?.map((row) => (toAdd.includes(row.selectedAppId ?? -1) ? { ...row, added: true } : row)) ?? prev,
        );
      }
    });
  }

  const count = (s: ResolvedLine["status"]) => (rows ?? []).filter((r) => r.status === s).length;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const notFound = (rows ?? []).filter((r) => r.status === "notfound");

  if (rows == null) {
    return (
      <div className="space-y-3">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={"Um jogo por linha, por exemplo:\nHades\nHollow Knight\nStardew Valley"}
          className="w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`text-xs ${tooMany ? "text-danger" : "text-muted"}`}>
            {tooMany
              ? `Máximo de ${MAX_BULK_NAMES} por vez (você colou ${lines.length}). Divida em partes.`
              : `${lines.length}/${MAX_BULK_NAMES} · dá para colar uma coluna do Notion ou do Excel, ou links da loja.`}
          </p>
          <button
            type="button"
            disabled={!lines.length || tooMany}
            onClick={search}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            Buscar {lines.length || ""} {lines.length === 1 ? "jogo" : "jogos"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {progress ? (
        <div className="space-y-1.5">
          <p className="text-sm text-muted">
            Buscando {Math.min(progress.done + 1, progress.total)} de {progress.total}…
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-accent-strong transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p>
            <span className="text-text">{plural(count("exact"), "encontrado", "encontrados")}</span>
            {count("approx") > 0 && <span className="text-amber-300"> · {count("approx")} para conferir</span>}
            {notFound.length > 0 && (
              <span className="text-danger"> · {plural(notFound.length, "não encontrado", "não encontrados")}</span>
            )}
            {count("error") > 0 && <span className="text-danger"> · {count("error")} com falha</span>}
          </p>
          <div className="flex gap-3 text-xs">
            {count("error") > 0 && (
              <button type="button" onClick={retryFailed} className="text-accent hover:underline">
                Tentar de novo os que falharam
              </button>
            )}
            {notFound.length > 0 && (
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(notFound.map((r) => r.query).join("\n"))}
                className="text-accent hover:underline"
              >
                Copiar não encontrados
              </button>
            )}
            <button type="button" onClick={() => setRows(null)} className="text-muted hover:text-text">
              Voltar e editar
            </button>
          </div>
        </div>
      )}

      <ul className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
        {rows.map((r) => {
          const selected = r.alternatives.find((a) => a.appId === r.selectedAppId) ?? null;
          const already = inList(r);
          const repeat = isRepeat(r);
          return (
            <li key={r.key} className={`flex items-center gap-3 rounded-md border p-2 ${STATUS_STYLE[r.status]}`}>
              {r.status === "notfound" || r.status === "error" ? (
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="text-danger">
                      {r.status === "notfound" ? "Não encontrado:" : "Falha na busca:"}
                    </span>{" "}
                    <span className="break-words">{r.query}</span>
                  </span>
                  {r.status === "notfound" && (
                    <button
                      type="button"
                      onClick={() => onSearchOne(r.query)}
                      className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs hover:border-accent hover:text-accent"
                    >
                      Buscar individualmente
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={r.checked && !already && !repeat && !r.added && selected != null}
                    disabled={already || repeat || r.added || selected == null}
                    onChange={(e) => update(r.key, { checked: e.target.checked })}
                    aria-label={`Adicionar ${selected?.name ?? r.query}`}
                    className="shrink-0 accent-[var(--accent-strong)]"
                  />
                  {selected?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.image}
                      alt=""
                      className={`aspect-[231/87] w-20 shrink-0 rounded object-cover ${already || repeat || r.added ? "opacity-50" : ""}`}
                    />
                  ) : (
                    <div className="aspect-[231/87] w-20 shrink-0 rounded bg-surface-3" />
                  )}
                  <div className="min-w-0 flex-1">
                    {r.status === "approx" && r.alternatives.length > 1 ? (
                      <select
                        value={r.selectedAppId ?? ""}
                        onChange={(e) => {
                          const appId = e.target.value ? Number(e.target.value) : null;
                          update(r.key, { selectedAppId: appId, checked: appId != null && !existing.has(appId) });
                        }}
                        aria-label={`Escolher o jogo para "${r.query}"`}
                        className="w-full truncate rounded border border-border bg-bg px-1.5 py-1 text-sm outline-none focus:border-accent"
                      >
                        {r.alternatives.map((a) => (
                          <option key={a.appId} value={a.appId}>
                            {a.name}
                          </option>
                        ))}
                        <option value="">Nenhum destes</option>
                      </select>
                    ) : (
                      <p className="truncate text-sm">{selected?.name ?? r.query}</p>
                    )}
                    <p className="truncate text-xs text-muted">
                      {r.added ? (
                        <span className="text-positive">Adicionado ✓</span>
                      ) : repeat ? (
                        "Repetido: já aparece acima"
                      ) : already ? (
                        "Já está na lista"
                      ) : r.status === "approx" ? (
                        <span className="text-amber-300">Confira · você digitou “{r.query}”</span>
                      ) : selected?.priceFinal != null ? (
                        formatPrice(selected.priceFinal)
                      ) : (
                        "—"
                      )}
                    </p>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {message && <p className="rounded-md bg-surface-2 px-3 py-2 text-sm">{message}</p>}

      {!progress && (
        <button
          type="button"
          disabled={!toAdd.length || adding}
          onClick={add}
          className="w-full rounded-md bg-accent-strong py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {adding ? "Adicionando…" : `Adicionar ${toAdd.length} ${toAdd.length === 1 ? "jogo" : "jogos"}`}
        </button>
      )}
    </div>
  );
}
