"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiActivity, FiAlertTriangle, FiCalendar, FiChevronRight, FiEye, FiPlus, FiSearch, FiTrendingDown, FiTrendingUp } from "react-icons/fi";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { formatDateFR } from "@/lib/dates";
import { formatMoneyLike, getCostUnitLabel, isProjectInProgress } from "@/lib/projectLabels";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import { loadProjects } from "@/lib/storage";
import type { Projet } from "@/types/projet";

type SortMode = "updatedAt" | "name";

function safeLower(value: string) {
  return (value ?? "").toLowerCase();
}

function KpiCard({
  label,
  value,
  sub,
  accentColor,
  valueClass,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentColor: string;
  valueClass?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="panel relative overflow-hidden rounded-2xl px-4 pt-4 pb-3.5"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="section-label">{label}</div>
        {icon && (
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {icon}
          </div>
        )}
      </div>
      <div className={`mt-2 text-[22px] font-bold tabular-nums leading-none ${valueClass ?? "text-slate-900"}`}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-[10px] text-[var(--muted)]">{sub}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<Projet[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updatedAt");

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setProjects(loadProjects());
      setReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = safeLower(query.trim());
    const inProgress = projects.filter(isProjectInProgress);
    const base = q
      ? inProgress.filter((p) =>
          safeLower(
            [p.nom, p.status, p.monnaie, p.dateDebut, p.dateFin, p.typeCout,
             getCostUnitLabel(p), formatDateFR(p.dateDebut), formatDateFR(p.dateFin)].join(" "),
          ).includes(q),
        )
      : inProgress;

    return [...base].sort((a, b) => {
      if (sortMode === "name") return a.nom.localeCompare(b.nom, "fr");
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [projects, query, sortMode]);

  const portfolio = useMemo(() => {
    const active = projects.filter(isProjectInProgress);
    const summaries = active.map((p) => getProjectDecisionSummary(p));
    return {
      activeCount: active.length,
      criticalCount: summaries.filter((s) => s.status === "critical").length,
      watchCount: summaries.filter((s) => s.status === "watch").length,
      totalEcart: summaries.reduce((sum, s) => sum + s.totalEcart, 0),
      nextDate:
        summaries
          .map((s) => s.nextB2PDate)
          .filter((d): d is string => Boolean(d))
          .sort()[0] ?? null,
    };
  }, [projects]);

  if (!ready) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--green)]" />
            Chargement…
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-6 py-6">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[20px] font-bold text-[var(--text)] tracking-tight">
                Tableau de bord PMO
              </h1>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {portfolio.activeCount} projet{portfolio.activeCount !== 1 ? "s" : ""} en cours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => router.push("/projets/liste")}>
              Tous les projets
            </Button>
            <Button size="sm" iconLeft={<FiPlus size={12} />} onClick={() => router.push("/projets/nouveau")}>
              Nouveau projet
            </Button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Portefeuille actif"
            value={portfolio.activeCount}
            sub="projets en cours"
            accentColor="#94a3b8"
            icon={<FiActivity size={13} />}
          />
          <KpiCard
            label="Critiques"
            value={portfolio.criticalCount}
            sub={portfolio.criticalCount > 0 ? "action requise" : "aucun problème"}
            accentColor="#ef4444"
            valueClass={portfolio.criticalCount > 0 ? "text-red-700" : "text-slate-900"}
            icon={<FiAlertTriangle size={13} />}
          />
          <KpiCard
            label="À surveiller"
            value={portfolio.watchCount}
            sub={portfolio.watchCount > 0 ? "à contrôler" : "tout est OK"}
            accentColor="#f4a321"
            valueClass={portfolio.watchCount > 0 ? "text-amber-700" : "text-slate-900"}
            icon={<FiEye size={13} />}
          />
          <KpiCard
            label="Écart portefeuille"
            value={formatMoneyLike(portfolio.totalEcart, "EUR")}
            sub={portfolio.totalEcart > 0 ? "dépassement" : "sous contrôle"}
            accentColor={portfolio.totalEcart > 0 ? "#ef4444" : "#56a45b"}
            valueClass={`text-[17px] ${portfolio.totalEcart > 0 ? "text-red-700" : "text-emerald-700"}`}
            icon={portfolio.totalEcart > 0 ? <FiTrendingUp size={13} /> : <FiTrendingDown size={13} />}
          />
          <KpiCard
            label="Prochain B2P"
            value={portfolio.nextDate ? formatDateFR(portfolio.nextDate) : "—"}
            sub={portfolio.nextDate ? "date planifiée" : "aucun planifié"}
            accentColor="#56a45b"
            valueClass="text-[17px] text-slate-900"
            icon={<FiCalendar size={13} />}
          />
        </div>

        {/* ── Filters ── */}
        <div className="mb-4 grid gap-2 md:grid-cols-[1fr_160px]">
          <div className="panel flex items-center gap-2.5 rounded-xl px-3 py-2.5">
            <FiSearch size={13} className="flex-shrink-0 text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, statut, monnaie…"
              className="flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="flex-shrink-0 text-[var(--muted)] hover:text-[var(--text)]"
              >
                ×
              </button>
            )}
          </div>
          <div className="panel flex items-center gap-2 rounded-xl px-3 py-2.5">
            <span className="section-label flex-shrink-0">Trier</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="flex-1 bg-transparent text-[12px] font-medium text-[var(--text)] outline-none"
            >
              <option value="updatedAt">Récent</option>
              <option value="name">Nom A→Z</option>
            </select>
          </div>
        </div>

        {/* ── Project List ── */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="section-label">Projets en cours</span>
            <span className="text-[11px] text-[var(--muted)]">
              {filtered.length} affiché{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <FiActivity size={20} className="text-slate-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-700">Aucun projet en cours</p>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {query ? "Modifie ta recherche ou" : "Commence par"} créer un projet.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => router.push("/projets/liste")}>
                  Tous les projets
                </Button>
                <Button size="sm" iconLeft={<FiPlus size={12} />} onClick={() => router.push("/projets/nouveau")}>
                  Nouveau projet
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((project) => {
                const summary = getProjectDecisionSummary(project);
                const unit = getCostUnitLabel(project);
                const ecart = summary.lastBilan ? summary.totalEcart : null;
                const isCritical = summary.status === "critical";
                const isWatch = summary.status === "watch";

                const accentBar = isCritical ? "#ef4444" : isWatch ? "#f4a321" : "#56a45b";
                const cardBorderColor = isCritical
                  ? "rgba(239,68,68,0.2)"
                  : isWatch
                  ? "rgba(244,163,33,0.2)"
                  : "rgba(86,164,91,0.15)";

                const avancementPct = Math.min(100, Math.max(0, Math.round(summary.avancement * 100)));
                const avancementColor = avancementPct >= 70 ? "#56a45b" : avancementPct >= 30 ? "#f4a321" : "#94a3b8";

                return (
                  <div
                    key={project.id}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white transition-all duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.1)] hover:-translate-y-px"
                    style={{
                      border: `1px solid ${cardBorderColor}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}
                    onClick={() => router.push(`/projets/${project.id}`)}
                  >
                    {/* Left accent */}
                    <div className="absolute left-0 top-0 h-full w-1" style={{ background: accentBar }} />

                    <div className="flex min-h-[96px] pl-4">
                      {/* Main content */}
                      <div className="flex flex-1 flex-col justify-between py-4 pl-3 pr-4">
                        {/* Top: name + badges */}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-bold text-slate-900 leading-tight">
                              {project.nom}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              {project.status}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${summary.statusClass}`}>
                              {summary.statusLabel}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-[var(--muted)]">
                            {formatDateFR(project.dateDebut)} → {formatDateFR(project.dateFin)}
                            <span className="mx-1.5 opacity-40">·</span>
                            {unit}
                          </div>
                        </div>

                        {/* Bottom: progress + meta */}
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: avancementColor }}>
                              Avancement {avancementPct}%
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              {summary.createdBilans} B2P
                              {summary.nextB2PDate && (
                                <> · <FiCalendar size={9} className="inline mx-0.5" />{formatDateFR(summary.nextB2PDate)}</>
                              )}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${avancementPct}%`, background: avancementColor }}
                            />
                          </div>
                          {summary.alerts.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-700">
                              <FiAlertTriangle size={9} />
                              {summary.alerts[0]}
                              {summary.alerts.length > 1 && <span className="text-amber-500">+{summary.alerts.length - 1}</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: écart hero */}
                      <div
                        className="flex w-[140px] flex-shrink-0 flex-col items-end justify-between border-l py-4 pl-4 pr-4"
                        style={{
                          borderColor: "rgba(0,0,0,0.06)",
                          background: ecart === null ? "transparent"
                            : ecart > 0 ? "rgba(239,68,68,0.03)"
                            : "rgba(86,164,91,0.03)",
                        }}
                      >
                        <div className="text-right">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Écart</div>
                          <div
                            className={`mt-1 text-[18px] font-bold tabular-nums leading-none ${
                              ecart === null ? "text-slate-400"
                                : ecart > 0 ? "text-red-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {ecart === null ? "—" : (ecart > 0 ? "+" : "") + ecart.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}
                          </div>
                          {ecart !== null && (
                            <div className="mt-0.5 text-[9px] text-slate-400">{unit}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors group-hover:text-[var(--green)]">
                          Ouvrir
                          <FiChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
