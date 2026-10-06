"use client";

import type { ReactNode } from "react";
import { DEFAULT_FILTERS, isFiltering, type Filters, type ReleaseFilter, type TriState } from "@/lib/filters";

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  genres: { name: string; count: number }[];
};

const inputClass =
  "w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm outline-none placeholder:text-muted/60 focus:border-accent";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        active ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-md border border-border bg-bg p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-2 py-1 transition-colors ${
            value === o.value ? "bg-surface-3 text-text" : "text-muted hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPanel({ filters, onChange, genres }: Props) {
  const toggleGenre = (name: string) =>
    onChange({
      genres: filters.genres.includes(name) ? filters.genres.filter((g) => g !== name) : [...filters.genres, name],
    });

  return (
    <div className="space-y-6">
      <Section title="Preço (R$)">
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            placeholder="Mín."
            value={filters.priceMin}
            onChange={(e) => onChange({ priceMin: e.target.value })}
            className={inputClass}
            aria-label="Preço mínimo"
          />
          <span className="text-muted">–</span>
          <input
            inputMode="decimal"
            placeholder="Máx."
            value={filters.priceMax}
            onChange={(e) => onChange({ priceMax: e.target.value })}
            className={inputClass}
            aria-label="Preço máximo"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["20", "50", "100"].map((v) => (
            <Chip
              key={v}
              active={filters.priceMax === v && !filters.priceMin}
              onClick={() => onChange({ priceMin: "", priceMax: filters.priceMax === v ? "" : v })}
            >
              Até R$ {v}
            </Chip>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm">
          <input
            type="checkbox"
            checked={filters.onSale}
            onChange={(e) => onChange({ onSale: e.target.checked })}
            className="accent-[var(--accent-strong)]"
          />
          Só em promoção
        </label>
      </Section>

      <Section title="Avaliação positiva mínima">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Ex.: 95"
            value={filters.minReview}
            onChange={(e) => onChange({ minReview: e.target.value })}
            className={inputClass}
            aria-label="Avaliação positiva mínima em porcentagem"
          />
          <span className="text-sm text-muted">%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["80", "90", "95"].map((v) => (
            <Chip key={v} active={filters.minReview === v} onClick={() => onChange({ minReview: filters.minReview === v ? "" : v })}>
              {v}%+
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Acesso antecipado">
        <Segmented<TriState>
          value={filters.earlyAccess}
          onChange={(earlyAccess) => onChange({ earlyAccess })}
          options={[
            { value: "any", label: "Todos" },
            { value: "only", label: "Só EA" },
            { value: "exclude", label: "Ocultar" },
          ]}
        />
      </Section>

      <Section title="Lançamento">
        <Segmented<ReleaseFilter>
          value={filters.release}
          onChange={(release) => onChange({ release })}
          options={[
            { value: "any", label: "Todos" },
            { value: "released", label: "Lançados" },
            { value: "upcoming", label: "Em breve" },
          ]}
        />
      </Section>

      <Section title="Gêneros">
        {genres.length === 0 && <p className="text-sm text-muted">Nenhum gênero ainda.</p>}
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <Chip key={g.name} active={filters.genres.includes(g.name)} onClick={() => toggleGenre(g.name)}>
              {g.name} <span className="opacity-60">{g.count}</span>
            </Chip>
          ))}
        </div>
      </Section>

      {isFiltering(filters) && (
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort, dir: filters.dir })}
          className="w-full rounded-md border border-border py-1.5 text-sm text-muted hover:text-text"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
