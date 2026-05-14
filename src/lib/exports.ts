"use client";

import { getBilanLabel } from "@/lib/b2p";
import { formatDateFR } from "@/lib/dates";
import { computeLigneDerivesFGF, sortBilans } from "@/lib/fgf";
import { getCostUnitLabel } from "@/lib/projectLabels";
import { getProjectDecisionSummary } from "@/lib/projectHealth";
import type { BilanPilotage, Projet } from "@/types/projet";

function slug(value: string) {
  return String(value || "export")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function tableHtml(title: string, rows: unknown[][]) {
  return `
    <h2>${escapeHtml(title)}</h2>
    <table border="1" cellspacing="0" cellpadding="4">
      ${rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${typeof cell === "number" ? cell : escapeHtml(cell)}</td>`)
              .join("")}</tr>`,
        )
        .join("")}
    </table>
  `;
}

function workbookHtml(sections: Array<{ title: string; rows: unknown[][] }>) {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; margin-bottom: 28px; }
        td { border: 1px solid #333; padding: 4px 7px; }
        h2 { margin: 22px 0 8px; }
      </style>
    </head>
    <body>
      ${sections.map((section) => tableHtml(section.title, section.rows)).join("")}
    </body>
  </html>`;
}

function bilanRows(project: Projet, bilan: BilanPilotage) {
  const unit = getCostUnitLabel(project);
  return [
    [`${getBilanLabel(bilan)} - ${formatDateFR(bilan.triggerDate ?? bilan.date)}`],
    ["Unité", unit],
    [],
    ["Code", "Libellé", "BI", "Variation", "BàD", "Dépenses", "Avancement physique", "Valeur acquise", "RàF", "CP", "E", "E/BàD", "E préc.", "D", "Obs."],
    ...(project.lots ?? []).map((lot) => {
      const line = (bilan.lignes ?? []).find((candidate) => candidate.lotId === lot.id);
      const derives = computeLigneDerivesFGF(lot, line);
      return [
        lot.code ?? "",
        lot.libelle,
        derives.budgetInitial,
        derives.variation,
        derives.budgetADate,
        derives.depenses,
        Math.round(derives.avancementPhysique),
        derives.valeurAcquise,
        derives.resteAFaire,
        derives.coutPrevisionnelTerminaison,
        derives.e,
        derives.budgetADate ? derives.e / derives.budgetADate : 0,
        derives.ePrec,
        derives.d,
        line?.commentaire ?? "",
      ];
    }),
  ];
}

export async function downloadProjectExcel(project: Projet) {
  const summary = getProjectDecisionSummary(project);
  const unit = getCostUnitLabel(project);

  const summaryRows = [
    ["CheetahCost - Méthode FGF de Coûtenance"],
    ["Projet", project.nom],
    ["Statut décisionnel", summary.statusLabel],
    ["Dernier B2P", summary.lastBilan ? getBilanLabel(summary.lastBilan) : "Aucun"],
    ["Prochain B2P", summary.nextB2PDate ? formatDateFR(summary.nextB2PDate) : "-"],
    ["Unité", unit],
    [],
    ["Indicateur", "Valeur"],
    ["Budget initial", summary.totalBI],
    ["BàD", summary.totalBudgetADate],
    ["Dépenses", summary.totalDepenses],
    ["CP", summary.totalCPT],
    ["Écart final", summary.totalEcart],
    ["Variance coûts", summary.totalVariance],
    ["Avancement physique", summary.avancement],
    [],
    ["Alertes"],
    ...(summary.alerts.length ? summary.alerts.map((alert) => [alert]) : [["Aucune alerte"]]),
  ];

  const sections = [
    { title: "Synthèse", rows: summaryRows },
    { title: "Structure LB", rows: [["Code", "Libellé", "Budget initial"], ...(project.lots ?? []).map((lot) => [lot.code ?? "", lot.libelle, lot.budgetInitial])] },
    ...sortBilans(project.bilans ?? []).map((bilan) => ({ title: getBilanLabel(bilan), rows: bilanRows(project, bilan) })),
  ];

  downloadBlob(`${slug(project.nom)}_FGF.xls`, workbookHtml(sections), "application/vnd.ms-excel;charset=utf-8");
}

export async function downloadBilanExcel(project: Projet, bilan: BilanPilotage) {
  const html = workbookHtml([{ title: getBilanLabel(bilan), rows: bilanRows(project, bilan) }]);
  downloadBlob(`${slug(project.nom)}_${slug(getBilanLabel(bilan))}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

export async function downloadProjectPDF(project: Projet) {
  const jsPDFModule = await import("jspdf");
  const summary = getProjectDecisionSummary(project);
  const unit = getCostUnitLabel(project);
  const doc = new jsPDFModule.default({ unit: "pt", format: "a4" });
  const left = 42;
  let y = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CheetahCost - Méthode FGF de Coûtenance", left, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Projet : ${project.nom}`, left, y);
  y += 16;
  doc.text(`Statut : ${summary.statusLabel} - ${summary.headline}`, left, y);
  y += 16;
  doc.text(`Unité : ${unit}`, left, y);
  y += 24;

  const rows = [
    ["Budget initial", summary.totalBI],
    ["BàD", summary.totalBudgetADate],
    ["Dépenses", summary.totalDepenses],
    ["CP", summary.totalCPT],
    ["Écart final", summary.totalEcart],
    ["Variance coûts", summary.totalVariance],
  ];

  doc.setFont("helvetica", "bold");
  doc.text("Synthèse décisionnelle", left, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  rows.forEach(([label, value]) => {
    doc.text(String(label), left, y);
    doc.text(Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 }), 260, y);
    y += 15;
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Alertes", left, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  const alerts = summary.alerts.length ? summary.alerts : ["Aucune alerte."];
  alerts.forEach((alert) => {
    const lines = doc.splitTextToSize(String(alert), 500);
    doc.text(lines, left, y);
    y += lines.length * 13 + 4;
  });

  doc.save(`${slug(project.nom)}_FGF.pdf`);
}
