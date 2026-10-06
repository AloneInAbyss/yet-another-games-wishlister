"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./Icons";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-border bg-surface p-0 text-text"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="text-muted hover:text-text">
          <XIcon />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
