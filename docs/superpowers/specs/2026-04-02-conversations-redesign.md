# Conversations Module — Redesign Spec
**Date:** 2026-04-02  
**Route:** `/conversations`  
**Stack:** Next.js 14 App Router, Tailwind, Supabase Realtime, Claude API (streaming), Vapi

---

## Objectif

Refondre le module conversations en layout 3 panneaux (inspiré Chatmo), ajouter un onglet **Kai IA** pour la conversion par lead, et un onglet **Vocal** pour tester des appels Vapi — le tout dans le thème Soren minimaliste, sans icônes.

---

## Thème couleurs — Règle stricte

| Contexte | Couleur |
|---|---|
| Fond panneau gauche | `#111111` |
| Fond panneau milieu | `#F8F8F6` (légèrement off-white) |
| Fond panneau droit | `#EEF0EB` |
| Texte sur fond sombre | `#FFFFFF` / `#9CA3AF` |
| Texte sur fond clair | `#111111` / `#6B7280` |
| Accent actif sur fond sombre | `#E2FF8D` (lime) |
| Accent actif sur fond clair | `#3462EE` (bleu) |
| Badge unread | `#3462EE` fond, `#FFFFFF` texte |
| Badge lead | `#3462EE/10` fond, `#3462EE` texte |

**Règle :** `#E2FF8D` JAMAIS sur fond clair. `#111111` texte JAMAIS sur fond sombre.

---

## Architecture — 3 panneaux

```
┌──────────────┬───────────────────┬──────────────────────────────┐
│  Nav Inbox   │  Liste convs      │  Thread + Onglets            │
│   200px      │     340px         │       flex-1                 │
│   #111111    │   #F8F8F6         │      #EEF0EB                 │
└──────────────┴───────────────────┴──────────────────────────────┘
```

---

## Panneau 1 — Nav Inbox (200px, `#111111`)

**Structure :**
- Titre `Conversations` (texte blanc, `text-sm font-semibold`, pt-5 pl-4)
- Section principale :
  - `Toutes` (avec badge count si unread > 0, fond `#E2FF8D` texte `#111` si actif)
  - `Non assignées`
  - `Fermées`
- Séparateur + label `LIFECYCLE` (`text-[10px] text-[#3D4F6B] uppercase tracking-widest`)
- Items lifecycle (mock, filtre client-side par tag à terme) :
  - `Hot Lead` · `VIP Lead` · `Nouveau Lead` · `Paiements` · `Client` · `Cold Lead`
- Style item : `text-sm text-[#9CA3AF] hover:text-white px-4 py-2 rounded-lg mx-2 transition-colors`
- Actif : `bg-[#E2FF8D] text-[#111111] font-medium`

**État :** `activeFilter: string` géré dans `ConversationsView`

---

## Panneau 2 — Liste conversations (340px, `#F8F8F6`)

**Header :**
- Titre = nom du filtre actif (`text-sm font-semibold text-[#111111]`)
- Input recherche : fond blanc, bordure `#E5E7EB`, placeholder `"Rechercher..."`, texte `#111111`, pas d'icône
- Bouton `+ Nouveau` : fond `#111111`, texte blanc, `text-xs`

**Conversation row :**
- Avatar : cercle 38px, gradient `from-[#3462EE] to-[#4A91A8]`, initiales blanches `text-xs font-bold`
- Nom contact : `text-sm font-semibold text-[#111111]`
- Badge lead : `text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#3462EE]/10 text-[#3462EE]`
- Aperçu dernier message : `text-xs text-[#6B7280] truncate`
- Timestamp : `text-[10px] text-[#9CA3AF]`
- Badge unread : cercle `#3462EE`, texte blanc `text-[9px]`
- Sélectionné : fond blanc, bordure gauche 2px `#3462EE`
- Hover : fond `#EFEFED`

---

## Panneau 3 — Thread + Onglets (flex-1, `#EEF0EB`)

### Header
- Avatar + nom contact (`text-sm font-semibold text-[#111111]`)
- Badge canal (texte pur, couleur channel)
- Badge statut lead (`Hot Lead` etc.) en `bg-[#3462EE]/10 text-[#3462EE]`

### Barre d'onglets
Trois onglets texte pur, sans icône :
- `Messages` · `Kai IA` · `Vocal`
- Actif : `text-[#111111] font-semibold border-b-2 border-[#3462EE]`
- Inactif : `text-[#9CA3AF] hover:text-[#6B7280]`

