"use client";

import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";

type Props = {
  children: ReactNode;
  storageKey?: string; // persiste l'état (optionnel)
  defaultOpen?: boolean;
  widthOpen?: number; // px
  widthClosed?: number; // px
  title?: string;
};

export function RightDock({
  children,
  storageKey = "rightDockOpen",
  defaultOpen = true,
  widthOpen = 360,
  widthClosed = 44,
  title = "Panneau",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  // Restore persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "0") setOpen(false);
      if (raw === "1") setOpen(true);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, open ? "1" : "0");
    } catch {}
  }, [open, storageKey]);

  // Shortcut: Alt + \
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "\\") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      // Escape = ferme si ouvert
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const w = open ? widthOpen : widthClosed;

  return (
    <aside
      className={clsx(
        "relative h-full border-l border-slate-800 bg-slate-950/70 backdrop-blur-md",
        "transition-[width] duration-200 ease-out",
      )}
      style={{ width: w }}
      aria-label={title}
    >
      {/* Handle / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "absolute left-0 top-0 z-20 h-full",
          "w-[44px] border-r border-slate-800 bg-slate-950/60 hover:bg-slate-900/70",
          "flex items-center justify-center",
          "text-slate-300 hover:text-slate-100",
        )}
        title={open ? "Réduire (Alt+\\)" : "Ouvrir (Alt+\\)"}
        aria-expanded={open}
      >
        <span className="text-xs font-semibold rotate-90 select-none">
          {open ? "MASQUER" : "PANNEAU"}
        </span>
      </button>

      {/* Content */}
      <div
        className={clsx(
          "h-full overflow-y-auto",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
          "transition-opacity duration-150",
        )}
        style={{ paddingLeft: 44 }}
      >
        <div className="p-4">{children}</div>
      </div>
    </aside>
  );
}
