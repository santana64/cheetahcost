import type { Projet } from "@/types/projet";

export function getCostUnitLabel(project: Pick<Projet, "uniteCoutType" | "uniteCoutLibelle" | "monnaie" | "tvaMode" | "valeurMode" | "valeurReference" | "typeCout">): string {
  if (project.uniteCoutType === "charge") return project.uniteCoutLibelle || "jour/personne";

  const valueLabel =
    project.valeurMode === "constante"
      ? `aux C.E. de ${project.valeurReference || "mm/aaaa"}`
      : "courant(e)";

  return `${project.monnaie || "EUR"} ${project.tvaMode || "HT"}, ${valueLabel}`;
}

export function getPanelUnitLabel(project: Projet): string {
  return `${getCostUnitLabel(project)}, ${project.typeCout}`;
}

export function isProjectInProgress(project: Projet): boolean {
  return String(project.status ?? "").toLowerCase().includes("cours");
}

export function formatMoneyLike(value: number, unit: string): string {
  return `${(Number(value) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${unit}`;
}
