"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import type { LotTache } from "@/types/projet";

type LotsEditorProps = {
  open: boolean;
  lots?: LotTache[];
  monnaie?: string;
  onClose: () => void;
  onUpdated: (updatedLots: LotTache[]) => void;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 9)}`;
}

function safeNumber(value: string): number {
  const number = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function nextLBCode(lots: LotTache[]) {
  const used = new Set(lots.map((lot) => String(lot.code || "").trim()).filter(Boolean));
  for (let index = 1; index < 999; index += 1) {
    const code = `LB${String(index).padStart(2, "0")}`;
    if (!used.has(code)) return code;
  }
  return `LB${lots.length + 1}`;
}

export function LotsEditor({ open, lots, monnaie, onClose, onUpdated }: LotsEditorProps) {
  const safeLots = useMemo(() => (Array.isArray(lots) ? lots : []), [lots]);
  const [draft, setDraft] = useState<LotTache[]>(safeLots);
  const unit = (monnaie && monnaie.trim()) || "EUR";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setDraft(safeLots);
    });
    return () => {
      cancelled = true;
    };
  }, [open, safeLots]);

  const totalBI = useMemo(() => draft.reduce((sum, lot) => sum + (Number(lot.budgetInitial) || 0), 0), [draft]);

  if (!open || typeof document === "undefined") return null;

  const addLB = () => {
    setDraft((previous) => [
      ...previous,
      {
        id: generateId(),
        code: nextLBCode(previous),
        libelle: "",
        budgetInitial: 0,
      },
    ]);
  };

  const addPTO = () => {
    setDraft((previous) => {
      if (previous.some((lot) => String(lot.code ?? "").toUpperCase() === "PTO")) return previous;
      return [
        ...previous,
        {
          id: generateId(),
          code: "PTO",
          libelle: "Provision pour Tâches Oubliées",
          budgetInitial: 0,
        },
      ];
    });
  };

  const removeLot = (id: string) => {
    setDraft((previous) => previous.filter((lot) => lot.id !== id));
  };

  const patchLot = (id: string, patch: Partial<LotTache>) => {
    setDraft((previous) => previous.map((lot) => (lot.id === id ? { ...lot, ...patch } : lot)));
  };

  const handleSave = () => {
    const cleaned = draft.map((lot, index) => ({
      id: lot.id || generateId(),
      code: (lot.code || nextLBCode(draft.slice(0, index))).trim(),
      libelle: (lot.libelle || `Ligne budgétaire ${index + 1}`).trim(),
      budgetInitial: Number(lot.budgetInitial) || 0,
    }));
    onUpdated(cleaned);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Modifier les lignes budgétaires</div>
            <div className="mt-1 text-[11px] text-slate-500">
              Structure budgétaire du projet. Unité : <span className="font-semibold text-slate-900">{unit}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={addPTO}>
                Ajouter PTO
              </Button>
              <Button size="sm" onClick={addLB}>
                Ajouter une LB
              </Button>
            </div>
            <div className="text-xs text-slate-500">
              Total BI :{" "}
              <span className="font-semibold text-slate-900">
                {totalBI.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {unit}
              </span>
            </div>
          </div>

          {draft.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
              Aucune ligne budgétaire.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full border-collapse text-[11px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 text-left">Code</th>
                    <th className="border-b border-slate-200 px-3 py-2 text-left">Libellé</th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">Budget initial</th>
                    <th className="border-b border-slate-200 px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.map((lot) => (
                    <tr key={lot.id} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        <input
                          className="w-24 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none focus:border-emerald-500"
                          value={lot.code ?? ""}
                          onChange={(event) => patchLot(lot.id, { code: event.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-[420px] max-w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-900 outline-none focus:border-emerald-500"
                          value={lot.libelle ?? ""}
                          onChange={(event) => patchLot(lot.id, { libelle: event.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          className="w-36 rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-[11px] text-slate-900 outline-none focus:border-emerald-500"
                          value={String(lot.budgetInitial ?? 0)}
                          onChange={(event) => patchLot(lot.id, { budgetInitial: safeNumber(event.target.value) })}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="xs" variant="danger" onClick={() => removeLot(lot.id)}>
                          Supprimer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer les LB</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
