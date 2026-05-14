// src/types/projet.ts

export type ProjetStatus = "En cours" | "En attente" | "Terminé" | "🟢 En cours" | "🟡 En attente" | "🔴 Terminé";
export type TypeCout = "encouru" | "engagé";

// ✅ NOUVEAU : unité de coût (monétaire OU charge)
export type UniteCoutType = "monetaire" | "charge";

// ✅ NOUVEAU : HT/TTC
export type TvaMode = "HT" | "TTC";

// ✅ NOUVEAU : valeur courante / constante
export type ValeurMode = "courante" | "constante";
export type BilanTableKind = "b2p0" | "i-1" | "i-2j" | "i-2";

export type AuditAction =
  | "project_created"
  | "project_updated"
  | "lots_updated"
  | "plan_updated"
  | "b2p_created"
  | "b2p_saved"
  | "b2p_promoted"
  | "b2p_locked"
  | "b2p_unlocked"
  | "excel_clipboard_import"
  | "export_created";

export type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  label: string;
  details?: string;
  bilanId?: string;
  lotId?: string;
};

export type ProjectVersion = {
  id: string;
  at: string;
  label: string;
  bilansCount: number;
  lotsCount: number;
  totalBudgetInitial: number;
};

export type LotTache = {
  id: string;
  code?: string;
  libelle: string;
  budgetInitial: number; // BI (dans l’unité de coût du projet)
};

export type LigneBilan = {
  lotId: string;
  variation: number;
  depenses: number;
  avancementPhysique: number; // 0–100
  resteAFaire: number;
  commentaire?: string;
};

export type BilanPilotage = {
  id: string;
  numero: number;
  date: string; // ISO
  triggerDate?: string; // Date de déclenchement du B2P
  tableKind?: BilanTableKind;
  scenarioIndex?: number;
  label?: string;
  lignes: LigneBilan[];
};

export type Projet = {
  id: string;
  nom: string;
  phase: "Réalisation";
  dateDebut: string;
  dateFin: string;

  // ✅ monnaie reste utile même si unité=charge (ex: ref interne),
  // mais on la rend “ouverte” (string libre)
  monnaie: string;

  typeCout: TypeCout;
  status: ProjetStatus;

  // ✅ NOUVEAU : infos projet demandées dans l’évaluation
  uniteCoutType: UniteCoutType;      // monetaire | charge
  uniteCoutLibelle: string;          // ex: "EUR", "USD", "jour.homme", "heures"
  tvaMode: TvaMode;                  // HT | TTC
  valeurMode: ValeurMode;            // courante | constante
  valeurReference?: string;           // mm/aaaa si valeurMode = constante

  /** Nombre de chiffres après la virgule pour les montants (0, 1, 2). Défaut : 0 */
  precision?: number;

  b2pDates?: string[];
  nbB2P?: number;
  lockedBilanIds?: string[];
  auditTrail?: AuditEvent[];
  versions?: ProjectVersion[];

  lots: LotTache[];
  bilans: BilanPilotage[];
  createdAt: string;
  updatedAt: string;
};
