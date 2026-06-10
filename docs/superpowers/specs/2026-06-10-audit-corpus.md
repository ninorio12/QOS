# Corpus d'audit Data OS — 2026-06-10

> Worklist de référence (sauvegardée depuis l'audit multi-agents de ~7h). Le vérificateur doit reproduire et compléter ces findings. Voir le design `2026-06-11-convex-single-source-of-truth-design.md`.


## Passe 1 — audit (109 findings bruts)


### CRITICAL (9)

- **/api/dashboard accessible sans authentification (fuite de données business)** — _/api/dashboard + src/middleware.ts_ (visuel:acquisition)
- **/dashboard reste en skeleton (>13 s) — la seule route qui ne s'affiche pas** — _/dashboard_ (visuel:acquisition)
- **Fiche contact jamais affichée : skeleton de plusieurs minutes puis 404 générique anglais** — _/contacts/[id]_ (visuel:cycle-client)
- **Serveur dev localhost:3100 hors service — audit visuel impossible** — _infra locale (toutes routes /bibliotheque/*)_ (visuel:bibliotheques)
- **Pollution de données de test dans les tâches et le journal d'activités (prod)** — _/taches + /logs (Convex osTasks/osActivities)_ (visuel:agentique)
- **La fiche client /contacts/[id] renvoie 404 pour TOUS les contacts réels (source GHL/mock divergente alors que les données vivent dans Convex)** — _/contacts/[id] — src/app/contacts/[id]/page.tsx_ (fiche-client)
- **Endpoints /api/contact et /api/contact/[id] sans aucune authentification — exposition + modification/suppression anonyme des contacts en prod** — _/api/contact, /api/contact/[id]_ (fiche-client)
- **API REST et Convex totalement non authentifiés — CRM exposé publiquement en prod** — _/api/crm/*, middleware, convex/_ (boilerplate)
- **Double stack d'auth : 16 routes API encore sur Supabase alors que l'app est sur Clerk** — _/devis, /conversations, /api/* (16 routes)_ (boilerplate)

### MAJOR (42)

- **Pollution de données de test en production (au-delà du « d d » connu)** — _/contacts, /pipeline, /prospection_ (visuel:acquisition)
- **/pipeline : compteur « 13 opportunités » mais 12 cartes visibles** — _/pipeline (KanbanBoard)_ (visuel:acquisition)
- **/prospection mobile : le compteur « 11 à traiter » est recouvert par le bouton « Nouveau lead »** — _/prospection (mobile 390px)_ (visuel:acquisition)
- **Flux « Activité agents » du dashboard : fallback sur des logs fictifs hardcodés + 500 serveur** — _/dashboard + /api/agent-logs_ (visuel:acquisition)
- **Calendrier : module entier bloqué sur un seul fetch, skeleton sans fin observé, aucun état d'erreur** — _/calendrier_ (visuel:cycle-client)
- **Calendrier alimenté par des données MOCK en environnement de prod** — _/calendrier (API /api/calendrier)_ (visuel:cycle-client)
- **/api/calendrier répond 200 avec données sans authentification** — _/api/calendrier_ (visuel:cycle-client)
- **Bannière 'Installer VividFlow' recouvre la navigation mobile et du contenu** — _mobile global (vu sur /onboarding, /paiement, /calendrier)_ (visuel:cycle-client)
- **Onboarding : progression 0% alors que l'étape 'Formulaire d'onboarding' est cochée** — _/onboarding_ (visuel:cycle-client)
- **Paiement : 16 000 CHF 'en attente' au-dessus de '0 mouvements — Aucune transaction sur la période'** — _/paiement_ (visuel:cycle-client)
- **/bibliotheque/data : >12s sans contenu réel et sidebar noire vide pendant le chargement** — _/bibliotheque/data + shell (Sidebar)_ (visuel:bibliotheques)
- **Records : erreurs API tl;dv silencieusement avalées → faux état vide** — _/bibliotheque/records_ (visuel:bibliotheques)
- **Suppression d'un process sans aucune confirmation** — _/bibliotheque/process (détail)_ (visuel:bibliotheques)
- **Convention maison violée : titres en font-black/bold dans les 3 vues** — _/bibliotheque/* (typographie)_ (visuel:bibliotheques)
- **Boutons d'édition « ··· » en opacity-0 → invisibles et inaccessibles au tactile** — _/bibliotheque/data (mobile)_ (visuel:bibliotheques)
- **Captures desktop/mobile des 3 routes non livrées** — _livrable audit_ (visuel:bibliotheques)
- **Le bandeau PWA « Installer VividFlow » recouvre la navigation mobile** — _mobile global (InstallPrompt / MobileNav)_ (visuel:agentique)
- **Aucun état de chargement sur /taches et /logs : flash d'état vide** — _/taches + /logs_ (visuel:agentique)
- **Badge vert « vérifié » affiché sur TOUTES les intégrations, même non connectées** — _/integrations_ (visuel:agentique)
- **Journal d'activités : libellés techniques bruts non humanisés** — _/logs_ (visuel:agentique)
- **Route /activites inexistante : 404 Next.js par défaut, en anglais, hors app shell** — _/activites (module Activités = /logs)_ (visuel:agentique)
- **Le bloc Pipeline/Opportunités de la fiche lit GHL (toujours vide) et l'édition d'opportunité écrit dans GHL au lieu de Convex crm_leads** — _/contacts/[id] — Pipeline section + /api/opp/[id]_ (fiche-client)
- **L'attribution (badge origine 'créé par') ne se charge jamais sur la fiche — self-fetch HTTP vers localhost:3000** — _/contacts/[id] — OriginBadge_ (fiche-client)
- **Tous les liens entrants vers la fiche (conversations, pipeline, devis) mènent à un 404** — _ConversationPanel, ContactSlideOver, devis/InfoSection_ (fiche-client)
- **R1 et R2 ignorent la période sélectionnée malgré le libellé « durant la période »** — _/dashboard — convex/dashboard.ts_ (maths)
- **CA désynchronisé entre /pipeline/clients (14 984 CHF) et paiement/dashboard (16 000 CHF)** — _/pipeline/clients vs /paiement vs /dashboard_ (maths)
- **La carte « Paiements encaissés » du dashboard affiche des paiements en attente (et CA encaissé = 0)** — _/dashboard — DashboardClient_ (maths)
- **CA à collecter observé 15 917 CHF non reproductible — l'argent « payé sans date » disparaît de tous les KPIs** — _/dashboard — convex/dashboard.ts caEncaisse/caACollecter_ (maths)
- **Pollution de données dans tous les KPIs : « d d » compté comme client, 2 leads « TEST AUDIT » comptés dans Leads et R1** — _/dashboard, /contacts, /paiement — données Convex prod_ (maths)
- **Yasmine Benali : en colonne R2 du pipeline (= le KPI R2) mais contact statut « perdu »** — _/pipeline vs /dashboard — crm_leads vs crm_contacts_ (maths)
- **Triple régime d'accès données : Convex direct vs REST-sur-Convex vs proxys GHL, avec nommage contradictoire** — _pipeline, contacts, prospection, convex/schema.ts_ (boilerplate)
- **ignoreBuildErrors masque 10 erreurs TS dont un bug runtime réel (reply_to Resend)** — _next.config, src/lib_ (boilerplate)
- **Routes orphelines : verdict route par route** — _src/app/*_ (boilerplate)
- **~850 lignes de composants morts, dont une 2e implémentation complète des Paramètres** — _src/components/parametres, contacts, agentic, equipe_ (boilerplate)
- **Modules visibles affichant du mock comme du live** — _/budget, /equipe, /transcripts, /agent, /architecture_ (boilerplate)
- **Styling à deux régimes : 1734 hex en dur à côté des tokens soren-*, dark mode couvert sur 8 modules/31** — _src/components (global)_ (boilerplate)
- **Pages orphelines sans entree de nav** — _Sidebar.tsx_ (navigation)
- **Routes sans coquille ni lien** — _ShellGate.tsx_ (navigation)
- **Biblio records process orphelins mobile** — _MobileNav_ (navigation)
- **Clients pipeline inaccessible mobile** — _KanbanBoard_ (navigation)
- **Header mobile sans recherche ni cloche** — _MobileHeader.tsx_ (navigation)
- **Recherche fiche contact echoue** — _ContactsView.tsx_ (navigation)

### MINOR (40)

- **/performance : période par défaut « Aujourd'hui » → cockpit entièrement à zéro** — _/performance_ (visuel:acquisition)
- **Convention titres de cards violée : font-bold/font-black au lieu de font-medium** — _/performance, /dashboard (composants)_ (visuel:acquisition)
- **Dark mode : couleurs claires codées en dur dans DashboardClient (artefacts probables)** — _/dashboard (date-picker / calendrier)_ (visuel:acquisition)
- **Mélange FR/EN et faute d'accord : « inbound/outbound/lead », « Zone perdu »** — _/pipeline, /contacts (libellés)_ (visuel:acquisition)
- **/contacts desktop : colonne MÉTIER 100% vide et badges NICHE tronqués au bord droit** — _/contacts (table desktop)_ (visuel:acquisition)
- **Formats de téléphone incohérents dans /contacts** — _/contacts_ (visuel:acquisition)
- **Bannière PWA « Installer VividFlow » recouvre le contenu sur toutes les vues mobiles** — _mobile (toutes routes)_ (visuel:acquisition)
- **Pollution de données visibles dans la liste d'onboarding** — _/onboarding_ (visuel:cycle-client)
- **Convention maison violée : titres de cards en font-bold/font-black** — _typographie transverse (/paiement, /contacts/[id], /onboarding, /calendrier)_ (visuel:cycle-client)
- **Skeleton du calendrier non responsive : layout desktop écrasé sur 390px** — _/calendrier mobile_ (visuel:cycle-client)
- **Français : anglicismes, 404 anglaise et mélange tu/vous** — _libellés transverses_ (visuel:cycle-client)
- **Fluidité générale : aucun contenu réel en moins de 4s sur les 4 routes pendant l'audit** — _transverse (fluidité)_ (visuel:cycle-client)
- **Mélange FR/EN dans Records : « Transcript », « record », « balises »** — _/bibliotheque/records_ (visuel:bibliotheques)
- **DocEditor : couleurs codées en dur incompatibles dark mode** — _/bibliotheque/process (éditeur de document)_ (visuel:bibliotheques)
- **Data : code mort et filtre « Assigné à » sans équivalent dans les dossiers** — _/bibliotheque/data_ (visuel:bibliotheques)
- **Incohérence de nommage breadcrumb vs navigation : « LOGS » et « KNOWLEDGE BASE » en anglais** — _/logs + /knowledge (Header desktop)_ (visuel:agentique)
- **Date ISO brute affichée sur une carte de tâche** — _/taches_ (visuel:agentique)
- **Convention titres non respectée : font-black/font-bold sur les titres de cards et panneaux** — _composants agentiques partagés + intégrations_ (visuel:agentique)
- **Skeletons incohérents avec le layout final (Budget, Intégrations)** — _/budget + /integrations_ (visuel:agentique)
- **Mélange tutoiement/vouvoiement dans le modal de connexion d'intégration** — _/integrations (modal Connecter)_ (visuel:agentique)
- **Mobile Tâches : boutons « Colonne ‹ / Colonne › » vagues et répétés sous chaque carte** — _/taches mobile_ (visuel:agentique)
- **Vues mobiles Knowledge et Activités très longues sans pagination (≈8000px CSS)** — _/knowledge + /logs mobile_ (visuel:agentique)
- **Kanban desktop : colonnes fixes w-56 laissant un grand vide à droite** — _/taches desktop_ (visuel:agentique)
- **Contenu Skills entièrement en anglais dans un SaaS francophone** — _/knowledge (onglet Skills)_ (visuel:agentique)
- **États « non branché » et persistance localStorage exposés dans l'UI (assumé doctrine, mais visible)** — _/equipe + /knowledge + /logs_ (visuel:agentique)
- **/api/agent-logs en erreur 500 (« supabaseUrl is required ») en local** — _API /api/agent-logs (widget dashboard)_ (visuel:agentique)
- **Lien 'entreprise' mort dans le slideover contact (href='#')** — _contacts/ContactPanel.tsx_ (fiche-client)
- **Titres de cards en font-bold sur la fiche — viole la convention maison (font-medium, jamais bold)** — _/contacts/[id] — titres de sections_ (fiche-client)
- **Page 404 générique et en anglais (pas de not-found.tsx custom)** — _/contacts/[id] — 404_ (fiche-client)
- **Conversion globale 7/22 ≠ inbound 2/3 + outbound 1/13 : 4 clients sur 7 invisibles dans la segmentation** — _/dashboard — ConversionRates / convex/paiement.ts_ (maths)
- **tzOffset incohérent : les cartes de conversion calculent en jours UTC, les KPIs en jours locaux** — _/dashboard — ConversionRates.tsx_ (maths)
- **Définitions « clients/leads » dupliquées et divergentes entre dashboard.getMetrics et paiement.overview, avec commentaires faux** — _convex/dashboard.ts + convex/paiement.ts_ (maths)
- **Échéances stockées en flottant (833.3399999999999) et arrondis d'affichage qui ne somment plus (3×833 ≠ 2 500)** — _/paiement, /dashboard — montants_ (maths)
- **/performance : « CA généré 0 CHF » est un placeholder codé en dur, et son « R1 » vient d'une autre table que le R1 du dashboard** — _/performance — convex/performance.ts_ (maths)
- **Convention « titres de cards font-medium, jamais bold » violée dans plusieurs modules** — _dashboard, transcripts, chatbot, conversations_ (boilerplate)
- **Aucune primitive partagée Modal/Badge/format : scaffolding copié-collé dans 22 fichiers** — _src/components/ui, shared_ (boilerplate)
- **Notifications toutes vers logs** — _NotificationBell.tsx_ (navigation)
- **Recherche propose pages interdites** — _Header.tsx_ (navigation)
- **Deux mecanismes de fiche contact** — _ContactsView_ (navigation)
- **Biblio projets onboarding sans nav** — _BibliothequeNav_ (navigation)

### POLISH (18)

- **Skeleton du dashboard cassé sur mobile (placeholders qui débordent des cartes)** — _/dashboard (loading state mobile)_ (visuel:acquisition)
- **/pipeline desktop : affordances de drag affichées en permanence (« Zone perdu », « Déposer ici »)** — _/pipeline (KanbanBoard)_ (visuel:acquisition)
- **Placeholder de recherche tronqué dans le header desktop** — _header global (toutes routes desktop)_ (visuel:acquisition)
- **/pipeline mobile : boutons de déplacement d'étape ambigus** — _/pipeline (mobile)_ (visuel:acquisition)
- **KPI Paiement : même variant orange plein pour 'Montant encaissé' et 'Remboursé'** — _/paiement_ (visuel:cycle-client)
- **Placeholder de la recherche globale tronqué** — _Header (toutes pages desktop)_ (visuel:cycle-client)
- **Onboarding mobile : détail client sous le fold, après la liste complète** — _/onboarding mobile_ (visuel:cycle-client)
- **Typographie globalement sous-dimensionnée (10-11px) dans les 3 vues** — _/bibliotheque/* (densité/lisibilité)_ (visuel:bibliotheques)
- **Icône Wallet sombre sur fond orange dans la carte Total du Budget** — _/budget_ (visuel:agentique)
- **Budget mobile : « 301 CHF / mois » coupé en deux lignes** — _/budget mobile_ (visuel:agentique)
- **Filtres agents en ALL CAPS encombrants (3 lignes sur mobile)** — _/taches + /logs_ (visuel:agentique)
- **Code mort : equipe/AgentDrawer.tsx et le dossier tabs/ ne sont plus référencés** — _src/components/equipe_ (visuel:agentique)
- **Fluidité : mesures non significatives en environnement d'audit (caveat)** — _global (méthodologie)_ (visuel:agentique)
- **Pollution de données: contact de test 'd d' toujours présent + 'Jonathan Joao' suspect** — _données Convex crm_contacts_ (fiche-client)
- **Dead code calculant des chiffres contradictoires (taux 58 %, mocks CHF)** — _src/components/dashboard, src/components/contacts_ (maths)
- **Déviations du pattern <Module>View.tsx (structure globalement saine)** — _src/components_ (boilerplate)
- **Webhooks : console.log de payloads complets avec PII en prod** — _src/app/api/webhooks_ (boilerplate)
- **Fleche incoherente cards dashboard** — _DashboardClient.tsx_ (navigation)

## Tribunal — verdicts


### Juge procureur

**À retenir (prioritaire) :**
- API REST et Convex totalement non authentifiés en prod — fusionner les 4 findings sécurité : vérifié anonymement en production /api/crm/contacts 200, /api/crm/leads 200, /api/contact 200 (avec PUT/DELETE exposés), /api/dashboard 200 en 0,24 s, /api/calendrier 200 ; middleware.ts:14 exclut /api/* et grep getUserIdentity dans convex/*.ts = 0 — le CRM entier (22 contacts nominatifs, CA, pipeline) est lisible et modifiable sans session
- La fiche client /contacts/[id] renvoie 404 pour TOUS les contacts réels (version fiche-client) — confirmé : GHL_API_KEY absent → fallback MOCK_CONTACTS → notFound() pour tout id Convex ; 404 reproduit par mon propre curl prod sur /contacts/p57eqs986m61q601w3h6m242an889jtb
- Double stack d'auth : 16 routes API encore sur Supabase (getAuthContext → supabase.auth.getUser) alors que le front est sur Clerk — vérifié : signInWithPassword = 0 occurrence dans src/, /devis et /conversations structurellement morts (401 systématique)
- Pollution de données de test en production et impact sur les KPIs — confirmé en base prod : 2 contacts TEST AUDIT (source 'audit'), 'd d' en statut client, tâches/activités ZZ-* ; le lead 'TEST AUDIT - Sync Pipeline Perdu' (status open, stageId 'perdu') explique exactement le compteur 13 vs 12 cartes du kanban
- Données MOCK présentées comme réelles en environnement de prod — confirmé : /api/calendrier renvoie mock-1..mock-6 ('RDV M. Dubois') en prod, /api/agent-logs a un fallback de 10 logs inventés, /budget (USD_TO_CHF=0.7961 en dur), /transcripts et /agent affichent des données fictives sans marqueur démo
- Incohérences chiffrées du cockpit (findings maths) — vérifiés : Yasmine Benali open/r2 avec contact statut 'perdu', R1/R2 sans filtre de période sous un libellé 'durant la période', CA 14 984 vs 16 000, table 'Paiements encaissés' affichant des attentes, échéance stockée 833.3399999999999
- ignoreBuildErrors masque 10 erreurs TS réelles dont reply_to → replyTo (Resend) — reproduit : npx tsc --noEmit confirme email.ts:95, stripe.ts:5, doctrine.ts:277-281, RollingNumber, web-push, pdf.ts
- Bannière PWA InstallPrompt (fixed z-[9999]) recouvre la nav mobile (z-50) et du contenu actionnable — confirmé dans le code et sur les captures des 3 agents ; nuance : le dismiss EST persisté en localStorage, seule la superposition est le bug
- Suppression d'un process sans aucune confirmation (ProcessView.tsx:175, mutation Convex directe sur données prod partagées) — confirmé
- Onboarding : progression 0% avec étape cochée (steps compte !!tasks.formSent, la carte est done si formSent OU formReceivedAt — OnboardingView.tsx:172 vs 203) et badge BadgeCheck vert inconditionnel sur toutes les intégrations même non connectées (IntegrationsView.tsx:123/135) — les deux confirmés dans le code

**Angles morts repérés :**
- [major] Badge inbound/outbound du pipeline = donnée fausse lue depuis localStorage — KanbanBoard.tsx:67-72 : le badge source de chaque carte est lu depuis localStorage('vividflow_contact_source') avec défaut 'inbound'. Résultat vérifié sur acq-pipeline-desktop.png : les 12 cartes affi
- [critical] Toute la famille /api/crm/* est dumpable anonymement, pas seulement /contacts — Vérifié en prod : curl anonyme https://data-os.vividflow.co/api/crm/leads → 200 avec les 15 leads (noms, stages, statuts). Les audits citaient /api/crm/contacts, /api/contact, /api/dashboard et /api/c
- [minor] Sidebar noire vide pendant le chargement : défaut généralisé au shell entier, pas seulement à /bibliotheque — La capture acq-dashboard-desktop-final.png (agent acquisition) montre exactement le même panneau noir mort (aucun logo, aucun item) sur /dashboard que celui décrit par l'agent bibliothèques sur /bibli
- [minor] fetchAttribution self-HTTP avec fallback localhost:3000 : signalé mais sans noter qu'il rend la page dépendante d'une variable NEXT_PUBLIC_ jamais définie — Complément au finding attribution : .env.local ne contient aucune NEXT_PUBLIC_APP_URL (vérifié : seules les clés Clerk/Convex y figurent), donc le badge origine est mort dans tous les environnements q

### Juge completude

**À retenir (prioritaire) :**
- API REST et Convex totalement non authentifiés — CRM exposé publiquement en prod (vérifié : /api/dashboard servi sans cookie en local avec caACollecter/clientTimeline ; curl prod 200 sur /api/crm/contacts par l'agent émetteur ; 0 ctx.auth dans convex/)
- Endpoints /api/contact et /api/contact/[id] sans authentification — lecture, modification (PUT) et suppression (DELETE) anonymes des contacts en prod
- La fiche client /contacts/[id] renvoie 404 pour TOUS les contacts réels — page de détail branchée sur GHL/mocks alors que les données vivent dans Convex (cause racine vérifiée, tous les liens entrants mènent au 404)
- Double stack d'auth : 16 routes API encore sur Supabase (auth morte depuis la migration Clerk) — /devis et /conversations fonctionnellement morts mais toujours exposés dans le shell
- Pollution de données de test en production partagée (consolidé : contacts TEST AUDIT, tâches/activités ZZ-com/ZZ-dnd, 'd d', 'Thomas Alves Do Rio' société 'd') — visible dans contacts/pipeline/prospection/onboarding/tâches/logs ET comptée dans les KPIs (Leads 12, R1 2, Clients 7, conversion 7/22)
- Calendrier alimenté par 6 rendez-vous MOCK hardcodés présentés comme réels + module entier gaté sur un seul fetch sans état d'erreur, et /api/calendrier servi sans auth
- CA désynchronisé : 14 984 CHF (/pipeline/clients) vs 16 000 CHF (dashboard/paiement) + montants payés-sans-date qui disparaissent de tous les compteurs (convex/dashboard.ts:58-63) + KPI 16 000 CHF 'en attente' au-dessus de '0 mouvements'
- Yasmine Benali en colonne R2 active alors que son contact est 'perdu' + R1/R2 ignorent la période malgré le libellé 'durant la période' — désynchronisation crm_leads/crm_contacts et définitions KPI divergentes
- Bannière PWA 'Installer VividFlow' (z-9999) qui masque la navigation mobile (z-50) et du contenu actionnable sur toutes les routes (consolidé des 3 sources)
- ignoreBuildErrors masque 10 erreurs TS dont un bug runtime réel (reply_to vs replyTo Resend : le reply-to est silencieusement perdu sur tous les emails sortants)

**Angles morts repérés :**
- [major] /formulaire public : page de capture de leads cassée sur mobile (capturé) — Aucun agent n'a capturé /formulaire alors que c'est LA page publique du funnel, typiquement ouverte depuis un téléphone. La colonne gauche est en w-[440px] flex-shrink-0 (src/app/formulaire/Formulaire
- [major] /formulaire EN PROD : branding fallback 'Votre entreprise' + photo de chantier BTP + fausses statistiques marketing hardcodées — Vérifié sur data-os.vividflow.co/formulaire (GET anonyme) : le HTML prod contient 5× 'Votre entreprise' (company_settings Supabase non configuré → fallback de page.tsx:26), la photo /hero-chantier.jpg
- [critical] /api/leads/capture : les leads du formulaire public n'arrivent JAMAIS dans le CRM Convex affiché — Le handler (src/app/api/leads/capture/route.ts:93-160) écrit exclusivement dans GHL (createGHLContact, clé absente/morte selon le finding fiche-client) et dans les tables Supabase contacts/leads/conve
- [major] /signer/[token] jamais audité : le tracé de signature n'est jamais transmis ni persisté malgré la mention 'valeur légale eIDAS' — Page publique de signature de devis totalement absente du dossier. Le canvas react-signature-canvas n'est jamais sérialisé : handleSign fait un POST sans body (src/app/signer/[token]/page.tsx:84) et l
- [minor] /signer : montants en EUR et TVA française 20% dans un SaaS suisse en CHF — fmtEUR formate en 'currency: EUR' (page.tsx:29-31) et le TTC fallback est montant_ht * 1.2 (TVA FR 20%, page.tsx:169) alors que toute l'app (dashboard, paiement, pipeline) est en CHF et que la TVA sui
- [minor] Accessibilité clavier/lecteur d'écran : angle mort total de l'audit — Aucun des 6 agents n'a testé la navigation clavier. Indicateurs code : 20 occurrences aria-* sur tout src/components (31 modules), 0 occurrence de focus-visible, 36 <div onClick> non focusables, 4 rol
- [info] Angles morts résiduels non couverts (à re-vérifier) — 1) /parametres (SettingsShell : Profil, Apparence, Équipe, gestion utilisateurs) n'a été capturé par aucun agent — y compris la section mot de passe alors que l'auth est passée à Clerk. 2) Le dark mod

### Juge pragmatique

**À retenir (prioritaire) :**
- La fiche client /contacts/[id] renvoie 404 pour TOUS les contacts réels (source GHL/mock divergente alors que les données vivent dans Convex)
- API REST et Convex totalement non authentifiés — CRM exposé publiquement en prod
- Endpoints /api/contact et /api/contact/[id] sans aucune authentification — exposition + modification/suppression anonyme des contacts en prod
- Pollution de données dans tous les KPIs : « d d » compté comme client, 2 leads « TEST AUDIT » comptés dans Leads et R1
- Pollution de données de test dans les tâches et le journal d'activités (prod)
- CA désynchronisé entre /pipeline/clients (14 984 CHF) et paiement/dashboard (16 000 CHF)
- R1 et R2 ignorent la période sélectionnée malgré le libellé « durant la période »
- Double stack d'auth : 16 routes API encore sur Supabase alors que l'app est sur Clerk
- Calendrier alimenté par des données MOCK en environnement de prod
- Le bandeau PWA « Installer VividFlow » recouvre la navigation mobile

**Angles morts repérés :**
- [critical] Suppression anonyme EN CASCADE et irréversible d'un client complet — Aggrave les findings d'auth : convex/crm_contacts.ts:105-118 montre que `remove` supprime en cascade le contact + tous ses crm_leads + tout le lead_stage_history + les pipeline_clients associés, sans 
- [major] /api/leads/capture public sans captcha ni rate-limit, avec déclenchement WhatsApp/Kai — src/app/api/leads/capture/route.ts : route publique (middleware exclut /api/*), aucun secret, captcha ou rate-limit (grep négatif), qui crée des contacts GHL, envoie des WhatsApp via Twilio (coût réel
- [minor] Le rapport ne consolide pas ses propres doublons — Cinq agents remontent séparément la convention font-medium, trois la bannière PWA, trois la 404 anglaise, quatre la pollution de test, deux le placeholder tronqué. Pour l'exécution, traiter chacun com

## Passe interactive publique (30 findings)

- **Zone assignée entièrement inaccessible — auth Clerk DEV en boucle de redirection, aucune session ni identifiant** [critical] — _auth / accès audit_
- **Validation de format email du login en anglais dans une UI française** [minor] — _/login (formulaire de connexion)_
- **Serveur next dev instable : compilation froide très lente et crash/redémarrage observé** [major] — _infra dev (localhost:3100)_
- **Validation /login messages natifs en ANGLAIS sur page francaise** [minor] — _/login_
- **Module paiement en lecture seule aucun bouton de creation** [minor] — _/paiement_
- **Serveur dev QOS fige en boucle de crash de worker thread** [major] — _Infra dev_
- **Console avertissement CSP repete script-src non defini** [polish] — _Securite_
- **Deep-link non authentifie redirige vers page Clerk hebergee en anglais au lieu du login brande** [major] — _Auth Middleware_
- **BLOQUEUR — Connexion impossible : l'instance Clerk dev n'accepte que le code OTP par e-mail (aucun mot de passe configuré)** [critical] — _auth / accès audit_
- **Note de revue (statique) — submitLink() n'a aucune validation d'URL : un texte arbitraire est accepté comme lien** [minor] — _/bibliotheque/data — modal Ajouter un lien_
- **Note de revue (statique) — uploadFiles/uploadPreview/submitLink avalent toutes les erreurs (catch vide) : aucun feedback en cas d'échec** [minor] — _/bibliotheque/data + /process — upload & lien_
- **Note de revue (statique) — recherche dossier Data: la recherche par tag est sensible à la casse alors que le nom ne l'est pas** [polish] — _/bibliotheque/data — recherche dans dossier_
- **Note de revue (statique) — toggleTag dans DataView est un no-op mort (useCallback vide)** [polish] — _/bibliotheque/data_
- **Session navigateur deconnectee audit impossible** [critical] — _Auth_
- **api/contact exposes all contact PII without auth** [critical] — _public API security_
- **formulaire broken on mobile 390px** [major] — _formulaire responsive_
- **formulaire and merci broken in dark mode** [major] — _formulaire theme_
- **form/API mismatch on lastName -> opaque error** [major] — _formulaire + api/leads/capture_
- **protect() redirects to hosted Clerk sign-in not /login** [minor] — _middleware auth_
- **native validation messages in English on French form** [minor] — _formulaire validation_
- **merci without prenom shows Merci vous** [polish] — _formulaire/merci_
- **inscription footer Se connecter wraps lines** [polish] — _inscription footer_
- **Formulaire public /formulaire casse sur mobile** [major] — _/formulaire FormulaireForm.tsx l137-141_
- **Desaccord validation client/serveur sur lastName** [major] — _/formulaire + api/leads/capture_
- **Routes protegees redirigent vers page Clerk EN ANGLAIS; /start inatteignable** [major] — _middleware.ts l5-10 + (public)/start_
- **Messages de validation HTML5 en anglais sur pages francaises** [minor] — _/login /inscription /formulaire_
- **/formulaire/merci affiche Merci vous sans param prenom** [minor] — _MerciContent.tsx l14_
- **/signer token invalide genere 2 erreurs console 404** [minor] — _/signer/[token]_
- **/api/health renvoie 503 down** [minor] — _/api/health_
- **Widget Clerk lent a monter sur /login** [polish] — _/login_

## Passe interactive authentifiée (14 findings)

- **Dashboard skeleton infini sous backend lent** [major] — _/dashboard_
- **Serveur next dev partage sature/fige** [critical] — _infra localhost:3100_
- **Aucune hydratation React boucle redirection Clerk bloque tout test interactif sur les 4 pages** [critical] — _Auth Clerk env toutes pages_
- **paiement vue lecture seule sans bouton creation et onboarding 0 clients** [minor] — _PaiementView.tsx OnboardingView.tsx_
- **BLOCKER bibliotheque-data ne s'hydrate jamais** [critical] — _infra_
- **Boucle handshake Clerk infinie ERR_TOO_MANY_REDIRECTS sur routes protegees** [critical] — _Auth Clerk_
- **DocEditor SOP Playbook persiste seulement en localStorage sans indication** [major] — _knowledge DocEditor_
- **equipe statut Actif Inactif et overrides agents en localStorage uniquement mock** [major] — _equipe_
- **budget 100 pourcent statique aucune edition possible** [minor] — _budget_
- **integrations Connecter soumet sans validation et ecrit en Convex prod** [major] — _integrations_
- **Activites pointe vers logs, route activites inexistante** [minor] — _Navigation_
- **Routes protegees lentes a la premiere compilation dev** [minor] — _Perf_
- **Boucle de redirection Clerk infinie - mismatch de cles entre session navigateur (prod pk_live) et serveur dev (pk_test) rend toute l'app authentifiee inaccessible** [critical] — _Auth / Clerk / Config environnement_
- **Serveur dev degrade: recompilation/CPU en boucle + timeouts (000) sur pages publiques en fin d'audit** [major] — _Infra / dev server Next.js_