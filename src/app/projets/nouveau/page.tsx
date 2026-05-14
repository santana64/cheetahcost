"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiCalendar, FiDollarSign, FiGrid, FiInfo, FiList,
  FiPlusCircle, FiRefreshCw, FiTrash2,
} from "react-icons/fi";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { FrenchDateInput } from "@/components/ui/FrenchDateInput";
import { Tag } from "@/components/ui/Tag";
import { appendAuditEvent, appendProjectVersion, createAuditEvent } from "@/lib/audit";
import {
  buildInitialB2P0,
  buildRecommendedB2PDates,
  defaultLineForLot,
  generateId,
  getB2PCadenceRule,
  getB2PPlanWarnings,
} from "@/lib/b2p";
import { clampEndDate, formatDateFR, parseMonthYearFR, todayISO } from "@/lib/dates";
import { getCostUnitLabel } from "@/lib/projectLabels";
import { upsertProject } from "@/lib/storage";
import type { LotTache, Projet, TvaMode, TypeCout, UniteCoutType, ValeurMode } from "@/types/projet";

type ChargeUnit = "jour/personne" | "heure/personne" | "mois/personne";

function nextLBCode(existing: LotTache[]) {
  const used = new Set(existing.map((l) => String(l.code || "").trim()).filter(Boolean));
  for (let i = 1; i < 999; i++) {
    const code = `LB${String(i).padStart(2, "0")}`;
    if (!used.has(code)) return code;
  }
  return `LB${existing.length + 1}`;
}

