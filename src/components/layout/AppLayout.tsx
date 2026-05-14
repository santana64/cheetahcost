// components/layout/AppLayout.tsx
"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {children}
      </main>
    </div>
  );
}
