// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "CheetahCost – Méthode FGF de Coûtenance",
  description: "Pilotage des coûts de projet selon la méthode FGF de Coûtenance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <div id="modal-root" />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
