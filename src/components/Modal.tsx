"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./Icons";

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
  /** Set to false when an accidental click outside would throw away work in progress. */
  closeOnBackdrop?: boolean;
};

export function Modal({ title, onClose, children, size = "md", closeOnBackdrop = true }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => closeOnBackdrop && e.target === ref.current && ref.current.close()}
      className={`m-auto w-[calc(100%-2rem)] ${size === "lg" ? "max-w-2xl" : "max-w-lg"} rounded-xl border border-border bg-surface p-0 text-text`}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Fechar"
          className="text-muted hover:text-text"
        >
          <XIcon />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}
