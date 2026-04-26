# Conversations Module Redesign — Design Spec

**Date:** 2026-04-08
**Approche:** Option B — Refonte progressive (front uniquement, backend GHL intact)

---

## Objectif

Redesigner le module Conversations pour ressembler à une interface de support moderne (3 colonnes : liste | thread | panneau droit), avec canal d'envoi sélectionnable (WhatsApp / SMS / Email via GHL) et toggle d'IA par conversation.

---

## Layout général

Trois colonnes fixes, hauteur `h-[calc(100vh-56px)]` :

| Colonne | Largeur | Contenu |
|---|---|---|
| Gauche | 280px | Recherche + liste conversations |
| Centre | flex-1 | Header + thread messages + barre d'envoi |
| Droite | 300px | Infos contact + Agent IA + Analyse Kai |

---

## Colonne gauche — Liste conversations

**Fichier :** `src/components/conversations/ConversationList.tsx`

Chaque item affiche :
- Avatar initiales (même `getAvatarColor` que le module Contacts)
- Nom du contact (bold)
- Dernier message tronqué à 1 ligne
- Heure relative (ex: "14:32", "Hier")
- Icône canal colorée (WhatsApp vert, SMS gris, Email bleu, Phone gris)
- Badge non-lu (rouge, chiffre)
- Petit avatar agent IA actif si `ai_enabled = true` (icône bot colorée selon l'agent)

Recherche en haut : filtre local sur nom + dernier message.

---

## Colonne centrale — Thread + barre d'envoi

### Header
- Nom contact (h2 bold)
- Badge canal actif
- Bouton "Voir contact" → `/contacts/[contact_id]`

### Thread messages

**Fichier :** `src/components/conversations/MessageThread.tsx`

Bulles de messages :
- Messages entrants (contact) : bulle blanche à gauche, ombre légère
- Messages sortants (nous) : bulle noire à droite
- Sous chaque message : `heure • Via WhatsApp` (ou SMS / Email selon `metadata.channel`)
- Messages système (ex: "AI désactivée sur cette conversation") : ligne centrée en gris italique

Chargement : `getMessages(conversationId)` depuis Supabase + realtime subscription pour nouveaux messages entrants via webhook GHL → Supabase.

### Barre d'envoi fixe en bas

**Fichier :** `src/components/conversations/ComposerBar.tsx` (nouveau fichier)

Layout horizontal :
```
[ WhatsApp ▾ ] [ zone de texte multi-ligne ] [ ▶ Envoyer ]
                                    [ Toggle AI ─────── ]
```

- **Sélecteur canal** : dropdown WhatsApp / SMS / Email, pré-sélectionné selon `conversation.channel`
- **Zone texte** : `textarea` auto-resize, placeholder "Écrire un message…"
- **Bouton envoyer** : appelle `POST /api/send-message` avec `{ conversationId, message, type, subject }`
- **Toggle AI** : label "Réponse auto IA", état persisté via `PATCH /api/conversation/[id]` avec `{ ai_enabled }` → GHL + Supabase

---

## Colonne droite — Panneau contextuel

**Fichier :** `src/components/conversations/ConversationPanel.tsx` (nouveau fichier)

### Bloc Contact
- Avatar initiales (`getAvatarColor`, `w-12 h-12 rounded-2xl`)
- Nom complet (bold)
- Téléphone (lien `tel:`)
- Email (lien `mailto:`)
- Pipeline stage badge (si `pipeline_stage_id` présent)
- Bouton "Ouvrir fiche" → `/contacts/[contact_id]`

### Bloc Agent IA
- Titre "Agent assigné"
- Sélecteur : Kai / Mia / Soren (dropdown avec couleurs agents)
- Toggle "Réponse automatique" : on/off
  - `on` → PATCH `ai_enabled: true` sur la conversation GHL + Supabase
  - `off` → PATCH `ai_enabled: false`

### Bloc Analyse Kai
- Bouton "Analyser la conversation" → `POST /api/kai-analysis` avec `conversationId`
- Affiche le résumé en dessous dans une zone scrollable
- Collapsible (ouvert par défaut après analyse)

---

## Backend — Ce qui ne change pas

| Route | Rôle |
|---|---|
| `POST /api/send-message` | Envoi GHL (WhatsApp/SMS/Email) + save Supabase |
| `PATCH /api/conversation/[id]` | Mise à jour `ai_enabled` sur GHL |
| `POST /api/kai-analysis` | Analyse Kai de la conversation |
| `GET /app/conversations/page.tsx` | Fetch GHL conversations + opps + pipelines |

Le mapping GHL → Conversation reste identique. Seul le front change.

---

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/components/conversations/ConversationsView.tsx` | Modifier — nouveau layout 3 colonnes |
| `src/components/conversations/ConversationList.tsx` | Modifier — nouveau design item (canal + agent) |
| `src/components/conversations/MessageThread.tsx` | Modifier — "Via canal" sous messages, supprimer tabs Kai/Vocal |
| `src/components/conversations/ComposerBar.tsx` | Créer — barre d'envoi avec sélecteur canal + toggle AI |
| `src/components/conversations/ConversationPanel.tsx` | Créer — panneau droit contact + agent + Kai |
| `src/components/conversations/KaiAnalysis.tsx` | Déplacer dans ConversationPanel |
| `src/components/conversations/VapiCall.tsx` | Garder, déplacer dans ConversationPanel |

---

## Ce qui est retiré

- Tabs "Messages / Kai / Vocal" dans le thread central (Kai et Vocal passent dans le panneau droit)
- `InboxNav` gauche avec filtres pipeline (remplacé par simple recherche texte)
- Champ "From" (un seul compte GHL par canal)
- Badge "Réponse par Kai" sur les bulles (toutes les réponses sortantes = nom entreprise)

---

## Contraintes

- Utiliser `getAvatarColor` depuis `@/components/contacts/types` pour la cohérence visuelle
- Couleurs agents : Kai `#3462EE`, Mia `#8B5CF6`, Soren `#14B8A6`
- Palette thème : fond `#EEF0EB`, cartes `#ffffff`, texte `#111111`, gris `#6B7280`
- Tous les fetch client-side passent par `fetchJSON` de `@/lib/fetchJSON`
