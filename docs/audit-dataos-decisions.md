# Carnet de décisions : audit sémantique Data OS (2026-06-23)

Issu de l'audit 22 modules (70 agents) : 422 « à revoir », 132 « confus », 79 « faux ».
Décisions tranchées avec Thomas en questionnaire. Ce document est le backlog d'implémentation.

## BLOQUANTS (9) : à faire en premier

1. ✅ **FAIT (2026-06-23, déployé prod)** : **Sécurité : requireAdmin partout.** `requireAdmin` côté Convex sur users (setRole/setStatus/setAllowedModules/adminRemove/create/remove/adminUpsertPending) + integrations (connect/disconnect). Routes serveur (invite-user, remove-user, integrations) forwardent le token Clerk via `authedConvexClient()` + garde `isApiCallerAdmin` ajoutée sur la route Intégrations. Prouvé : `setRole` sans identité Clerk → « Authentification requise ». Faille d'auto-promotion fermée.
2. ✅ **FAIT (2026-06-23, déployé prod)** : **Secrets en clair.** `integrations.connect` ne persiste PLUS le secret en clair (seul un libellé masqué). Les vraies clés vivent en variables d'env (Stripe). Wording de la modale corrigé (honnête). Reste optionnel : purge des secrets historiques (effacés au prochain connect/disconnect).
3. **Devise : mono-devise CHF.** Normaliser CHF only côté Stripe, retirer le sélecteur EUR/USD/GBP d'Onboarding, corriger le bug `SYMBOLS.EUR='CHF'`. (reconcileMoney additionnait des devises différentes.)
4. **R1 booké : source unique = `lead_stage_history`** (entrée colonne r1, « déf. Thomas »). Helper partagé unique (façon reconcileMoney), rebranché sur summary, funnel et scorecards. Stop aux 3-4 calculs divergents.
5. **Passage en client : mutation unique** de conversion qui exige un montant (ou un « à définir » explicite), quel que soit le module. Stop aux clients à 0 CHF créés par la bascule inline Contacts / l'intake public.
6. **Confirmations destructives : règle transverse partout** (fiche/liste/board). Commencer par Calendrier (suppression RDV = notif externe) et suppression masse Contacts (cascade lead+client+prospection+onboarding).
7. **Filtre Période : taux bornés, totaux étiquetés.** Borner les taux du funnel à la même fenêtre que leurs numérateurs (sinon mathématiquement faux, peut dépasser 100%). Garder les totaux patrimoine « à vie » avec libellé explicite. Supprimer les props `from`/`to` mortes passées à ConversionRates.
8. **Source lead : vide honnête.** Supprimer le défaut fabriqué `source='inbound'` (et `statut='lead'`). Afficher/exporter/filtrer « non renseigné ». Normaliser `referral`→`recommandation` via normalizeLeadSource.
9. **Closing : ajouter les issues d'appel** (gagné→conversion client avec montant / perdu→raison / no-show / reprogrammer) avec propagation vers Pipeline + Prospection. Le module ne permettait pas de clore un closing.

## IMPORTANTS (13)

