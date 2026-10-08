import type { ReactNode } from "react";
import { colorHex } from "@/lib/collections";

type Props = {
  name: string;
  color: string;
  /** Filter chips: highlighted with a border when selected. */
  active?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

/** A user collection: colored pill with a dot, visually distinct from the grey Steam tags. */
export function CollectionPill({ name, color, active, onClick, children }: Props) {
  const hex = colorHex(color);
  const className = `inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-px text-[11px] font-medium ${
    onClick ? "transition-colors hover:brightness-110" : ""
  }`;
  const style = { color: hex, backgroundColor: `${hex}26`, borderColor: active ? hex : "transparent" };
  const content = (
    <>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
      <span className="truncate">{name}</span>
      {children}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={className} style={style}>
      {content}
    </button>
  ) : (
    <span className={className} style={style}>
      {content}
    </span>
  );
}
