// components/ui/Tag.tsx
"use client";

import { ReactNode } from "react";
import clsx from "clsx";

/**
 * Compat:
 * - ancien: <Tag color="green" />
 * - parfois: <Tag variant="outline" />
 */
interface TagProps {
  children: ReactNode;
  color?: "default" | "green" | "orange" | "red";
  variant?: "solid" | "outline";
  className?: string;
}

export function Tag({
  children,
  color = "default",
  variant = "outline",
  className,
}: TagProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

  const styles: Record<NonNullable<TagProps["color"]>, { outline: string; solid: string }> = {
    default: {
      outline:
        "border border-[color:var(--border)] text-[color:var(--muted)] bg-transparent",
      solid:
        "border border-[color:var(--border)] text-[color:var(--text)] bg-[color:var(--surface-2)]",
    },
    green: {
      outline:
        "border border-[color:var(--green)]/35 text-[color:var(--green)] bg-[color:var(--green-weak-2)]",
      solid:
        "border border-[color:var(--green)] text-white bg-[color:var(--green)]",
    },
    orange: {
      outline:
        "border border-[color:var(--orange)]/35 text-[color:var(--orange)] bg-[color:var(--orange-weak-2)]",
      solid:
        "border border-[color:var(--orange)] text-white bg-[color:var(--orange)]",
    },
    red: {
      outline:
        "border border-[color:var(--danger)]/35 text-[color:var(--danger)] bg-[color:var(--danger-weak)]",
      solid:
        "border border-[color:var(--danger)] text-white bg-[color:var(--danger)]",
    },
  };

  return (
    <span className={clsx(base, styles[color][variant], className)}>
      {children}
    </span>
  );
}
