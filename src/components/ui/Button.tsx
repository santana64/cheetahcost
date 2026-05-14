// components/ui/Button.tsx
"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "orange";
type Size = "xs" | "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

const sizeClasses: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[11px] rounded-md gap-1.5",
  sm: "h-8 px-3 text-[12px] rounded-lg gap-1.5",
  md: "h-9 px-3.5 text-[13px] rounded-lg gap-2",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--green)] hover:bg-[var(--green-2)] text-white shadow-[0_1px_3px_rgba(63,143,72,0.35),inset_0_1px_0_rgba(255,255,255,0.14)] hover:shadow-[0_2px_6px_rgba(63,143,72,0.40)]",
  secondary:
    "bg-white hover:bg-slate-50 border border-[rgba(0,0,0,0.12)] text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
  danger:
    "bg-red-600 hover:bg-red-500 text-white shadow-[0_1px_3px_rgba(220,38,38,0.35)]",
  ghost:
    "bg-transparent hover:bg-black/6 text-slate-600 hover:text-slate-900",
  orange:
    "bg-[var(--orange)] hover:bg-[var(--orange-2)] text-[#1a0e00] font-semibold shadow-[0_1px_3px_rgba(217,119,6,0.35)]",
};

export function Button({
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "active:scale-[0.97] active:brightness-95",
        "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)]/50 focus-visible:ring-offset-1",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {iconLeft ? <span className="flex-shrink-0 leading-none">{iconLeft}</span> : null}
      <span className="leading-none">{children}</span>
      {iconRight ? <span className="flex-shrink-0 leading-none">{iconRight}</span> : null}
    </button>
  );
}