function normalizeNumber(raw: string) {
  const v = Number(String(raw).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

function isoToMonthYear(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length < 2) return "";
  return `${parts[1]}/${parts[0]}`;
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--green-soft)]">
        <span className="text-[var(--green)]">{icon}</span>
      </div>
      <div>
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="text-[11px] text-[var(--muted)]">{subtitle}</div>}
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [dateDebut, setDateDebut] = useState(todayISO());
  const [dateFin, setDateFin] = useState(todayISO());
  const [uniteCoutType, setUniteCoutType] = useState<UniteCoutType>("monetaire");
  const [uniteCoutLibelle, setUniteCoutLibelle] = useState<ChargeUnit>("jour/personne");
  const [monnaie, setMonnaie] = useState("EUR");
  const [tvaMode, setTvaMode] = useState<TvaMode>("HT");
  const [valeurMode, setValeurMode] = useState<ValeurMode>("courante");
  const [valeurReference, setValeurReference] = useState("");
  const [typeCout, setTypeCout] = useState<TypeCout>("encouru");
  const [precision, setPrecision] = useState<number>(0);
  const [lots, setLots] = useState<LotTache[]>(() => [
    { id: generateId(), code: "PTO", libelle: "Provision pour Tâches Oubliées", budgetInitial: 0 },
  ]);
  const [plannedDates, setPlannedDates] = useState<string[]>([]);
  const [submitAttempt, setSubmitAttempt] = useState(false);
  const [ptoWarningVisible, setPtoWarningVisible] = useState(false);

  const fixedEnd = useMemo(() => clampEndDate(dateDebut, dateFin), [dateDebut, dateFin]);
  const projectForLabels = useMemo(
    () =>
      ({
        id: "draft", nom: nom || "Projet", phase: "Réalisation",
        dateDebut, dateFin: fixedEnd, monnaie, typeCout, status: "En cours",
        uniteCoutType, uniteCoutLibelle: uniteCoutType === "charge" ? uniteCoutLibelle : monnaie,
        tvaMode, valeurMode, valeurReference,
        b2pDates: [], nbB2P: 0, lots, bilans: [],
        createdAt: "", updatedAt: "",
      }) satisfies Projet,
    [dateDebut, fixedEnd, lots, monnaie, nom, tvaMode, typeCout, uniteCoutLibelle, uniteCoutType, valeurMode, valeurReference],
  );

  const recommendedDates = useMemo(() => buildRecommendedB2PDates({ dateDebut, dateFin: fixedEnd }), [dateDebut, fixedEnd]);
  const cadence = useMemo(() => getB2PCadenceRule(dateDebut, fixedEnd), [dateDebut, fixedEnd]);
  const warnings = useMemo(
    () => getB2PPlanWarnings({ ...projectForLabels, b2pDates: plannedDates, nbB2P: Math.max(0, plannedDates.length - 1) }, plannedDates),
    [plannedDates, projectForLabels],
  );
  const unitLabel = useMemo(() => getCostUnitLabel(projectForLabels), [projectForLabels]);
  const totalBI = useMemo(() => lots.reduce((sum, l) => sum + Number(l.budgetInitial || 0), 0), [lots]);
  const recommendedKey = recommendedDates.join("|");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPlannedDates(recommendedDates);
    });
    return () => { cancelled = true; };
  }, [recommendedDates, recommendedKey]);

  const proposedValeurReference = isoToMonthYear(dateDebut);

  // Warn before unload if form has unsaved data
  const hasUnsavedData = nom.trim().length > 0 || lots.some((l) => l.libelle || l.budgetInitial);
  useEffect(() => {
    if (!hasUnsavedData) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedData]);

  useEffect(() => {
    if (valeurMode === "constante" && !valeurReference) {
      setValeurReference(proposedValeurReference);
    }
    // Only run when valeurMode changes, not on every proposedValeurReference update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valeurMode]);

  const referenceError =
    uniteCoutType === "monetaire" && valeurMode === "constante" && !parseMonthYearFR(valeurReference)
      ? "Indique le mois des conditions économiques au format mm/aaaa."
      : "";

  const errors = {
    nom: !nom.trim() ? "Nom de projet requis." : "",
    monnaie: uniteCoutType === "monetaire" && !monnaie.trim() ? "Monnaie requise." : "",
    valeurReference: referenceError,
    dates: !recommendedDates.length ? "Dates projet invalides." : "",
  };
  const canCreate = Object.values(errors).every((v) => !v);

  const addLB = () => {
    setLots((prev) => {
      const newLot = { id: generateId(), code: nextLBCode(prev), libelle: "", budgetInitial: 0 };
      const ptoIdx = prev.findIndex((l) => String(l.code ?? "").toUpperCase() === "PTO");
      if (ptoIdx === -1) return [...prev, newLot];
      return [...prev.slice(0, ptoIdx), newLot, ...prev.slice(ptoIdx)];
    });
  };

  const patchLot = (id: string, patch: Partial<LotTache>) => {
    setLots((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLot = (id: string) => {
    setLots((prev) => prev.filter((l) => l.id !== id));
  };

  const createProject = () => {
    setSubmitAttempt(true);
    if (!canCreate) return;

    // Alerte si PTO à 0 — premier clic = avertissement, deuxième clic = création
    const ptoBudgetZero = lots.some(
      (l) => String(l.code ?? "").toUpperCase() === "PTO" && !Number(l.budgetInitial),
    );
    if (ptoBudgetZero && !ptoWarningVisible) {
      setPtoWarningVisible(true);
      return;
    }

    const now = new Date().toISOString();
    const normalizedLots = lots.map((l, i) => ({
      id: l.id || generateId(),
      code: (l.code || nextLBCode(lots.slice(0, i))).trim(),
      libelle: (l.libelle || `Ligne budgétaire ${i + 1}`).trim(),
      budgetInitial: Number(l.budgetInitial) || 0,
    }));

    const project: Projet = {
      id: generateId(),
      nom: nom.trim(),
      phase: "Réalisation",
      dateDebut,
      dateFin: fixedEnd,
      monnaie: monnaie.trim() || "EUR",
      typeCout,
      status: "En cours",
      uniteCoutType,
      uniteCoutLibelle: uniteCoutType === "charge" ? uniteCoutLibelle : monnaie.trim() || "EUR",
      tvaMode,
      valeurMode,
      valeurReference: valeurMode === "constante" ? parseMonthYearFR(valeurReference) ?? "" : "",
      precision,
      b2pDates: plannedDates,
      nbB2P: Math.max(0, plannedDates.length - 1),
      lots: normalizedLots,
      bilans: [],
      createdAt: now,
      updatedAt: now,
    };

    const b2p0 = buildInitialB2P0(project);
    const finalProject: Projet = appendProjectVersion(
      appendAuditEvent(
        {
          ...project,
          lockedBilanIds: [],
          auditTrail: [],
          versions: [],
          bilans: [{ ...b2p0, lignes: (project.lots ?? []).map((l) => defaultLineForLot(l.id)) }],
        },
        createAuditEvent("project_created", "Projet créé", { details: `${plannedDates.length} date(s) B2P planifiée(s)` }),
      ),
      "Création projet",
    );

    upsertProject(finalProject);
    router.push(`/projets/${finalProject.id}`);
  };

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none transition focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/15";
  const selectCls = inputCls;
  const labelCls = "mb-1 block text-[11px] font-medium text-slate-600";
  const errorCls = "mt-1 text-[11px] text-red-600";

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-5 py-5">

        {/* ── Header ── */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-[var(--text)]">Nouveau projet</h1>
              <Tag color="green">CheetahCost FGF</Tag>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              Dates saisies en français — ex: 02-03 = 2 mars
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
            Annuler
          </Button>
        </div>

        <div className="space-y-4">

          {/* ── Section Identité ── */}
          <section className="panel-solid rounded-2xl p-5">
            <SectionHeader icon={<FiGrid size={13} />} title="Identité du projet" subtitle="Nom, durée et phase" />

            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nom du projet *</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Programme Atlas — Modernisation SI"
                  className={inputCls}
                />
                {submitAttempt && errors.nom && <p className={errorCls}>{errors.nom}</p>}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FrenchDateInput value={dateDebut} onChange={setDateDebut} label="Date de début" />
                <FrenchDateInput
                  value={fixedEnd}
                  onChange={(v) => setDateFin(clampEndDate(dateDebut, v))}
                  label="Date de fin"
                  min={dateDebut}
                />
              </div>
            </div>
          </section>

          {/* ── Section Unités de coût ── */}
          <section className="panel-solid rounded-2xl p-5">
            <SectionHeader icon={<FiDollarSign size={13} />} title="Unités de coût" subtitle="Type, monnaie, TVA, valeur" />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Type d&apos;unité</label>
                <select
                  value={uniteCoutType}
                  onChange={(e) => setUniteCoutType(e.target.value as UniteCoutType)}
                  className={selectCls}
                >
                  <option value="monetaire">Unité monétaire</option>
                  <option value="charge">Charge (jour, heure…)</option>
                </select>
              </div>

              {uniteCoutType === "charge" ? (
                <div>
                  <label className={labelCls}>Unité de charge</label>
                  <select
                    value={uniteCoutLibelle}
                    onChange={(e) => setUniteCoutLibelle(e.target.value as ChargeUnit)}
                    className={selectCls}
                  >
                    <option value="jour/personne">jour/personne</option>
                    <option value="heure/personne">heure/personne</option>
                    <option value="mois/personne">mois/personne</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Monnaie *</label>
                    <input
                      value={monnaie}
                      onChange={(e) => setMonnaie(e.target.value)}
                      placeholder="EUR"
                      className={inputCls}
                    />
                    {submitAttempt && errors.monnaie && <p className={errorCls}>{errors.monnaie}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>HT / TTC</label>
                    <select value={tvaMode} onChange={(e) => setTvaMode(e.target.value as TvaMode)} className={selectCls}>
                      <option value="HT">HT — Hors Taxes</option>
                      <option value="TTC">TTC — Toutes Taxes Comprises</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Mode de valeur</label>
                    <select value={valeurMode} onChange={(e) => setValeurMode(e.target.value as ValeurMode)} className={selectCls}>
                      <option value="courante">Courant(e)</option>
                      <option value="constante">Constante — valeur stable</option>
                    </select>
                  </div>
                  {valeurMode === "constante" && (
                    <div>
                      <label className={labelCls}>
                        Mois des C.E. de référence
                        <span className="ml-1 font-normal text-slate-400">(mm/aaaa)</span>
                      </label>
                      <input
                        value={valeurReference}
                        onChange={(e) => setValeurReference(e.target.value)}
                        placeholder="04/2026"
                        className={inputCls}
                      />
                      {submitAttempt && errors.valeurReference && <p className={errorCls}>{errors.valeurReference}</p>}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Coûts</label>
                    <select value={typeCout} onChange={(e) => setTypeCout(e.target.value as TypeCout)} className={selectCls}>
                      <option value="encouru">Encouru</option>
                      <option value="engagé">Engagé</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4">
              <label className={labelCls}>Précision décimale des montants</label>
              <div className="flex gap-2">
                {([0, 1, 2] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPrecision(n)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      precision === n
                        ? "border-[var(--green)] bg-[var(--green-soft)] text-[var(--green)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                    }`}
                  >
                    {n === 0 ? "Entier" : n === 1 ? "0,0" : "0,00"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">S&apos;applique aux montants dans les tableaux B2P, pas aux pourcentages.</p>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--green-soft-2)] bg-[var(--green-soft)] px-3 py-2">
              <FiInfo size={12} className="flex-shrink-0 text-[var(--green-2)]" />
              <span className="text-[11px] text-emerald-800">
                Unité affichée dans les tableaux B2P :{" "}
                <span className="font-bold">{unitLabel}</span>
              </span>
            </div>
          </section>

          {/* ── Section Structure budgétaire ── */}
          <section className="panel-solid rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <SectionHeader
                icon={<FiList size={13} />}
                title="Structure budgétaire (LB)"
                subtitle="Lignes budgétaires et budget initial"
              />
              <Button size="xs" iconLeft={<FiPlusCircle size={11} />} onClick={addLB}>
                Ajouter une LB
              </Button>
            </div>

            {lots.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <p className="text-[12px] text-slate-500">
                  Aucune ligne budgétaire.{" "}
                  <button className="font-medium text-[var(--green)] hover:underline" onClick={addLB}>
                    Ajouter la première LB
                  </button>
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[100px_1fr_160px_38px] gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="section-label">Code</div>
                  <div className="section-label">Libellé</div>
                  <div className="section-label text-right">Budget initial</div>
                  <div />
                </div>
                <div className="divide-y divide-slate-100">
                  {lots.map((lot) => (
                    <div key={lot.id} className="grid grid-cols-[100px_1fr_160px_38px] items-center gap-2 px-3 py-2">
                      <input
                        value={lot.code ?? ""}
                        onChange={(e) => patchLot(lot.id, { code: e.target.value })}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] font-mono font-semibold text-slate-900 outline-none focus:border-[var(--green)]"
                      />
                      <input
                        value={lot.libelle ?? ""}
                        onChange={(e) => patchLot(lot.id, { libelle: e.target.value })}
                        placeholder="Description de la ligne"
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[12px] text-slate-900 outline-none focus:border-[var(--green)]"
                      />
                      <input
                        value={String(lot.budgetInitial ?? 0)}
                        onChange={(e) => patchLot(lot.id, { budgetInitial: normalizeNumber(e.target.value) })}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-[12px] tabular-nums text-slate-900 outline-none focus:border-[var(--green)]"
                      />
                      <button
                        onClick={() => removeLot(lot.id)}
                        disabled={String(lot.code ?? "").toUpperCase() === "PTO"}
                        className={`flex h-7 w-7 items-center justify-center rounded-md transition ${String(lot.code ?? "").toUpperCase() === "PTO" ? "cursor-not-allowed text-slate-200" : "text-slate-400 hover:bg-red-50 hover:text-red-500"}`}
                      >
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-[11px] text-slate-500">{lots.length} ligne{lots.length > 1 ? "s" : ""}</span>
                  <span className="text-[12px] font-bold text-slate-900 tabular-nums">
                    {totalBI.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {unitLabel}
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ── Section Planning B2P ── */}
          <section className="panel-solid rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <SectionHeader
                icon={<FiCalendar size={13} />}
                title="Planning B2P proposé"
                subtitle="Dates de déclenchement selon la règle FGF"
              />
              <Button
                size="xs"
                variant="secondary"
                iconLeft={<FiRefreshCw size={11} />}
                onClick={() => setPlannedDates(recommendedDates)}
              >
                Réinitialiser FGF
              </Button>
            </div>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <FiInfo size={12} className="flex-shrink-0 text-emerald-600" />
              <span className="text-[11px] text-emerald-800">
                Cadence : <strong>{cadence?.label ?? "—"}</strong> · {cadence?.explanation ?? "Dates invalides"} ·{" "}
                <strong>{Math.max(0, plannedDates.length - 1)} B2P</strong> + B2P0
              </span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {plannedDates.map((date, i) => (
                <div key={`${i}-${date}`} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                  <FrenchDateInput
                    value={date}
                    min={dateDebut}
                    max={fixedEnd}
                    label={i === 0 ? "B2P0 — lancement" : `B2P${i} — déclenchement`}
                    onChange={(next) => {
                      setPlannedDates((prev) => prev.map((d, idx) => (idx === i ? next : d)));
                    }}
                  />
                  <div className="mt-1 text-[10px] text-[var(--muted)]">{formatDateFR(date)}</div>
                </div>
              ))}
            </div>

            {warnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
                <div className="font-semibold">Écart à la règle FGF</div>
                <ul className="mt-1 space-y-0.5">
                  {warnings.slice(0, 4).map((w) => (
                    <li key={w} className="flex items-start gap-1.5">
                      <span className="mt-0.5 flex-shrink-0 text-amber-600">·</span>
                      {w}
                    </li>
                  ))}
                  {warnings.length > 4 && <li className="text-amber-700">+ {warnings.length - 4} autre(s)</li>}
                </ul>
              </div>
            )}
          </section>

          {/* ── Error summary ── */}
          {submitAttempt && !canCreate && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">
              <strong>Erreurs à corriger :</strong>{" "}
              {Object.values(errors).filter(Boolean).join(" ")}
            </div>
          )}

          {/* ── PTO warning (montant à 0) ── */}
          {ptoWarningVisible && lots.some((l) => String(l.code ?? "").toUpperCase() === "PTO" && !Number(l.budgetInitial)) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-[14px]">⚠</span>
                <div>
                  <strong>PTO sans montant</strong> — La Provision pour Tâches Oubliées est à 0.
                  <br />
                  Renseignez le montant dans la structure budgétaire, ou cliquez à nouveau sur{" "}
                  <strong>Créer le projet</strong> pour confirmer quand même.
                </div>
              </div>
            </div>
          )}

          {/* ── Sticky Action Bar ── */}
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/96 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
            <div className="text-[12px] text-slate-600">
              <span className="font-semibold">{Math.max(0, plannedDates.length - 1)}</span> B2P planifié{Math.max(0, plannedDates.length - 1) !== 1 ? "s" : ""} après B2P0
              {lots.length > 0 && (
                <>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="font-semibold">{lots.length}</span> LB —{" "}
                  {totalBI.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {unitLabel}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => router.push("/dashboard")}>
                Annuler
              </Button>
              <Button size="sm" onClick={createProject}>
                Créer le projet →
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
