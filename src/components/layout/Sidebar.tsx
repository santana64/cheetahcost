"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiGrid, FiFolder, FiPlusCircle } from "react-icons/fi";
import type { ReactNode } from "react";

type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
  matchPrefix?: boolean;
  shortcut?: string;
};

const items: SidebarItem[] = [
  { label: "Projets en cours", href: "/projets/encours", icon: <FiFolder size={14} />, shortcut: "⌘1" },
  { label: "Nouveau projet", href: "/projets/nouveau", icon: <FiPlusCircle size={14} />, shortcut: "⌘N" },
  { label: "Tous les projets", href: "/projets/liste", icon: <FiFolder size={14} />, matchPrefix: false, shortcut: "⌘2" },
  { label: "Tableau de bord PMO", href: "/dashboard", icon: <FiGrid size={14} />, shortcut: "⌘3" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-[220px] flex-shrink-0 flex-col overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #162c1e 0%, #1a3525 100%)",
        borderRight: "1px solid rgba(0,0,0,0.25)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            src="/logo-cheetahsoft.jpg"
            alt="CheetahSoft logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full object-cover"
            priority
          />
        </div>
        <div>
          <div className="text-[13.5px] font-bold tracking-tight text-white leading-tight">
            CheetahCost
          </div>
          <div
            className="mt-0.5 text-[10px] font-medium leading-tight"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            Méthode FGF
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col px-3 pt-4 pb-3">
        <div
          className="mb-3 px-1.5 text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Espace de travail
        </div>

        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.matchPrefix && pathname?.startsWith(item.href) && item.href !== "/dashboard");

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex items-center gap-2.5 rounded-lg py-2.5 pl-3.5 pr-2.5 transition-all duration-150"
                style={{
                  color: active ? "#ffffff" : "rgba(255,255,255,0.50)",
                  background: active ? "rgba(86,164,91,0.13)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px rgba(86,164,91,0.18)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.055)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.78)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.50)";
                  }
                }}
              >
                {/* Active left accent pill */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                    style={{ width: 3, height: 20, background: "#56a45b", flexShrink: 0 }}
                  />
                )}

                <span
                  className="flex-shrink-0 transition-colors duration-150"
                  style={{ color: active ? "#7fcf80" : "rgba(255,255,255,0.26)" }}
                >
                  {item.icon}
                </span>

                <span className="flex-1 text-[12.5px] font-medium leading-tight">
                  {item.label}
                </span>

                {item.shortcut && (
                  <span
                    className="flex-shrink-0 rounded px-1 py-0.5 text-[9px] font-mono opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
                    {item.shortcut}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer divider */}
        <div
          className="my-4 mx-1.5"
          style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
        />

        {/* Status indicator */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(86,164,91,0.07)", border: "1px solid rgba(86,164,91,0.12)" }}
        >
          <span
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
            style={{ background: "#56a45b", boxShadow: "0 0 6px rgba(86,164,91,0.8)" }}
          />
          <span className="text-[10.5px] font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>
            Données locales actives
          </span>
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex items-center gap-2.5 px-4 py-3.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <Image
            src="/logo-cheetahsoft.jpg"
            alt="CheetahSoft"
            width={24}
            height={24}
            className="h-6 w-6 rounded-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <div
            className="truncate text-[10px] font-semibold"
            style={{ color: "rgba(255,255,255,0.32)" }}
          >
            CheetahSoft
          </div>
          <div className="truncate text-[9px]" style={{ color: "rgba(255,255,255,0.16)" }}>
            Coûtenance FGF v1
          </div>
        </div>
      </div>
    </aside>
  );
}
