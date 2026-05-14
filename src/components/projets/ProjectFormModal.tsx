"use client";

import type { Projet } from "@/types/projet";

type ProjectFormModalProps = {
  open: boolean;
  initialProject?: Projet | null;
  onClose: () => void;
  onSaved: (project: Projet) => void;
};

export function ProjectFormModal({ open, onClose }: ProjectFormModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-2xl">
        <div className="font-semibold text-slate-900">Nouveau projet</div>
        <button className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
