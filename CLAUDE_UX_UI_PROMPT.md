# Prompt Claude AI - Refonte UX/UI CheetahCost

Tu es un agent UX/UI senior chargé d'améliorer l'application CheetahCost sans casser sa logique métier.

## Contexte produit

CheetahCost est une application de coûtenance projet basée sur la méthode FGF. Elle est destinée à être vendue à des entreprises. Elle doit inspirer confiance, être lisible en réunion, et rester efficace pour des contrôleurs coûts qui travaillent dans des tableaux B2P.

L'application fonctionne en local-first :
- le cache navigateur sert à la reprise rapide ;
- le fichier projet officiel est un `.cheetahcost.json` ;
- les exports PDF / Excel-compatible / JSON doivent rester accessibles ;
- l'audit trail, les versions, les verrous et les B2P font partie du projet.

## Interdictions

Ne modifie pas les calculs métier FGF.
Ne modifie pas la cadence B2P.
Ne supprime pas les champs métier : B2P0, i-1, i-2j, i-2, PTO, BàD, CP, E, E/BàD, E préc., D.
Ne remplace pas le format `.cheetahcost.json`.
Ne réintroduis pas `xlsx`.
Ne crée pas de landing page marketing : l'app doit ouvrir directement sur l'expérience utile.
Ne cache pas les actions critiques derrière des menus opaques.
Ne fais pas une UI monochrome, trop violette, trop beige, ou décorative.

## Objectif UX

Transformer l'application en outil entreprise premium :
- plus lisible ;
- plus dense mais maîtrisé ;
- plus rassurant ;
- plus rapide à utiliser ;
- plus clair pour un boss pressé et un coûteneur expert.

## Écrans à améliorer

### Dashboard `/dashboard`

Objectif : donner la santé du portefeuille en moins de 10 secondes.

À améliorer :
- hiérarchie plus nette des KPI portefeuille ;
- meilleur contraste des statuts Vert / À surveiller / Critique ;
- tri et recherche plus élégants ;
- cartes projet plus scannables ;
- prochain B2P et écart visibles sans ouvrir le projet ;
- état vide professionnel.

### Liste projets `/projets/liste`

Objectif : gérer des fichiers/projets comme un logiciel sérieux.

À améliorer :
- mettre en avant `Ouvrir JSON`, `Nouveau projet`, `Projets en cours` ;
- rendre le tableau plus lisible ;
- afficher statut décisionnel, dates, écart, unité ;
- rendre les lignes plus confortables au clic ;
- garder la logique d'import `.cheetahcost.json`.

### Fiche projet `/projets/[projectId]`

Objectif : donner la décision, le planning, la structure et les exports.

À améliorer :
- renforcer la synthèse décisionnelle ;
- clarifier les actions principales : Ouvrir B2P, Nouveau tableau B2P i-1, Enregistrer JSON, Export PDF, Export Excel ;
- rendre le planning B2P plus compact ;
- rendre audit trail et versions plus lisibles ;
- éviter les gros blocs trop espacés ;
- garder visible l'avancement physique, dernier tableau, écart dernier tableau.

### B2P `/projets/[projectId]/b2p/[b2pId]`

Objectif : ressembler à un cockpit de saisie type tableur, mais plus guidé.

À améliorer :
- le tableau doit tenir autant que possible sur toute la largeur écran ;
- éviter le scroll horizontal sauf cas extrême ;
- garder les colonnes importantes visibles ;
- améliorer la toolbar : Enregistrer, Annuler, Formules, Graphique, Export, Projet JSON ;
- rendre Lecture seule / Saisie active immédiatement compréhensible ;
- améliorer recherche LB et filtres ;
- garder le `%` visible sur Avancement physique ;
- garder PTO grisé/verrouillé ;
- ne pas casser le zoom automatique.

## Contraintes visuelles

Style recommandé :
- logiciel entreprise moderne ;
- dense, précis, calme ;
- fond clair ;
- cartes avec rayon modéré ;
- tableaux nets ;
- contrastes lisibles ;
- accents FGF vert/orange utilisés avec parcimonie ;
- typography sobre ;
- pas de décorations inutiles.

Les boutons doivent être hiérarchisés :
- action principale très claire ;
- actions secondaires sobres ;
- actions dangereuses explicites.

Les libellés doivent rester en français.

## Critères d'acceptation

Après tes modifications :
- `npm run lint` doit passer ;
- `npm test` doit passer ;
- `npm run build` doit passer ;
- les tests métier FGF existants ne doivent pas être affaiblis ;
- le dashboard, la liste, la fiche projet et le B2P restent utilisables ;
- aucun calcul métier ne doit changer sans test dédié ;
- l'app doit rester compatible avec le format `.cheetahcost.json`.

## Fichiers clés

- `src/app/dashboard/page.tsx`
- `src/app/projets/liste/page.tsx`
- `src/app/projets/[projectId]/page.tsx`
- `src/app/projets/[projectId]/b2p/[b2pId]/page.tsx`
- `src/components/b2p/B2PTable.tsx`
- `src/components/projets/DecisionSummary.tsx`
- `src/lib/b2p.ts`
- `src/lib/fgf.ts`
- `src/lib/projectFile.ts`
- `src/lib/projectHealth.ts`
- `src/types/projet.ts`

## Livrable attendu

Fais une refonte UX/UI incrémentale et sûre.
Explique en fin de travail :
- ce que tu as changé ;
- ce que tu n'as volontairement pas touché ;
- les commandes de validation lancées ;
- les risques résiduels éventuels.
