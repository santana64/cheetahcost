// src/lib/normalize.ts
import type { Projet, LotTache } from "@/types/projet";

export function ensureDefaultLot(project: Projet): Projet {
  const lots = Array.isArray(project.lots) ? project.lots : [];

  if (lots.length > 0) return project;

  const defaultLot: LotTache = {
    id: "LOT_AUCUN",
    code: "AUCUN",
    libelle: "Aucun",
    budgetInitial: 0,
  };

  // Important: si des bilans existent, il faut aussi garantir une ligne pour ce lot
  const bilans = (project.bilans ?? []).map((b) => {
    const already = b.lignes?.some((l) => l.lotId === defaultLot.id);
    if (already) return b;

    return {
      ...b,
      lignes: [
        ...(b.lignes ?? []),
        {
          lotId: defaultLot.id,
          variation: 0,
          depenses: 0,
          avancementPhysique: 0,
          resteAFaire: 0,
          commentaire: "",
        },
      ],
    };
  });

  return { ...project, lots: [defaultLot], bilans };
}