1. **« Performance » unifié** : `/cockpit` = « Performance Équipe », `/performance` = « Suivi Setting », onglet Meta Ads renommé (ex « Résultats Ads »). Aligner le nom de fichier (ProspectionCockpit → PerformanceEquipeView), le sortir du dossier prospection.
2. **Domaine pub = « Meta Ads » partout** (sidebar, permissions, cartes Performance, backend `publicite`, composant MediaBuyerView).
3. **Profil (Paramètres) : câbler la vraie persistance** vers Convex (`users.updateProfile`) + Clerk. Aligner l'enum de rôles (UI {admin, setter} vs backend viewer/member).
4. **Liste modules : source unique** consommée par l'UI des droits ET ModuleGuard. Supprimer `/workflows` mort, inclure `/closing`, `/cockpit`, `/media-buyer`.
5. **Désync UI : wrapper de mutation optimiste partagé** (rollback + toast d'erreur), façon Pipeline Leads. Corriger le fetcher Dashboard qui masque un 500 en zéros.
6. **Décomposition sources : afficher les 3** (inbound/outbound/recommandation) partout où on décompose. La somme doit reconstituer le total.
7. **Em-dash : sweep complet** (code + seeds + données persistées comme « Synthèse — {skill} ») + **lint CI bloquant U+2014** pour empêcher la régression.
8. **Lead/contact : « Nouveau lead » partout.** NewLeadWidget crée un lead → libellé + canal `onAddLead`, bannir « opportunité » (héritage GHL). Corriger compteur Pipeline et Records.
9. **Étapes client : source partagée francisée** (Contrat envoyé / Formulaire reçu / Lancement planifié / Configuration / Accompagnement) + règle de synchro board Pipeline Clients ↔ Onboarding. Stop au « Onboarding complété » menteur.
10. **Retirer le placeholder « Écran de fumée : J'ai poney demain »** des modales perte/closing en prod.
11. **Objection vs perte : listes distinctes.** Raison de perte ≠ objection surmontée (gagné) ≠ objection R1. Distinguer aussi la colonne Contacts.
12. **markLost : dériver `leadStatus` de `lostReason`** (mapping), au lieu de la constante `'non_qualifie'` pour toute perte.
13. **Agents IA : nettoyer.** Supprimer le code mort (agents.ts, AgentDrawer), créer une résolution d'identité agent unique (slug ↔ nom d'affichage) partagée par filtres + deep-links (7 filtres/8 cassés). Retirer les chiffres mock du module Équipe IA (coûts, heartbeats, synchro figée au 6 juin).

## MINEURS (11) : recos appliquées en bloc (franciser / harmoniser / vide honnête)

1. **CA = Encaissé** : un seul libellé affiché. Trancher « Cash contracté »/« Total ventes » (saisissables mais affichés nulle part) : retirer si non suivis.
2. **ROI à 1 décimale** (×4,8 et non « ×5 ») ; Budget : arrondir le total final, pas chaque ligne.
3. **« Skills »** : garder le terme produit + définition courte/tooltip (cible interne/technique).
4. **« Setting / Suivi Setting »** : garder (rôle setter réel) + sous-titre explicatif pour lever la confusion avec Paramètres.
5. **Groupe Bibliothèque** : franciser Data/Records/Process ; à l'intérieur de Records, un seul mot (réunion OU enregistrement).
6. **« Booké »** : forme unique (ex « R1 réservés », « RDV planifié »), retirer le nom d'outil des libellés (« sur iClosed »).
7. **« Sync »** : « Synchroniser »/« Synchronisation » partout. Équipe IA : pas de « Dernière synchro » sur date statique.
8. **« GHL »** : libellé explicite côté UI ; supprimer en priorité le code mort Supabase (`actions.ts`) qui pourrait écrire dans une base parallèle.
9. **États vides** : convention unique (« Non renseigné » champ / « Aucun X » liste) ; distinguer « non renseigné » (donnée absente) de « non branché » (feature non câblée). Inclus dans le sweep em-dash.
10. **Registre** : tutoiement unique (déjà dominant) + verbe de connexion unique « Connecter » sur toutes les modales.
11. **Compteurs honnêtes** : chaque compteur dénombre ce qu'il annonce. Définir « lead actif » de façon unique (exclure perdu / booké / à suivre) et l'appliquer partout.

## Ordre d'implémentation recommandé
1. **Sécurité d'abord** (bloquants 1, 2) : faille d'élévation de privilège + secrets. Avant tout le reste.
2. **Intégrité des chiffres** (bloquants 3, 4, 7, 8) : devise, R1 booké, période, sources. C'est ce qui rend le pilotage faux.
3. **Continuité du parcours** (bloquants 5, 6, 9) : passage client, confirmations, closing.
4. **Cohérence de nommage/structure** (importants 1, 2, 4, 8) : un objet = un nom.
5. **Robustesse** (importants 5, 13) + reste des importants.
6. **Sweep wording** (important 7 + mineurs) en une passe, avec le lint anti em-dash.
