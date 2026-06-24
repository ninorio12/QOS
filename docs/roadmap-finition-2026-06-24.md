# Roadmap finition Data OS VividFlow

_Genere le 2026-06-24 a partir de l audit 10 agents (read-only). Base: docs/audit-dataos-decisions.md + verification du code reel._

## Synthese

Le chantier de finition VividFlow a deja des acquis solides (requireAdmin server-side, source argent unique reconcileMoney, funnel/cockpit unifies, navigation mobile, module Equipe reconstruit, 7 agents Slack actifs). Mais il reste 4 failles de securite BLOQUANTES (mutations Convex publiques sans identite, IDOR sur users.*, routes WhatsApp/send-message et knowledge/docs sans auth), la mono-devise CHF non appliquee (EUR affiche en CHF, paiements multi-devises additionnes a tort), le passage en client qui cree des clients a 0 CHF par 4 a 6 chemins divergents, le module Closing qui ne peut pas cloturer un appel, et le tiret cadratin U+2014 ecrit jusque dans des donnees persistees sans garde-fou CI. Cette to-do regroupe 6 vagues dans l'ordre demande: Securite, Integrite des chiffres, Continuite du parcours, Coherence nommage, Robustesse, puis Sweep wording. Decisions a trancher par Thomas avant de coder: Supabase vivant ou mort, source unique du R1, montant 'a definir' autorise ou non, backfill iClosed des 100 R1 historiques, definition de la recommandation.

## Vague 1 - Securite et auth

- [ ] **Garder toutes les mutations Convex sensibles avec une verif d'identite serveur (requireActor)**  `L`
  - Impact : Aujourd'hui n'importe qui connaissant l'URL Convex publique peut muter tout le CRM sans session ni token.
  - Fichiers : convex/crm_contacts.ts, convex/pipeline_clients.ts, convex/devis.ts, convex/osProspection.ts, convex/osLib.ts, src/app/api/mcp/route.ts
  - Correctif : Ajouter un helper requireActor(ctx) qui valide identite Clerk OU contexte MCP signe, et l'appeler en tete des 52 mutations exportees; deriver l'acteur serveur, ne jamais faire confiance a createdBy du payload.
- [ ] **Corriger l'IDOR sur users.updateProfile / getCurrent / syncFromClerk**  `M`
  - Impact : Un appelant peut modifier le profil d'autrui et capturer un role admin via l'email, sans meme une session.
  - Fichiers : convex/users.ts
  - Correctif : Deriver clerkUserId de ctx.auth.getUserIdentity().subject; supprimer/ignorer l'argument client clerkUserId+email; pour syncFromClerk lier par email seulement si identity.email verifie == a.email.
