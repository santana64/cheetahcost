// components/ui/Modal.tsx
"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { FaTimes } from "react-icons/fa";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const modalRoot =
    typeof document !== "undefined"
      ? (document.getElementById("modal-root") as HTMLElement) ?? document.body
      : null;

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !modalRoot) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
      <div
        className="w-full max-w-xl rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[var(--shadow)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-[color:var(--border-2)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[color:var(--text)]">{title}</h2>
          <Button variant="ghost" size="xs" className="p-2" onClick={onClose}>
            <FaTimes />
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 text-sm text-[color:var(--text)]">
          {children}
        </div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border-2)] px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    modalRoot,
  );
}