---

### Onglet Messages (existant, amélioré)

Conserve la logique existante (Supabase realtime, streaming Claude).

**Bubbles :**
- Contact (rôle `user`) : bulle blanche, texte `#111111`, alignée à gauche, nom contact au-dessus
- Notre réponse / Kai (rôle `assistant`) : bulle `#111111`, texte blanc, alignée à droite, label `Kai` au-dessus
- Séparateur de date : `text-[10px] text-[#9CA3AF]` centré, ligne `#E5E7EB`

**Input :**
- Fond blanc, bordure `#E5E7EB`, texte `#111111`
- Bouton `Envoyer` : fond `#111111`, texte blanc
- Status bar : `Agent Kai actif · Claude Opus 4.6` (texte `text-[10px] text-[#6B7280]`, point vert `#22c55e`)

---

### Onglet Kai IA

Vue dédiée à l'analyse IA du lead courant. Appel à `/api/chat` avec prompt spécifique.

**Sections (layout vertical scrollable) :**

1. **Analyse lead** (card blanche, `rounded-xl p-4`) :
   - Score conversion : barre de progression `#3462EE`, pourcentage textuel
   - Résumé du lead en 2-3 lignes (généré par Claude depuis l'historique messages)
   - Bouton `Analyser` → streaming vers `/api/kai-analysis`

2. **Message suggéré** (card blanche) :
   - Claude génère un message de suivi adapté au contexte du lead
   - Bouton `Copier` + bouton `Envoyer directement` (envoie dans le thread WhatsApp/email)
   - Bouton `Regénérer`

3. **Prochaine action** (card blanche) :
   - Suggestion textuelle : ex. "Relancer dans 2 jours avec une offre chiffrée"
   - Bouton `Créer une tâche` (futur)

**API route à créer :** `POST /api/kai-analysis` — reçoit `{ conversationId, messages }`, stream la réponse Claude avec prompt orienté conversion BTP.

---

### Onglet Vocal — Vapi

Interface de test d'appel sortant vers le contact.

**Layout :**
- Card centrale blanche `rounded-xl p-6`
- Numéro contact affiché (`contact_phone` ou champ éditable si absent)
- Textarea `Instructions pour Kai` (override du system prompt Vapi)
- Bouton `Appeler` → `POST /api/vapi-call`
- État en temps réel : `En cours...` → polling `GET /api/vapi-call/[id]`
- Résultat : durée, statut (`assistant-ended-call`, `customer-did-not-answer`, etc.)
- Transcription de l'appel (si disponible depuis Vapi)

**Variables d'env requises :**
- `VAPI_API_KEY`
- `VAPI_ASSISTANT_ID`
- `VAPI_PHONE_NUMBER_ID`

**API routes à créer :**
- `POST /api/vapi-call` — lance l'appel Vapi
- `GET /api/vapi-call/[id]` — polling statut + transcription

---

## Fichiers à modifier / créer

### Modifier
- `src/components/conversations/ConversationsView.tsx` — refonte 3 panneaux
- `src/components/conversations/MessageThread.tsx` — amélioration bubbles + onglets
- `src/components/conversations/types.ts` — ajouter `lead_stage` au type `Conversation`

### Créer
- `src/components/conversations/InboxNav.tsx` — panneau gauche
- `src/components/conversations/ConversationList.tsx` — panneau milieu (extrait de ConversationsView)
- `src/components/conversations/KaiAnalysis.tsx` — onglet Kai IA
- `src/components/conversations/VapiCall.tsx` — onglet Vocal
- `src/app/api/kai-analysis/route.ts` — streaming Claude analyse lead
- `src/app/api/vapi-call/route.ts` — POST appel Vapi
- `src/app/api/vapi-call/[id]/route.ts` — GET statut appel

---

## Contraintes

- Pas d'icônes (sauf si absolument nécessaire et approuvé)
- Langue UI = français
- `#E2FF8D` uniquement sur fond sombre
- Pas de breaking change sur la route `/conversations`
- Supabase realtime conservé sur l'onglet Messages
- Les onglets Kai IA et Vocal sont lazily initialisés (pas de fetch au chargement, seulement quand l'onglet est ouvert)
