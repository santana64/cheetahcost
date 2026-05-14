// components/ui/ToastProvider.tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  pushToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `toast_${Math.random().toString(36).slice(2, 10)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2800);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ pushToast }}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center">
        <div className="flex max-w-lg flex-col gap-2 px-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={clsx(
                "pointer-events-auto rounded-2xl border px-4 py-2 text-xs shadow-[var(--shadow-soft)]",
                "bg-[color:var(--surface)] border-[color:var(--border)] text-[color:var(--text)]",
                toast.type === "success" &&
                  "border-[color:var(--green)]/35 bg-[color:var(--green-weak-2)]",
                toast.type === "error" &&
                  "border-[color:var(--danger)]/35 bg-[color:var(--danger-weak)]",
                toast.type === "info" &&
                  "border-[color:var(--orange)]/35 bg-[color:var(--orange-weak-2)]",
              )}
            >
              {toast.message}
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
