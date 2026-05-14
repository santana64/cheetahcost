import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildI2JTable,
  buildInitialB2P0,
  buildNextI1Table,
  buildRecommendedB2PDates,
  copyLeftEightColumns,
  copyLeftFiveColumns,
  getB2PCadenceRule,
} from "@/lib/b2p";
import { parseFrenchDateInput } from "@/lib/dates";
import { aggregateBilan, computeLigneDerivesFGF, isPTOLot } from "@/lib/fgf";
import { parseProjectFile, stringifyProjectFile } from "@/lib/projectFile";
import type { BilanPilotage, LotTache, Projet } from "@/types/projet";

function sampleLots(): LotTache[] {
  return [
    { id: "lot-1", code: "LB01", libelle: "Études", budgetInitial: 1000 },
    { id: "lot-2", code: "PTO", libelle: "Provision pour Tâches Oubliées", budgetInitial: 100 },
  ];
}

function sampleProject(bilans: BilanPilotage[] = []): Projet {
  return {
    id: "project-test",
    nom: "Projet test",
    phase: "Réalisation",
    dateDebut: "2026-01-01",
    dateFin: "2027-08-01",
    monnaie: "EUR",
    typeCout: "encouru",
    status: "En cours",
    uniteCoutType: "monetaire",
    uniteCoutLibelle: "EUR",
    tvaMode: "HT",
    valeurMode: "courante",
    b2pDates: buildRecommendedB2PDates({ dateDebut: "2026-01-01", dateFin: "2027-08-01" }),
    nbB2P: 10,
    lots: sampleLots(),
    bilans,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("les dates saisies au format français interprètent 02-03 comme 2 mars", () => {
  assert.equal(parseFrenchDateInput("02-03", 2026), "2026-03-02");
  assert.equal(parseFrenchDateInput("02/03/2026"), "2026-03-02");
});

test("un projet de 19 mois génère environ 10 B2P plus B2P0", () => {
  const rule = getB2PCadenceRule("2026-01-01", "2027-08-01");
  const dates = buildRecommendedB2PDates({ dateDebut: "2026-01-01", dateFin: "2027-08-01" });

  assert.equal(rule?.label, "Tous les 2 mois");
  assert.equal(dates.length, 11);
  assert.equal(dates[0], "2026-01-01");
  assert.equal(dates[1], "2026-03-01");
  assert.equal(dates.at(-1), "2027-08-01");
});

test("B2P0 est créé seul au démarrage", () => {
  const project = sampleProject();
  const b2p0 = buildInitialB2P0(project);

  assert.equal(b2p0.numero, 0);
  assert.equal(b2p0.tableKind, "b2p0");
  assert.equal(b2p0.lignes.length, project.lots.length);
});

test("un nouveau i-1 copie uniquement les cinq colonnes de gauche utiles", () => {
  const previous: BilanPilotage = {
    id: "b2p-1",
    numero: 1,
    date: "2026-03-01",
    triggerDate: "2026-03-01",
    tableKind: "i-1",
    lignes: [
      { lotId: "lot-1", variation: 120, depenses: 400, avancementPhysique: 55, resteAFaire: 300, commentaire: "x" },
      { lotId: "lot-2", variation: 20, depenses: 10, avancementPhysique: 10, resteAFaire: 50, commentaire: "pto" },
    ],
  };
  const lines = copyLeftFiveColumns(previous, sampleLots());

  assert.equal(lines[0].variation, 120);
  assert.equal(lines[0].depenses, 0);
  assert.equal(lines[0].avancementPhysique, 0);
  assert.equal(lines[0].resteAFaire, 0);
});

test("un i-2j copie les huit colonnes de gauche depuis son i-1", () => {
  const baseline: BilanPilotage = {
    id: "b2p-1",
    numero: 1,
    date: "2026-03-01",
    triggerDate: "2026-03-01",
    tableKind: "i-1",
    lignes: [{ lotId: "lot-1", variation: 120, depenses: 400, avancementPhysique: 55, resteAFaire: 300, commentaire: "x" }],
  };
  const lines = copyLeftEightColumns(baseline, sampleLots());

  assert.equal(lines[0].variation, 120);
  assert.equal(lines[0].depenses, 400);
  assert.equal(lines[0].avancementPhysique, 55);
  assert.equal(lines[0].resteAFaire, 0);
});

test("la création progressive numérote i-1 puis i-2j correctement", () => {
  const base = sampleProject();
  const b2p0 = buildInitialB2P0(base);
  const p1 = sampleProject([b2p0]);
  const i1 = buildNextI1Table(p1);
  const p2 = sampleProject([b2p0, i1]);
  const scenario = buildI2JTable(p2, 1);

  assert.equal(i1.numero, 1);
  assert.equal(i1.tableKind, "i-1");
  assert.equal(scenario?.numero, 1);
  assert.equal(scenario?.tableKind, "i-2j");
  assert.equal(scenario?.scenarioIndex, 1);
});

test("les calculs FGF restent cohérents sur BàD, VA, CP, E et agrégat", () => {
  const lot = sampleLots()[0];
  const line = { lotId: lot.id, variation: 200, depenses: 500, avancementPhysique: 50, resteAFaire: 400 };
  const derives = computeLigneDerivesFGF(lot, line);

  assert.equal(derives.budgetADate, 1200);
  assert.equal(derives.valeurAcquise, 600);
  assert.equal(derives.coutPrevisionnelTerminaison, 900);
  assert.equal(derives.e, -300);

  const bilan: BilanPilotage = { id: "b2p", numero: 1, date: "2026-03-01", tableKind: "i-1", lignes: [line] };
  const aggregate = aggregateBilan(sampleProject([bilan]), bilan);
  assert.equal(aggregate.totalBudgetADate, 1300);
});

test("la PTO est détectée pour être verrouillée et grisée côté UI", () => {
  assert.equal(isPTOLot(sampleLots()[1]), true);
});

test("le format .cheetahcost.json conserve un projet complet et versionné", () => {
  const project = sampleProject([buildInitialB2P0(sampleProject())]);
  const text = stringifyProjectFile(project);
  const parsed = parseProjectFile(text);

  assert.equal(JSON.parse(text).app, "CheetahCost");
  assert.equal(parsed.nom, project.nom);
  assert.equal(parsed.bilans.length, 1);
  assert.ok((parsed.auditTrail ?? []).length >= 1);
  assert.ok((parsed.versions ?? []).length >= 1);
});
