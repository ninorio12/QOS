# Audit liens logiques + test visuel — 2026-06-11

Worklist issue de la passe « tous les liens logiques + test visuel » (vérificateur étendu + 3 agents visuels via harnais auth local). Sépare les **vrais bugs** des **artefacts du harnais de test**.

## A. Liens de données (vérificateur — `npm run integrity`) — 9 violations réelles
Toutes des « infos reliées à rien » ou des variables qui ne correspondent pas :
- **4× `onboarding.contactId` → contact inexistant** (4 onboardings rattachés à des contacts supprimés/absents).
- **`os_sales_calls` → contact + lead inexistants** (1 enregistrement orphelin).
- **`osProspection.leadId` → lead inexistant** (1).
- **2× désync `crm_leads.stageId` ↔ `contact.statut`** : leads en stage actif (`nouveau-lead`, `r2`) alors que le contact est « perdu » (ex. Yasmine).
→ Couverts par la carte des invariants ; à corriger (purge/recâblage) + filet permanent.

## B. Test visuel — VRAIS bugs (vus à l'écran sur pages qui chargent)
| Page | Bug | Sévérité |
|---|---|---|
| /onboarding | **Master-detail cassé** : cliquer un client de la liste ne change pas le panneau de droite (reste sur Jonathan Joao) ; les accordéons d'étapes (contrat, kickoff) ne s'ouvrent pas visuellement. + « 0 clients » en navigation directe (hard reload) alors que 7 existent. | MAJEUR |
| /taches | **`Maximum update depth exceeded`** — boucle de re-render infinie dans `TachesView` (deps `useEffect`). | MAJEUR (perf) |
| /equipe | 5e carte (AGENT KB) **tronquée/déborde** à droite en 1440px (overflow horizontal de la rangée de cartes). | MOYEN |
| /budget | Contenu **invisible au premier rendu** (>5s) ; le panneau notifications en overlay **chevauche** la colonne droite. | MOYEN |
| /bibliotheque/records | Onglets R1/R2/Interne/Externe → **zone blanche** sans état vide ; message « Clé API tl;dv manquante » exposé. | MOYEN |
| /calendrier | **Skeleton bloqué** : `/api/calendrier` attend des timeouts GHL/Google (mock) → ne sort jamais du loading. (Lié Vague 2/3.) | MAJEUR |
| Toutes | Warning hydratation React `Extra attributes from the server: style` sur un `<input>` du Header. | MINEUR |
| /performance, /paiement | Beaucoup d'espace vide, tous les KPIs à 0, bouton « Période » sans plage par défaut (vide vs non-chargé indiscernable). | MINEUR |

**Boutons à revérifier** (signalés morts par Playwright mais peut-être interactions non-standard) : filtres période Semaine/Mois (/performance), « Période » (/paiement), cloche notifications (ouvre un panneau sur /budget — donc OK), nav « Pipeline » (sous-menu au hover). À confirmer manuellement.

## C. Artefacts du HARNAIS de test (PAS des bugs prod)
- Boucle de redirection Clerk `ERR_TOO_MANY_REDIRECTS` en accès direct = instance Clerk **dev** (pk_test) en local, pas la prod (pk_live).
- « 0 données / mock » sur /taches, /logs, /integrations dans certains runs Playwright = hydratation Clerk dev incomplète ; en vraie session ces modules affichent les données (300 activités, 14 intégrations…).
- Lenteurs de compilation à froid du `next dev`.
