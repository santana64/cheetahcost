"use client";

import type React from "react";
import { useMemo, useState } from "react";

import { getBilanKind, getBilanLabel } from "@/lib/b2p";
import type { BilanTableKind } from "@/types/projet";
import { formatDateFR } from "@/lib/dates";
import { computeLigneDerivesFGF, isPTOLot } from "@/lib/fgf";
import { getCostUnitLabel } from "@/lib/projectLabels";
import type { BilanPilotage, LigneBilan, LotTache, Projet } from "@/types/projet";

interface B2PTableProps {
  projet: Projet;
  bilan: BilanPilotage;
  previousBilan?: BilanPilotage | null;
  onChangeLigne: (lotId: string, patch: Partial<LigneBilan>) => void;
  showFormulas?: boolean;
  readOnly?: boolean;
  filterMode?: "all" | "changed" | "risks" | "pto";
  query?: string;
}

type EditableField = "variation" | "depenses" | "avancementPhysique" | "resteAFaire" | "commentaire";

function n0(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fmtPrecFR(value: number, precision: number): string {
  return n0(value).toLocaleString("fr-FR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * §5.1 (NT.26.007) — Format « intelligent » utilisé sur la ligne « Projet » :
 * affiche jusqu'à `precision` décimales mais supprime les zéros inutiles.
 * Ex. (precision=1) : 100 → « 100 », 100,5 → « 100,5 », 100,55 → « 100,6 ».
 */
function fmtPrecSmart(value: number, precision: number): string {
  return n0(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}

/** @deprecated use fmtPrecFR(value, precision) */
function fmtIntFR(value: number): string {
  return fmtPrecFR(value, 0);
}

function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} %`;
}

function parseFRNumber(raw: string): number {
  const value = Number(String(raw ?? "").replace("%", "").replace(/\u00A0/g, " ").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function textValue(value: unknown) {
  return String(value ?? "");
}

/**
 * §6 (NT.26.008) — Affichage français des valeurs numériques dans les inputs éditables :
 *   - Virgule décimale ("0,5" et non "0.5")
 *   - Suppression des zéros de queue inutiles
 *   - Vide si la valeur est 0 ou nulle (l'utilisateur saisit librement)
 */
function fmtInputFR(value: unknown, precision: number): string {
  if (value === null || value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return "";
  return num.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(precision, 4),
  });
}

/**
 * §6 (NT.26.008) — Champ numérique avec saisie française.
 *
 * Le composant maintient un brouillon local (`draft`) tant que l'utilisateur tape :
 * le brouillon est ce qui s'affiche, indépendamment de la valeur committée. Cela
 * permet de saisir « 0, » puis « 5 » sans perdre la virgule entre deux re-rendus.
 *
 * Au blur (perte de focus) on parse via `parseFRNumber` (accepte virgule OU point)
 * et on commit la valeur numérique normalisée vers le store. Quand la valeur
 * change depuis l'extérieur (undo/redo, propagation i-1 → i-2j), le brouillon
 * est synchronisé automatiquement via `draft === null`.
 */
function NumberCellInput({
  value,
  precision,
  disabled,
  style,
  onCommit,
  format = fmtInputFR,
}: {
  value: unknown;
  precision: number;
  disabled?: boolean;
  style: React.CSSProperties;
  onCommit: (next: number) => void;
  /** Permet de surcharger le format (utilisé pour Avancement physique : entier). */
  format?: (value: unknown, precision: number) => string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft !== null ? draft : format(value, precision);

  return (
    <input
      disabled={disabled}
      style={style}
      value={display}
      onFocus={(event) => {
        setDraft(format(value, precision));
        // Sélectionne tout pour faciliter le remplacement.
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== null) onCommit(parseFRNumber(draft));
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function B2PTable({ projet, bilan, previousBilan, onChangeLigne, showFormulas, readOnly, filterMode = "all", query = "" }: B2PTableProps) {
  const unitLabel = getCostUnitLabel(projet);
  const b2pKind = getBilanKind(bilan);
  const isB2P0 = b2pKind === "b2p0";
  const precision = Math.max(0, Math.min(4, Number(projet.precision ?? 0)));
  const fmt = (v: number) => fmtPrecFR(v, precision);
  // §5.1 (NT.26.007) — Formatage « intelligent » réservé à la ligne « Projet ».
  const fmtSmart = (v: number) => fmtPrecSmart(v, precision);
  /** When the previous bilan is B2P0, its "écart" is meaningless (no actuals) — treat ePrec as 0 */
  const prevKind: BilanTableKind | null = previousBilan ? getBilanKind(previousBilan) : null;
  const prevIsB2P0 = prevKind === "b2p0";

  const allRows = useMemo(() => {
    const previousByLot = new Map<string, LigneBilan>();
    for (const line of previousBilan?.lignes ?? []) previousByLot.set(line.lotId, line);

    return (projet.lots ?? [])
      .slice()
      .sort((a, b) => Number(isPTOLot(a)) - Number(isPTOLot(b)))
      .map((lot) => {
        const line =
          bilan.lignes.find((candidate) => candidate.lotId === lot.id) ??
          ({
            lotId: lot.id,
            variation: 0,
            depenses: 0,
            avancementPhysique: 0,
            resteAFaire: 0,
            commentaire: "",
          } satisfies LigneBilan);

        // When previous bilan is B2P0, its actuals are all 0 which would produce ePrec = -BI.
      // B2P0 is the baseline reference — ePrec should be 0 for the first real B2P.
      const previousLine = prevIsB2P0 ? undefined : previousByLot.get(lot.id);
      return { lot, line, previousLine };
      });
  }, [bilan.lignes, previousBilan?.lignes, projet.lots, prevIsB2P0]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter(({ lot, line, previousLine }) => {
      if (q && !`${lot.code ?? ""} ${lot.libelle}`.toLowerCase().includes(q)) return false;
      const derives = computeLigneDerivesFGF(lot, line, previousLine);
      if (filterMode === "pto") return isPTOLot(lot);
      if (filterMode === "changed") {
        return (
          Number(line.variation ?? 0) !== 0 ||
          Number(line.depenses ?? 0) !== 0 ||
          Number(line.avancementPhysique ?? 0) !== 0 ||
          Number(line.resteAFaire ?? 0) !== 0 ||
          String(line.commentaire ?? "").trim().length > 0
        );
      }
      if (filterMode === "risks") {
        return derives.e > 0 || derives.varianceCout > 0 || Math.abs(derives.d) > Math.max(1, derives.budgetADate * 0.03);
      }
      return true;
    });
  }, [allRows, filterMode, query]);

  const totals = useMemo(() => {
    let bi = 0;
    let variation = 0;
    let bad = 0;
    let badNonPTO = 0; // §2.4 (NT.26.007) — dénominateur de l'avancement physique du projet
    let depenses = 0;
    let va = 0;
    let raf = 0;
    let cp = 0;
    let e = 0;
    let ePrec = 0;
    let d = 0;

    for (const row of allRows) {
      const derives = computeLigneDerivesFGF(row.lot, row.line, row.previousLine);
      const ptoRow = isPTOLot(row.lot);
      bi += derives.budgetInitial;
      variation += derives.variation;
      bad += derives.budgetADate;
      if (!ptoRow) badNonPTO += derives.budgetADate;
      depenses += derives.depenses;
      va += derives.valeurAcquise;
      raf += derives.resteAFaire;
      cp += derives.coutPrevisionnelTerminaison;
      e += derives.e;
      ePrec += derives.ePrec;
      d += derives.d;
    }

    return {
      bi,
      variation,
      bad,
      depenses,
      // §2.4 — Avancement physique projet = Σ(VA) / (Σ(BàD) − PTO). PTO exclu du dénominateur.
      avancement: badNonPTO > 0 ? va / badNonPTO : null,
      va,
      raf,
      cp,
      e,
      eOverBad: bad !== 0 ? e / bad : null,
      ePrec,
      d,
    };
  }, [allRows]);

  const commit = (lot: LotTache, field: EditableField, raw: string) => {
    if (field === "commentaire") {
      onChangeLigne(lot.id, { commentaire: raw });
      return;
    }

    const value = field === "avancementPhysique" ? clampPct(parseFRNumber(raw)) : parseFRNumber(raw);
    onChangeLigne(lot.id, { [field]: value } as Partial<LigneBilan>);
  };

  const S = {
    fontFamily: "Calibri, Arial, sans-serif",
    green: "#00B050",
    orange: "#F4A321",
    black: "#000000",
    white: "#FFFFFF",
    blue: "#1E4BD8",
    red: "#D90000",
    rafGreen: "#0A8F3D",
    grey: "#E5E7EB",
    grid: "1.5px solid #000",
    gridThin: "1px solid #000",
    headerH: 24,
    cellH: 21,
    fs: 10,
  } as const;
  const codeW = 72;
  const titleW = 260;

  const thBase: React.CSSProperties = {
    border: S.grid,
    padding: "4px 5px",
    fontSize: S.fs,
    lineHeight: "13px",
    color: S.black,
    background: S.orange,
    fontWeight: 700,
    textAlign: "center",
    verticalAlign: "middle",
    height: S.headerH,
    whiteSpace: "nowrap",
  };

  const tdBase: React.CSSProperties = {
    border: S.gridThin,
    padding: "2px 5px",
    fontSize: S.fs,
    lineHeight: "13px",
    color: S.black,
    background: S.white,
    verticalAlign: "middle",
    height: S.cellH,
    whiteSpace: "nowrap",
  };

  const tdSticky1: React.CSSProperties = { ...tdBase, position: "sticky", left: 0, zIndex: 3, background: S.white, width: codeW };
  const tdSticky2: React.CSSProperties = { ...tdBase, position: "sticky", left: codeW, zIndex: 3, background: S.white, width: titleW };
  const thSticky1: React.CSSProperties = { ...thBase, position: "sticky", left: 0, zIndex: 6, width: codeW };
  const thSticky2: React.CSSProperties = { ...thBase, position: "sticky", left: codeW, zIndex: 6, width: titleW };
  const tdRight: React.CSSProperties = { ...tdBase, textAlign: "right" };
  const tdCenter: React.CSSProperties = { ...tdBase, textAlign: "center" };
  const tdLeft: React.CSSProperties = { ...tdBase, textAlign: "left" };
  const inputBase: React.CSSProperties = {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: S.fontFamily,
    fontSize: S.fs,
    lineHeight: "13px",
    padding: 0,
    margin: 0,
  };
  const lockedInput: React.CSSProperties = { ...inputBase, color: "#6B7280", cursor: "not-allowed" };

  const formula = (key: string) => {
    const map: Record<string, string> = {
      BI: "=Lot.BI",
      Variation: "=Saisie",
      "BàD": "=BI+Variation",
      Dépenses: "=Saisie",
      "Avancement physique": "=Saisie %",
      "Val. Acquise": "=BàD*Avancement",
      RàF: "=Saisie",
      CP: "=Dépenses+RàF",
      E: "=CP-BàD",
      "E/BàD": "=E/BàD",
      "E préc.": "=E(B2P précédent)",
      D: "=E-Epréc.",
    };
    return showFormulas ? map[key] ?? "" : "";
  };

  return (
    <div style={{ width: "100%", height: "100%", background: "transparent" }}>
      {/* §3.1 — Largeur totale ajustée aux colonnes harmonisées (BI=Variation=Avancement=65). */}
      <table
        style={{
          borderCollapse: "collapse",
          width: "1330px",
          fontFamily: S.fontFamily,
          border: S.grid,
          background: S.white,
        }}
      >
        <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
          <tr>
            <th colSpan={16} style={{ border: S.grid, background: S.green, color: S.black, fontWeight: 700, fontSize: 11, padding: "5px 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div>
                    {getBilanLabel(bilan)}{" "}
                    <span style={{ display: "inline-block", minWidth: 72, borderBottom: "2px solid #000" }}>
                      {formatDateFR(bilan.triggerDate ?? bilan.date)}
                    </span>
                  </div>
                  <div>
                    Projet :{" "}
                    <span style={{ display: "inline-block", minWidth: 210, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "bottom", borderBottom: "2px solid #000" }}>{projet.nom}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div>
                    Unités de coût : <span style={{ display: "inline-block", minWidth: 170 }}>{unitLabel}</span>
                  </div>
                  <div>
                    Coûts : <span style={{ display: "inline-block", minWidth: 60 }}>{projet.typeCout}</span>
                  </div>
                </div>
              </div>
            </th>
          </tr>

          <tr>
            <th style={{ ...thSticky1, borderTop: S.grid, borderBottom: S.grid }} colSpan={2}>
              Lignes Budgétaires
            </th>
            <th style={{ ...thBase, borderTop: S.grid, borderBottom: S.grid }} colSpan={3}>
              Budget
            </th>
            <th style={thBase} colSpan={3}>
              Travail effectué
            </th>
            <th style={thBase} colSpan={6}>
              Prévision
            </th>
            <th style={thBase} colSpan={2}>
              Obs.
            </th>
          </tr>

          <tr>
            <th style={{ ...thSticky1, textAlign: "left", width: codeW }}>Code</th>
            <th style={{ ...thSticky2, textAlign: "left", width: titleW }}>Intitulé</th>
            {/* §3.1 — Largeurs harmonisées : Variation et Avancement physique alignés sur BI (65). */}
            <th style={{ ...thBase, width: 65 }}>BI</th>
            <th style={{ ...thBase, width: 65 }}>Variation</th>
            <th style={{ ...thBase, width: 65 }}>BàD</th>
            <th style={{ ...thBase, color: S.red, width: 65 }}>Dépenses</th>
            <th style={{ ...thBase, color: S.blue, width: 65 }}>Avancement physique</th>
            <th style={{ ...thBase, color: S.blue, width: 65 }}>Val. Acquise</th>
            <th style={{ ...thBase, color: S.rafGreen, width: 65 }}>RàF</th>
            <th style={{ ...thBase, width: 65 }}>CP</th>
            <th style={{ ...thBase, width: 65 }}>E</th>
            <th style={{ ...thBase, width: 60 }}>E/BàD</th>
            <th style={{ ...thBase, width: 65 }}>E préc.</th>
            <th style={{ ...thBase, width: 65 }}>D</th>
            <th style={{ ...thBase, width: 150 }}>Obs.</th>
            <th style={{ ...thBase, width: 30 }} />
          </tr>
        </thead>

        <tbody>
          {rows.map(({ lot, line, previousLine }) => {
            const derives = computeLigneDerivesFGF(lot, line, previousLine);
            const isPTO = isPTOLot(lot);
            // §3.2 (NT.26.006) — Tableaux B2Pi-2j / B2Pi-2 retenus : Variation, Dépenses et
            // Avancement physique ne changent pas (héritent du B2Pi-1). Seul RàF est modifiable.
            const isI2Variant = b2pKind === "i-2" || b2pKind === "i-2j";
            const lockExecution = readOnly || isB2P0 || isPTO || isI2Variant;
            // §4.1 (NT.26.007) — Les valeurs de la colonne RàF doivent pouvoir être modifiées,
            // y compris dans les tableaux B2Pi-2j. RàF n'est verrouillé qu'en lecture seule.
            const lockRAF = readOnly;
            // Variation : verrouillée dans les tableaux i-2 / i-2j (budget non modifiable
            // entre scénarios — confirmé §4.1 « Variations de Budget interdites entre i-1 et i-2j »).
            const lockBudget = readOnly || isI2Variant;
            const greyForecast = isPTO ? { background: S.grey } : {};

            return (
              <tr key={lot.id}>
                {/* §2.1 (NT.26.007) — Les cases Code (« PTO ») et Libellé (« Provision… Oubliées »)
                    ne doivent PLUS être grisées sur la ligne PTO. */}
                <td style={tdSticky1}>{lot.code ?? ""}</td>
                <td style={tdSticky2}>{lot.libelle ?? ""}</td>
                <td style={tdRight}>{showFormulas ? formula("BI") : fmt(derives.budgetInitial)}</td>
                {/* §4.1 (NT.26.007) — Variation : verrouillée en i-2/i-2j mais PAS grisée.
                    §6 (NT.26.008) — Saisie en format français (virgule décimale). */}
                <td style={tdRight}>
                  <NumberCellInput
                    value={line.variation}
                    precision={precision}
                    disabled={lockBudget}
                    style={{ ...(lockBudget ? lockedInput : inputBase), textAlign: "right" }}
                    onCommit={(next) => onChangeLigne(lot.id, { variation: next })}
                  />
                </td>
                <td style={tdRight}>{showFormulas ? formula("BàD") : fmt(derives.budgetADate)}</td>
                {/* Dépenses — PTO : grey + empty ; B2P0 non-PTO : 0 lisible, pas de grey
                    §6 (NT.26.008) — Saisie en format français. */}
                <td style={{ ...tdRight, background: isPTO ? S.grey : S.white }}>
                  {isPTO ? (
                    <input disabled style={{ ...lockedInput, textAlign: "right" }} value="" readOnly />
                  ) : isB2P0 ? (
                    <input disabled style={{ ...lockedInput, textAlign: "right", color: "#6B7280" }} value="0" readOnly />
                  ) : (
                    <NumberCellInput
                      value={line.depenses}
                      precision={precision}
                      disabled={lockExecution}
                      style={{ ...(lockExecution ? lockedInput : inputBase), textAlign: "right", color: lockExecution ? "#6B7280" : S.red }}
                      onCommit={(next) => onChangeLigne(lot.id, { depenses: next })}
                    />
                  )}
                </td>
                {/* Avancement physique — PTO : grey + empty (pas de %) ; B2P0 : 0 %
                    §6 (NT.26.008) — Saisie en format français (entier 0–100). */}
                <td style={{ ...tdCenter, background: isPTO ? S.grey : S.white }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    {isPTO ? (
                      <input disabled style={{ ...lockedInput, width: 34, textAlign: "right" }} value="" readOnly />
                    ) : isB2P0 ? (
                      <input
                        disabled
                        style={{ ...lockedInput, width: 34, textAlign: "right", color: "#6B7280", fontWeight: 700 }}
                        value="0"
                        readOnly
                      />
                    ) : (
                      <NumberCellInput
                        value={line.avancementPhysique}
                        precision={0}
                        disabled={lockExecution}
                        style={{
                          ...(lockExecution ? lockedInput : inputBase),
                          width: 34,
                          textAlign: "right",
                          color: lockExecution ? "#6B7280" : S.blue,
                          fontWeight: 700,
                        }}
                        onCommit={(next) => onChangeLigne(lot.id, { avancementPhysique: clampPct(next) })}
                      />
                    )}
                    {!isPTO && <span style={{ color: lockExecution ? "#6B7280" : S.blue, fontWeight: 700 }}>%</span>}
                  </div>
                </td>
                {/* Valeur Acquise — grey only for PTO line (PTO has no avancement physique) */}
                <td style={{ ...tdRight, color: S.blue, fontWeight: 700, background: isPTO ? S.grey : S.white }}>{isPTO ? "" : (showFormulas ? formula("Val. Acquise") : fmt(isB2P0 ? 0 : derives.valeurAcquise))}</td>
                {/* §4.1 (NT.26.007) — RàF : éditable dans tous les bilans (y compris i-2j),
                    initialisée à BàD au B2P0, JAMAIS grisée.
                    §6 (NT.26.008) — Saisie en format français (virgule décimale). */}
                <td style={tdRight}>
                  <NumberCellInput
                    value={isB2P0 && Number(line.resteAFaire ?? 0) === 0 ? derives.budgetADate : line.resteAFaire}
                    precision={precision}
                    disabled={lockRAF}
                    style={{ ...(lockRAF ? lockedInput : inputBase), textAlign: "right", color: lockRAF ? "#6B7280" : S.rafGreen, fontWeight: 700 }}
                    onCommit={(next) => onChangeLigne(lot.id, { resteAFaire: next })}
                  />
                </td>
                {/* CP — for B2P0 : CP = BàD (per §2.1); for PTO : grey on E→D block */}
                <td style={{ ...tdRight, color: S.rafGreen, fontWeight: 700 }}>{showFormulas ? formula("CP") : fmt(isB2P0 ? derives.budgetADate : derives.coutPrevisionnelTerminaison)}</td>
                {/* E à D — 4 cases : grey + empty if PTO (per §2.2) ; otherwise show value (0 for B2P0) */}
                <td style={{ ...tdRight, color: S.rafGreen, fontWeight: 700, background: isPTO ? S.grey : S.white }}>{isPTO ? "" : (showFormulas ? formula("E") : fmt(isB2P0 ? 0 : derives.e))}</td>
                <td style={{ ...tdCenter, color: S.rafGreen, fontWeight: 700, background: isPTO ? S.grey : S.white }}>{isPTO ? "" : (showFormulas ? formula("E/BàD") : (isB2P0 ? fmtPct(0) : fmtPct(derives.budgetADate !== 0 ? derives.e / derives.budgetADate : null)))}</td>
                <td style={{ ...tdCenter, background: isPTO ? S.grey : S.white }}>{isPTO ? "" : (showFormulas ? formula("E préc.") : fmt(isB2P0 ? 0 : derives.ePrec))}</td>
                <td style={{ ...tdCenter, background: isPTO ? S.grey : S.white }}>{isPTO ? "" : (showFormulas ? formula("D") : fmt(isB2P0 ? 0 : derives.d))}</td>
                <td style={tdLeft}>
                  <input
                    disabled={readOnly}
                    style={{ ...inputBase, textAlign: "left" }}
                    value={textValue(line.commentaire)}
                    onChange={(event) => commit(lot, "commentaire", event.target.value)}
                  />
                </td>
                <td style={tdCenter} />
              </tr>
            );
          })}

          <tr aria-hidden="true">
            <td style={{ ...tdSticky1, height: 14 }}>&nbsp;</td>
            <td style={{ ...tdSticky2, height: 14 }}>&nbsp;</td>
            {Array.from({ length: 14 }).map((_, index) => (
              <td key={index} style={{ ...tdBase, height: 14 }}>
                &nbsp;
              </td>
            ))}
          </tr>

          {/* Projet — totaux. Pour B2P0 : CP = BàD, E = 0 (§2.1 NT.26.006).
              §2.4 (NT.26.007) — Formules niveau projet :
                Avancement physique = Σ(VA) / (Σ(BàD) − PTO)
                E = CP − BàD
                Epr = E(B2P précédent)
                D  = E − Epréc.
              §5.1 (NT.26.007) — Format intelligent : 0 décimale minimum, `precision`
              décimales maximum (suppression des zéros inutiles). */}
          <tr>
            <td style={{ ...thSticky1, textAlign: "center" }} colSpan={2}>
              Projet
            </td>
            <td style={{ ...thBase, textAlign: "right" }}>{showFormulas ? "=Σ(BI)" : fmtSmart(totals.bi)}</td>
            <td style={{ ...thBase, textAlign: "right" }}>{showFormulas ? "=Σ(Variation)" : fmtSmart(totals.variation)}</td>
            <td style={{ ...thBase, textAlign: "right" }}>{showFormulas ? "=Σ(BàD)" : fmtSmart(totals.bad)}</td>
            <td style={{ ...thBase, textAlign: "right", color: S.red }}>{showFormulas ? "=Σ(Dépenses)" : (isB2P0 ? fmtSmart(0) : fmtSmart(totals.depenses))}</td>
            <td style={{ ...thBase, textAlign: "center" }}>{showFormulas ? "=Σ(VA)/(Σ(BàD)−PTO)" : (isB2P0 ? "0 %" : fmtPct(totals.avancement))}</td>
            <td style={{ ...thBase, textAlign: "right", color: S.blue }}>{showFormulas ? "=Σ(VA)" : (isB2P0 ? fmtSmart(0) : fmtSmart(totals.va))}</td>
            <td style={{ ...thBase, textAlign: "right", color: S.rafGreen }}>{showFormulas ? "=Σ(RàF)" : (isB2P0 ? fmtSmart(totals.bad) : fmtSmart(totals.raf))}</td>
            <td style={{ ...thBase, textAlign: "right" }}>{showFormulas ? "=Σ(CP)" : (isB2P0 ? fmtSmart(totals.bad) : fmtSmart(totals.cp))}</td>
            <td style={{ ...thBase, textAlign: "right" }}>{showFormulas ? "=CP−BàD" : (isB2P0 ? fmtSmart(0) : fmtSmart(totals.e))}</td>
            <td style={{ ...thBase, textAlign: "center" }}>{showFormulas ? "=E/BàD" : (isB2P0 ? "0 %" : fmtPct(totals.eOverBad))}</td>
            <td style={{ ...thBase, textAlign: "center" }}>{showFormulas ? "=E(B2P précédent)" : (isB2P0 ? fmtSmart(0) : fmtSmart(totals.ePrec))}</td>
            <td style={{ ...thBase, textAlign: "center" }}>{showFormulas ? "=E−Epréc." : (isB2P0 ? fmtSmart(0) : fmtSmart(totals.d))}</td>
            <td style={thBase} colSpan={2} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
