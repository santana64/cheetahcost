// components/ui/Card.tsx
"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-[var(--border)]",
        "bg-[var(--panel)] backdrop-blur-md",
        "shadow-[0_10px_30px_rgba(0,0,0,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "border-b border-[var(--border)] px-5 py-4 flex items-center justify-between gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-wide text-[var(--text)]">
      {children}
    </h2>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("px-5 py-4 text-sm text-[var(--text)]", className)}>
      {children}
    </div>
  );
}
