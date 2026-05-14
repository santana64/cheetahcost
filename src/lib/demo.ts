// src/lib/demo.ts
import { Projet, LotTache, BilanPilotage, LigneBilan } from "@/types/projet";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(36).slice(2, 9)}`;
}

function createLots(): LotTache[] {
  return [
    { id: generateId(), code: "LT01", libelle: "Études / Conception", budgetInitial: 80_000 },
    { id: generateId(), code: "LT02", libelle: "Gros œuvre", budgetInitial: 420_000 },
    { id: generateId(), code: "LT03", libelle: "Second œuvre", budgetInitial: 260_000 },
    { id: generateId(), code: "LT04", libelle: "Finitions", budgetInitial: 140_000 },
  ];
}

function generateBilans(dateDebut: string, dateFin: string, lots: LotTache[]): BilanPilotage[] {
  // nbB2P = 1 B2P0 baseline + 5 periodic bilans (i-1)
  const nbPeriodic = 5;
  const nbTotal = nbPeriodic + 1;
  const start = new Date(dateDebut).getTime();
  const end = new Date(dateFin).getTime();
  const safeStart = Number.isFinite(start) ? start : Date.now();
  const safeEnd = Number.isFinite(end) && end > safeStart ? end : safeStart + 1000 * 60 * 60 * 24 * 120;
  const step = (safeEnd - safeStart) / nbPeriodic;

  const bilans: BilanPilotage[] = [];
  for (let i = 0; i < nbTotal; i++) {
    const date = new Date(safeStart + step * i).toISOString().slice(0, 10);

    // B2P0 (i=0): baseline — no actuals yet, all zeros
    if (i === 0) {
      const lignes: LigneBilan[] = lots.map((lot) => ({
        lotId: lot.id,
        variation: 0,
        depenses: 0,
        avancementPhysique: 0,
        resteAFaire: 0,
        commentaire: "",
      }));
      bilans.push({ id: generateId(), numero: 0, date, tableKind: "b2p0", lignes });
      continue;
    }

    // Periodic bilans (i=1..5): real progress data
    const progress = i / nbPeriodic;

    const lignes: LigneBilan[] = lots.map((lot, index) => {
      let variation = 0;
      if (index === 1) variation = Math.round(lot.budgetInitial * 0.12 * progress);
      if (index === 2) variation = Math.round(-lot.budgetInitial * 0.05 * progress);

      const budgetADate = lot.budgetInitial + variation;
      const baseProgress = progress * 100;

      const avancementPhysique = Math.min(
        100,
        Math.round(index === 0 ? baseProgress * 1.1 : index === 3 ? baseProgress * 0.9 : baseProgress),
      );

      const ratioDepenses = progress * 0.85 + (index === 1 ? 0.1 : 0) + (index === 3 ? -0.05 : 0);
      const depenses = Math.round(budgetADate * ratioDepenses);
      const resteAFaire = Math.max(0, Math.round(budgetADate - depenses));

      let commentaire = "";
      if (i === 2 && index === 1) commentaire = "Dérive sur le gros œuvre, à surveiller.";
      if (i === 4 && index === 1) commentaire = "Actions correctives engagées, dérive stabilisée.";
      if (i === 5 && index === 3) commentaire = "Finitions comprimées pour tenir le budget.";

      return { lotId: lot.id, variation, depenses, avancementPhysique, resteAFaire, commentaire };
    });

    bilans.push({ id: generateId(), numero: i, date, tableKind: "i-1", lignes });
  }

  return bilans;
}

export function createDemoProject(): Projet {
  const now = new Date();
  const dateDebut = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 15).toISOString().slice(0, 10);
  const dateFin = new Date(now.getFullYear(), now.getMonth() + 4, now.getDate()).toISOString().slice(0, 10);

  const lots = createLots();
  const bilans = generateBilans(dateDebut, dateFin, lots);
  const isoNow = now.toISOString();

  return {
    id: generateId(),
    nom: "DEMO – Immeuble A (FGF)",
    phase: "Réalisation",
    dateDebut,
    dateFin,

    monnaie: "EUR",
    typeCout: "engagé",
    status: "🟢 En cours",

    // ✅ nouveaux champs demandés
    uniteCoutType: "monetaire",
    uniteCoutLibelle: "EUR",
    tvaMode: "HT",
    valeurMode: "courante",

    lots,
    bilans,
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}