- [ ] **Proteger /api/whatsapp/send et /api/send-message (envoi de messages non authentifie)**  `S`
  - Impact : Envoi de messages WhatsApp/SMS aux frais de l'org et injection dans les conversations depuis le numero officiel, sans aucune auth.
  - Fichiers : src/app/api/whatsapp/send/route.ts, src/app/api/send-message/route.ts, src/middleware.ts
  - Correctif : Ajouter ces paths (+ /api/voice/*) a isProtectedApi ET une garde getAuthContext/isApiCallerAdmin explicite dans chaque handler.
- [ ] **Proteger /api/knowledge/docs POST et DELETE (service-role Supabase sans auth)**  `S`
  - Impact : Tout utilisateur peut ecrire/supprimer des docs de connaissance via la cle service_role qui contourne RLS.
  - Fichiers : src/app/api/knowledge/docs/route.ts
  - Correctif : Ajouter isApiCallerAdmin() en tete de POST/DELETE; ne jamais exposer createAdminClient sans controle de role.
- [ ] **Restreindre le CORS du MCP et separer le break-glass du secret de service**  `M`
  - Impact : CORS '*' facilite l'exfiltration si un token fuit; un secret unique compromis donne le controle total.
  - Fichiers : src/app/api/mcp/route.ts, src/middleware.ts
  - Correctif : Retirer Access-Control-Allow-Origin '*' (API serveur a serveur); separer HERMES_API_SECRET (lecture machine) du break-glass humain avec rotation documentee.
- [ ] **Trancher et nettoyer le double systeme d'auth Supabase vs Clerk**  `M`
  - Impact : getAuthContext s'appuie sur Supabase alors que la prod tourne sous Clerk: gardes cassees ou surface d'auth parallele exploitable.
  - Fichiers : src/lib/auth-context.ts, src/app/api/chat/route.ts, src/app/api/voice/call/route.ts, src/app/contacts/actions.ts
  - Correctif : Unifier sur Clerk (auth() de @clerk/nextjs/server) pour toutes les routes; supprimer le chemin Supabase mort (dont contacts/actions.ts qui ecrit dans une base parallele).
- [ ] **Migration one-shot pour purger les secrets historiques de la table integrations**  `S`
  - Impact : Des lignes ecrites avant le correctif peuvent encore contenir un secret en clair.
  - Fichiers : convex/schema.ts, convex/integrations.ts
  - Correctif : internalMutation qui set secret:undefined sur toutes les lignes integrations, puis envisager de retirer le champ du schema.

## Vague 2 - Integrite des chiffres

- [ ] **Corriger le bug SYMBOLS.EUR='CHF' qui affiche les EUR comme des CHF**  `S`
  - Impact : Un montant en EUR s'affiche '... CHF', falsification visuelle directe des chiffres.
  - Fichiers : src/lib/money.ts
  - Correctif : En mono-devise CHF, reduire SYMBOLS a { CHF: 'CHF' } et faire que currencySymbol() retourne toujours 'CHF'.
- [ ] **Empecher reconcileMoney d'additionner des devises differentes sans normalisation**  `M`
  - Impact : Un paiement encaisse en EUR/USD est ajoute brut a l'encaisse CHF: encaisse, a collecter, ROI et panier du dashboard ET du cockpit sont faux.
  - Fichiers : convex/moneyReconciliation.ts, convex/stripeSync.ts, convex/externalPayments.ts
  - Correctif : Filtrer/ignorer (ou convertir) toute ligne dont currency != 'chf' avant de l'additionner, ou garantir en amont que seules des lignes CHF entrent.
- [ ] **Forcer la devise CHF par defaut a la creation de paiements Stripe**  `S`
  - Impact : Tout paiement cree sans devise explicite arrive en EUR puis pollue l'encaisse CHF.
  - Fichiers : src/lib/stripe.ts
  - Correctif : Remplacer le defaut 'eur' par 'chf' dans createPaymentIntent et createCheckoutSession (importer DEFAULT_CURRENCY de money.ts).
- [ ] **Retirer le selecteur de devise EUR/USD/GBP du contrat d'onboarding**  `S`
  - Impact : Le contrat laisse choisir une devise non-CHF, brisant la regle mono-devise.
  - Fichiers : src/components/bibliotheque/OnboardingView.tsx
  - Correctif : Supprimer le select CONTRACT_CURRENCIES et forcer currency='CHF' dans l'appel /api/onboarding/contract.
- [ ] **Faire de lead_stage_history la source unique du R1 booke**  `L`
  - Impact : Trois R1 divergents coexistent (dashboard live-stage, performance events, funnel cohorte): pilotage incoherent et carnet bloquant non tenu.
  - Fichiers : convex/lead_stage_history.ts, convex/dashboard.ts, convex/performance.ts, convex/prospectionCockpit.ts, convex/funnelCohort.ts
  - Correctif : Creer un helper partage r1BookedInPeriod() base sur lead_stage_history (facon reconcileMoney) et le rebrancher sur summary + funnel + dashboard; OU acter explicitement la cohorte comme source unique et supprimer le code mort countByStageInPeriod.
- [ ] **Supprimer le defaut fabrique source ?? 'inbound' dans recentLeads**  `S`
  - Impact : Un lead sans source est affiche faussement comme inbound (bloquant 'source vide honnete' non tenu).
  - Fichiers : convex/dashboard.ts
  - Correctif : Remplacer par source: l.source ?? null (ou normalizeLeadSource) et afficher 'Non renseigne' cote UI.
- [ ] **Completer la decomposition des 3 sources et arreter de fabriquer de la recommandation**  `M`
  - Impact : Le funnel n'expose pas recommandation (la somme ne reconstitue pas le total) et les sources vides tombent en recommandation via un catch-all: mensonge deplace.
  - Fichiers : convex/funnelCohort.ts, convex/paiement.ts
  - Correctif : Exposer leadsRecommandation et un segment 'Non renseigne' distinct; matcher c.source==='recommandation' au lieu d'un catch-all source!=inbound&&!=outbound.
- [ ] **Aligner performance.summary R1 et activityCalendar sur la source du funnel**  `M`
  - Impact : Deux definitions de R1 dans le meme module (events vs cohorte) faussent le pilotage.
  - Fichiers : convex/performance.ts
  - Correctif : Brancher summary.r1Booked et activityCalendar.r1 sur la meme source que le funnel, ou documenter clairement la difference R1-du-jour vs R1-cohorte.
- [ ] **Afficher le ROI avec une decimale (x4,8 au lieu de x5)**  `S`
  - Impact : Le ROI arrondi a l'entier surrepresente la performance affichee.
  - Fichiers : src/components/prospection/ProspectionCockpit.tsx
  - Correctif : Formater le ROI a 1 decimale (fr-CH minimumFractionDigits:1) sans toucher au fmt entier des montants CHF.
- [ ] **Arrondir le total budget une seule fois (pas par ligne)**  `S`
  - Impact : L'arrondi par ligne avant somme rend le total budget faux d'environ 1 CHF, incoherent avec le ROI.
  - Fichiers : src/components/budget/BudgetView.tsx, src/app/api/budget/route.ts
  - Correctif : Calculer TOTAL = Math.round(somme brute USD * USD_TO_CHF); appliquer la meme regle cote API consommee par le cockpit.
- [ ] **Retirer ou afficher les objectifs morts 'Total ventes' et 'Cash contracte'**  `S`
  - Impact : Saisie morte qui suggere un suivi inexistant.
  - Fichiers : src/components/prospection/ProspectionCockpit.tsx
  - Correctif : Retirer ces deux champs de la modale et du type Obj, ou ajouter une carte de suivi correspondante.

## Vague 3 - Continuite du parcours lead vers fonds

- [ ] **Creer UNE mutation unique convertToClient qui exige un montant**  `L`
  - Impact : Aujourd'hui 4 a 6 chemins divergents creent des clients a 0 CHF, dont l'intake public; le CA et le pipeline Clients sont pollues.
  - Fichiers : convex/sync.ts, src/components/contacts/NewContactModal.tsx, src/components/pipeline/KanbanBoard.tsx, convex/onboarding.ts, src/app/api/mcp/route.ts
  - Correctif : convertToClient({contactId, dealValue, dealDate, wonObjection}) avec garde value>0 OU flag amountTbd explicite; rebrancher TOUS les points d'entree; supprimer le defaut value:?? 0 de enforce.
- [ ] **Rendre la bascule en client atomique (une mutation, pas deux fetch)**  `M`
  - Impact : Le double appel PUT contact + POST sync peut laisser un client sans montant et faire disparaitre la carte prospection.
  - Fichiers : src/components/pipeline/KanbanBoard.tsx, convex/sync.ts, convex/osProspection.ts
  - Correctif : Fusionner en une seule mutation serveur transactionnelle (convertToClient) au lieu des 2 fetch enchaines cote client.
- [ ] **Empecher l'intake public onboarding de creer un client a 0 CHF**  `M`
  - Impact : Un inconnu qui soumet le formulaire public devient instantanement client a 0 CHF sans lead ni R1 ni montant.
  - Fichiers : convex/onboarding.ts
  - Correctif : Creer un contact/lead a rattacher au lieu d'inserer pipeline_clients value:0 depuis un endpoint public non authentifie.
- [ ] **Ajouter les issues d'appel cloturables dans le module Closing**  `L`
  - Impact : Le closer ne peut pas clore un appel (gagne/perdu/no-show/reprogrammer); aucune propagation outcome vers Pipeline+Prospection.
  - Fichiers : convex/closing.ts, src/components/closing/ClosingView.tsx, convex/schema.ts
  - Correctif : closing.recordOutcome(callId, outcome, dealValue?, lostReason?, objection?, newDate?): gagne->convertToClient; perdu->markLost; no_show->event sans regression; reprogrammer->nouvelle date. Cabler les boutons d'issue dans le drawer.
- [ ] **Synchroniser le board Pipeline Clients vers Onboarding (sens descendant)**  `M`
  - Impact : Glisser une carte client ne touche pas l'onboarding: board et module Onboarding divergent.
  - Fichiers : convex/pipeline_clients.ts, convex/onboarding.ts, src/components/pipeline/ClientsBoard.tsx
  - Correctif : Dans updateStage, aligner le doc onboarding sur le stage cible (creation si absent), idempotent et sans regression.
- [ ] **Robustifier le rapprochement Stripe au-dela de l'email seul**  `M`
  - Impact : Si l'email Stripe differe, contactId reste vide: l'encaisse global compte mais 'a collecter' du client reste a 100%.
  - Fichiers : convex/stripePayments.ts, convex/moneyReconciliation.ts
  - Correctif : Stocker le customerId Stripe sur le contact/client comme fallback de matching + UI de rapprochement manuel des paiements orphelins.
- [ ] **Monter un webhook Stripe temps reel**  `M`
  - Impact : Sans webhook, les paiements n'entrent que via un bouton manuel; le handler est un stub TODO jamais monte.
  - Fichiers : src/lib/stripe.ts, src/components/paiement/PaiementView.tsx
  - Correctif : Creer /api/webhooks/stripe qui appelle stripePayments.upsertFromStripe sur charge.succeeded et refund.
- [ ] **Relier un devis accepte a un paiement Stripe**  `M`
  - Impact : L'etape devis->paiement n'existe pas en code: la boucle devis->encaisse->reconcilie n'est pas fermee.
  - Fichiers : convex/devis.ts, src/lib/stripe.ts, convex/paiement.ts
  - Correctif : Sur un devis accepte/signe, creer un lien de paiement Stripe en CHF et rattacher contact_id -> stripe_payments.contactId.
- [ ] **Ajouter une confirmation a la suppression de RDV Calendrier**  `S`
  - Impact : La corbeille supprime un RDV directement, sans confirmation, alors que les RDV iClosed/Google declenchent une notif externe.
  - Fichiers : src/components/calendrier/CalendarView.tsx
  - Correctif : Ajouter une modale de confirmation destructive avant onDelete.
- [ ] **Centraliser dealDate et wonObjection dans la conversion unique**  `S`
  - Impact : Selon le module, la fiche client a ou n'a pas sa date d'acquisition et son objection surmontee.
  - Fichiers : src/components/pipeline/KanbanBoard.tsx, src/components/contacts/NewContactModal.tsx, convex/onboarding.ts
  - Correctif : La mutation convertToClient centralise dealValue + dealDate + wonObjection pour un resultat identique quel que soit le module.

## Vague 4 - Coherence nommage et structure

- [ ] **Unifier l'UI des droits sur la source unique nav/modules.ts**  `M`
  - Impact : UserManagementCard duplique une liste qui OMET Pipeline Clients: un setter ne peut jamais recevoir ce module et rebondit; label Meta Ads/Media Buyer incoherent.
  - Fichiers : src/components/settings/UserManagementCard.tsx, src/components/nav/modules.ts, src/components/ModuleGuard.tsx
  - Correctif : Importer MODULES depuis nav/modules.ts (inclure /pipeline/clients) et deriver le selecteur de droits de cette unique source.
- [ ] **Creer un resolveur d'identite agent unique (slug <-> nom)**  `M`
  - Impact : 4 resolutions divergentes, aucune ne gere le prefixe 'agent:', cassant les deep-links Equipe->Taches, Equipe->Logs et le retour Logs->Equipe.
  - Fichiers : src/components/agentic/agentProfiles.ts, src/components/equipe/EquipeView.tsx, src/components/taches/TachesView.tsx, src/components/logs/LogsView.tsx
  - Correctif : resolveAgent(input) qui strip 'agent:'/'human:', lowercase, matche id puis name; emettre le slug a.id pour tous les liens sortants; rebrancher les 4 surfaces.
- [ ] **Supprimer en bloc le code mort de gouvernance des agents**  `M`
  - Impact : convex/agents.ts, src/components/agents/*, AgentAccountsView, les AgentDrawer et equipe/tabs/* sont morts et joignables par aucune route.
  - Fichiers : src/app/agents/page.tsx, convex/agents.ts, src/components/agents/AgentGovernanceView.tsx, src/components/equipe/AgentAccountsView.tsx, src/components/equipe/agents.ts
  - Correctif : Supprimer l'arbre mort apres verif qu'aucun import residuel ne casse, puis retirer api.agents du bundle _generated.
- [ ] **Retirer les chiffres mock du profil agent (costToday, lastRun fige)**  `S`
  - Impact : costToday invente est de la donnee morte trompeuse; 'Derniere synchro' est figee au 06 juin.
  - Fichiers : src/components/agentic/agentProfiles.ts, src/components/equipe/EquipeView.tsx
  - Correctif : Retirer le champ costToday; ne plus afficher de date figee (s'appuyer sur brain.syncedAt reel d'AgentSheet); retirer SEED_HEARTBEATS fictifs.
- [ ] **Sortir/renommer ProspectionCockpit en PerformanceEquipeView**  `M`
  - Impact : Le fichier reste dans le dossier prospection et le libelle '/cockpit' = 'Performance' diverge du H2 'Performance Equipe'.
  - Fichiers : src/components/prospection/ProspectionCockpit.tsx, src/components/Header.tsx, src/components/MobileHeader.tsx
  - Correctif : Renommer/deplacer le composant hors de prospection et aligner sur un seul libelle 'Performance Equipe'.
- [ ] **Franciser le groupe Bibliotheque (Data/Records/Process) et aligner les libelles nav**  `S`
  - Impact : Labels anglais et divergence Bibliotheques (sidebar) vs Bibliotheque (registre): charge cognitive inutile.
  - Fichiers : src/components/Sidebar.tsx, src/components/nav/modules.ts
  - Correctif : Franciser en Donnees/Enregistrements/Procedures et aligner sidebar + registre sur un seul libelle.
- [ ] **Mettre a jour le commentaire schema crm_contacts.source (3 valeurs)**  `S`
  - Impact : Le commentaire ne liste que inbound/outbound alors que la regle impose 3 valeurs: risque de reintroduction d'un defaut binaire.
  - Fichiers : convex/schema.ts
  - Correctif : Documenter 'outbound' | 'inbound' | 'recommandation'.

## Vague 5 - Robustesse et bugs

- [ ] **Empecher le fetcher Dashboard de masquer un 500 en zeros**  `S`
  - Impact : Un plantage Convex affiche silencieusement 0 CHF / 0 clients sans etat d'erreur.
  - Fichiers : src/app/dashboard/page.tsx, src/app/api/dashboard/route.ts
  - Correctif : Dans le fetcher, if(!res.ok) throw avant res.json(); SWR passe en erreur et conserve les dernieres valeurs (keepPreviousData deja present).
- [ ] **Extraire un hook useOptimisticMutation partage et l'appliquer a Prospection**  `M`
  - Impact : 4 chemins de ProspectionView (perdu/rdv_booke/a_suivre/quick-set) n'ont ni rollback ni toast: l'UI reste desyncee si Convex rejette.
  - Fichiers : src/hooks, src/components/prospection/ProspectionView.tsx, src/components/pipeline/KanbanBoard.tsx
  - Correctif : Hook useOptimisticMutation(applyOptimistic, mutate, revert, {toasts}) generalisant le pattern de KanbanBoard, branche sur les 4 chemins sans .catch.
- [ ] **Deriver leadStatus de lostReason dans markLost**  `S`
  - Impact : Tout lead perdu est compte 'non_qualifie' meme un no-show: reporting de qualification fausse.
  - Fichiers : convex/leadSync.ts, src/lib/lostReasons.ts
  - Correctif : Ajouter deriveLeadStatus(reason) (non_presentation/contact_annule/annulation_admin->dormant, etc.) et patcher leadStatus avec.
- [ ] **Corriger les flashs d'etat vide et ajouter les loading.tsx manquants**  `M`
  - Impact : useQuery(...) ?? [] montre un board vide puis saute; 10+ routes lourdes n'ont aucun loading.tsx, de facon incoherente.
  - Fichiers : src/components/prospection/ProspectionView.tsx, src/app/prospection, src/app/closing, src/app/calendrier
  - Correctif : Distinguer undefined vs [] pour afficher un skeleton (ui/Skeleton sous-utilise) et ajouter loading.tsx sur prospection/closing/calendrier/knowledge/equipe/taches/paiement/performance/cockpit/media-buyer.
- [ ] **Resorber la dette TypeScript et retirer les flags qui la masquent**  `M`
  - Impact : tsc --noEmit echoue (provider 'iclosed', firstName manquant en POST contacts) mais le build l'ignore: bugs runtime opaques.
  - Fichiers : src/components/calendrier/CalendarView.tsx, src/app/api/crm/contacts/route.ts, src/components/agentic/doctrine.ts, next.config
  - Correctif : Elargir le type provider a 'iclosed', garantir firstName cote create, corriger RawAgent.status; a terme retirer ignoreBuildErrors + ignoreDuringBuilds.
- [ ] **Appliquer une garde anti-regression de stage sur crm_leads.updateStage**  `S`
  - Impact : Un drag arriere peut faire reculer un lead deja R1/R2 et inserer un historique incoherent.
  - Fichiers : convex/crm_leads.ts
  - Correctif : Appliquer la meme garde CALL_STAGE_RANK que advanceForCall, ou assumer explicitement via la confirmation UI confirmBackMove.
- [ ] **Centraliser un helper id->nom francise pour lead_stage_history**  `S`
  - Impact : Les inserts inter-modules posent stageName=id brut ('r1') au lieu du libelle, faussant l'affichage par etape.
  - Fichiers : convex/closing.ts, convex/leadSync.ts, convex/osProspection.ts, convex/sync.ts
  - Correctif : Helper partage id->nom francise utilise par tous les inserts d'historique.
- [ ] **Supprimer le code mort de tracking 'recent modules' du Dashboard**  `S`
  - Impact : ALL_MODULES + useEffect localStorage jamais lus: bruit, faux signal, imports d'icones inutiles, 3e source de modules.
  - Fichiers : src/components/dashboard/DashboardClient.tsx
  - Correctif : Supprimer les deux blocs et les imports devenus inutiles.
- [ ] **Choisir une seule mecanique d'animation d'entree**  `S`
  - Impact : framer-motion et CSS .vf-stagger-page coexistent avec des timings differents: rythme d'apparition incoherent entre ecrans.
  - Fichiers : src/components/ui/Motion.tsx, src/components/PageTransition.tsx, src/app/globals.css
  - Correctif : Retenir une seule source de verite d'animation et aligner les timings.

## Vague 6 - Sweep wording

- [ ] **Ajouter un lint CI bloquant anti U+2014**  `S`
  - Impact : Sans garde-fou, toute correction du tiret cadratin regresse immediatement.
  - Fichiers : package.json, scripts, next.config
  - Correctif : Etape CI/pre-commit: grep -rlP '\x{2014}' src convex public && exit 1.
- [ ] **Sweeper tous les U+2014 dans le code et les chaines user-facing**  `M`
  - Impact : Le tiret cadratin interdit subsiste dans ~125 fichiers src + ~38 convex, dont des titres et placeholders affiches.
  - Fichiers : src/components/dashboard/DashboardClient.tsx, src/components/analyse/ConversionRates.tsx, src/components/knowledge/KnowledgeView.tsx, src/components/contacts/ContactDetailPage.tsx, src/components/contacts/NewContactModal.tsx
  - Correctif : Remplacer par ' - ', ' : ' ou 'Non renseigne'; remplacer les placeholders 'U+2014 Choisir U+2014' par 'Choisir...'.
- [ ] **Corriger les U+2014 ecrits en DONNEES PERSISTEES et backfiller l'existant**  `M`
  - Impact : Le cadratin se fige dans Convex (os_activity.summary, knowledge.title, seeds) et ne ressort pas a un grep code apres correction.
  - Fichiers : convex/leadSync.ts, convex/osProspection.ts, convex/moneyReconciliation.ts, convex/seedDemo.ts, src/components/knowledge/KnowledgeView.tsx
  - Correctif : Corriger les templates serveur ('Synthese U+2014 ' -> 'Synthese : ', summary logActivity) PUIS un internalMutation de backfill qui remplace U+2014 dans os_activity.summary et knowledge.title existants.
- [ ] **Appliquer la convention d'etat vide unique (Non renseigne / Aucun X)**  `M`
  - Impact : Des dizaines de 'U+2014' servent de marqueur 'pas de donnee', ambigus et interdits.
  - Fichiers : src/components/contacts/ContactsView.tsx, src/components/contacts/ContactDetailPage.tsx, src/components/dashboard/DashboardClient.tsx, src/components/agentic/ui.tsx
  - Correctif : Helper empty() unique: 'Non renseigne' pour un champ de fiche, hyphen ASCII '-' pour une cellule, jamais de cadratin.
- [ ] **Remplacer le placeholder de dev 'J'ai poney demain'**  `S`
  - Impact : Un placeholder de test est affiche en prod dans la liste des objections de perte.
  - Fichiers : src/lib/lostReasons.ts
  - Correctif : Remplacer le desc par une vraie description (ex 'Objection de surface / faux pretexte') ou retirer le champ.
- [ ] **Retirer le nom d'outil iClosed et 'Booke' des libelles**  `S`
  - Impact : Le nom d'outil interne fuite dans la colonne et les modales; wording non harmonise.
  - Fichiers : src/components/prospection/ProspectionView.tsx, src/components/shared/IClosedBookingModal.tsx, src/components/performance/PerformanceView.tsx
  - Correctif : Harmoniser en 'RDV planifie' / 'R1 reserves', retirer 'sur iClosed' des labels visibles (URL/constante interne inchangee).
- [ ] **Bannir 'opportunite' (heritage GHL) et le sigle GHL en UI**  `S`
  - Impact : Wording incoherent: 'opportunite' subsiste alors que 'Nouveau lead' est la cible; sigle technique GHL visible.
  - Fichiers : src/components/contacts/ContactDetailPage.tsx, src/components/bibliotheque/RecordsView.tsx, src/components/contacts/ImportModal.tsx, src/components/calendrier/CalendarView.tsx
  - Correctif : Remplacer 'opportunite' par 'lead'/'deal' et 'GHL' par un libelle explicite (ex 'CRM').
- [ ] **Remplacer 'Sync' par 'Synchroniser'/'Synchronisation'**  `S`
  - Impact : Abreviation anglaise residuelle en UI.
  - Fichiers : src/components/media-buyer/MediaBuyerView.tsx, src/components/paiement/PaiementView.tsx, src/components/paiement/StripeConnectModal.tsx
  - Correctif : 'Synchroniser Meta'/'Synchroniser Stripe' et l'etat 'Synchronisation...'.

## Quick wins (fort impact, faible effort)

- [ ] Bug SYMBOLS.EUR='CHF' (src/lib/money.ts): une ligne pour cesser d'afficher des EUR comme des CHF.
- [ ] Defaut Stripe 'eur' -> 'chf' (src/lib/stripe.ts) a deux endroits.
- [ ] Defaut source ?? 'inbound' -> null dans dashboard.recentLeads (convex/dashboard.ts).
- [ ] Fetcher Dashboard: if(!res.ok) throw avant res.json() pour cesser d'afficher 0 CHF sur un 500.
- [ ] ROI a 1 decimale et total budget arrondi une seule fois (deux corrections de formatage a fort impact de credibilite).
- [ ] Placeholder 'J'ai poney demain' retire de src/lib/lostReasons.ts.
- [ ] Confirmation de suppression de RDV Calendrier (src/components/calendrier/CalendarView.tsx).
- [ ] Lint CI bloquant anti U+2014 (empeche toute regression du sweep wording).
- [ ] Proteger /api/whatsapp/send et /api/send-message via isProtectedApi + garde handler (stoppe l'envoi de messages non authentifie).

## Decisions a trancher (Thomas)

- **Supabase est-il encore vivant en prod, ou doit-il etre entierement retire au profit de Clerk+Convex ?**
  - getAuthContext, /api/chat, /api/knowledge/docs et contacts/actions.ts s'appuient encore sur Supabase. S'il est mort, ces routes sont incoherentes; s'il est vivant, c'est une base/auth parallele exploitable. La reponse conditionne plusieurs items de la Vague 1.
- **Quelle est la source unique du R1 booke: lead_stage_history (helper r1BookedInPeriod) ou la cohorte funnelCohort ?**
  - Trois R1 divergents coexistent. lead_stage_history est ecrite par 7 chemins mais jamais lue (code mort). Il faut trancher pour rebrancher dashboard + performance + funnel sur une seule definition.
- **La conversion en client peut-elle autoriser un montant 'a definir' (value:0 + tag explicite), ou exige-t-on toujours un montant > 0 ?**
  - La mutation unique convertToClient doit imposer une regle. Cela impacte tous les points d'entree (UI inline, drag board, intake, MCP) et la verite du CA.
- **Faut-il lancer le backfill unique des ~100 R1 historiques iClosed (--days 365) ?**
  - Le cron iClosed n'importe rien (pertinents=0) car le compte n'a aucun RDV futur; seuls 8 ids sont synces cote Data OS alors que 100+ R1 reels existent. Le backfill creerait ~100 contacts + appels R1 passes: a valider avant execution.
- **Comment definir la recommandation: source explicite stricte, ou les sources vides comptent-elles ailleurs (Non renseigne) ?**
  - paiement.overview traite recommandation en catch-all et fabrique de la reco a partir des sources vides. Il faut decider si reco devient strictement explicite et ou tombent les non-renseignees.
- **Les loops outbound/closing (agent-bridge.service) doivent-ils tourner, ou sont-ils volontairement en pause ?**
  - agent-bridge.service est inactive/dead. Si les loops doivent tourner, les workflows n8n qui POSTent dessus echouent silencieusement et il faut le relancer + health-check.

## Scenario de test grandeur nature (lead vers fonds)

Scenario grandeur nature lead vers fonds, etape par etape avec verification data Convex. (1) Creer un lead inbound via le formulaire public (nom+email+tel). Attendu: 1 crm_contacts source=inbound statut=lead, 1 crm_leads stageId=nouveau-lead status=open, 1 ligne lead_stage_history. Verif: crm_leads.listByPipeline, lead_stage_history.countByStageInPeriod('nouveau-lead'). (2) Booker un R1 via scheduleCall(stage=R1, contactId). Attendu: os_sales_calls planned, crm_leads.stageId=r1, +1 lead_stage_history(r1), prospection_record boardColumn=rdv_booke status=handoff. Verif: closing.upcomingCalls montre le call, R1 distinct=1. (3) Clore le closing en GAGNE via closing.recordOutcome(won, dealValue=3000) [a implementer]. Attendu: os_sales_calls status=done outcome=gagne, declenche la conversion client. (4) Conversion client via la mutation unique convertToClient avec montant 3000 CHF. Attendu: contact.statut=client, pipeline_clients.value=3000 (PAS 0), crm_leads supprime, prospection status handoff. Verif: pipeline_clients.getByContact.value===3000; verifier qu'aucun chemin ne laisse value=0. (5) Devis: createDevis montant_ht=3000 puis generer le lien de paiement Stripe rattache. Verif: devis.listDevis + lien Stripe cree en CHF. (6) Paiement Stripe: declencher une charge CHF; le webhook /api/webhooks/stripe ingere via upsertFromStripe. Attendu: stripe_payments succeeded amount=3000 currency=chf contactId rempli (matching email OU customerId). Verif: stripePayments.recent contactMatched=true. (7) Encaisse/reconcilie: paiement.overview from/to. Attendu: encaisse+=3000 CHF, 'a collecter' du client -=3000, ROI/panier coherents. Verif: confirmer qu'aucune ligne non-CHF n'est additionnee et que 'a collecter' se solde bien. Controles transverses: aucun U+2014 a l'ecran ni en base, suppression de RDV demande confirmation, KPI dashboard ne tombent pas a zero sur erreur backend.

## Agents et crons

- **Slack agent-csm** : Actif (systemd running depuis 2026-06-23, NRestarts=0)
  - Action : Aucune action. Ignorer le log nohup obsolete agent-csm-slack.log (artefact mort).
- **Slack agent-debug** : Actif (running, sain)
  - Action : Aucune action. Se fier a systemctl is-active + agent.log, pas au log nohup fige.
- **Slack agent-kb** : Actif (running, sain)
  - Action : Aucune action.
- **Slack agent-operations** : Actif (running, sain)
  - Action : Aucune action.
- **Slack data-analyst** : Actif (running, sain)
  - Action : Aucune action.
- **Slack media-buyer** : Actif (running, sain)
  - Action : Aucune action.
- **Slack vividflow-slack-extension** : Actif (running, sain)
  - Action : Aucune action.
- **COO / Telegram (chief-of-staff, coo-brvndlab)** : CASSE - TELEGRAM_BOT_TOKEN rejete par Telegram (InvalidToken), gateway startup_failed/retrying
  - Action : Regenerer le token via BotFather et le remplacer dans les 3 .env (global + profil chief-of-staff + profil coo-brvndlab), puis relancer le gateway COO. En attendant, le COO n'est joignable que via agent-bridge /run.
- **agent-bridge.service (pivot des loops n8n)** : Inactive/dead (log vide)
  - Action : DECISION Thomas: si les loops outbound/closing doivent tourner, systemctl --user restart agent-bridge + curl 127.0.0.1:8765/health; sinon assumer la pause. Ne pas creer de nouveau cron.
- **Cron sync-agent-brains.py (*/30)** : Sain (7/7 cerveaux synchronises a chaque passe)
  - Action : Aucune action.
- **Cron iclosed_sync.py (*/30 --days 1 --future 90)** : Tourne sans crasher mais pertinents=0 a chaque passe (aucun RDV futur, le plus recent 2026-02-19)
  - Action : DECISION Thomas: lancer un backfill unique 'python3 iclosed_sync.py --days 365 --future 90 --limit 300' (cree ~100 contacts + R1 passes) et cadrer le cron en --days 7 tant qu'il n'y a pas de nouveaux bookings. Tronquer le vieux traceback DATAOS_TOKEN en tete de log. Aucun nouveau cron a creer.
