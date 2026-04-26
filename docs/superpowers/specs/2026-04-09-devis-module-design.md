# Module Devis — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrichir le module devis existant avec une vue liste en grille (cards avec vignette PDF), un éditeur split-screen Apple-style, une signature électronique, des relances automatiques, et des statistiques de conversion.

**Architecture:** Le module s'appuie sur les routes API existantes (`/api/devis`, `/api/devis/[id]`, `/api/devis/[id]/pdf`, `/api/devis/[id]/send`). Les nouvelles features (signature, relance, stats) s'ajoutent comme de nouvelles colonnes Supabase + nouvelles routes API, sans casser l'existant.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS, Plus Jakarta Sans / Outfit, APITemplate (PDF), GHL (envoi), Recharts (stats)

---

## Design system

- Couleurs : `#EEF0EB` (bg), `#111111` (sidebar/text), `#FFFFFF` (cards), `#E2FF8D` (accent lime), `#3462EE` (bleu), `#9CA3AF` (muted)
- Fonts : Plus Jakarta Sans (UI), Outfit (chiffres), Montserrat (titres de page)
- Cards : `rounded-3xl`, `shadow-sm`, `hover:shadow-lg hover:scale-[1.01]`
- Badges : `rounded-full`, petits, colorés selon statut

---

## Vue 1 — Liste (grille horizontale scrollable)

**Layout :** Scroll horizontal (`overflow-x: auto`) avec cards en rangée fixe (`width: 220px`, `flex-shrink: 0`).

**Chaque card contient :**
- **Vignette PDF** (140px de hauteur) : si `pdf_url` existe → miniature HTML CSS simulant le document (header noir + lignes + footer) ; sinon → placeholder dashed avec icône PDF et "PDF non généré"
- **Infos** : numéro (`2026-001`), titre tronqué, nom du contact, montant HT, badge statut

**Badges statut :**
- `brouillon` → gris (#f3f4f6 / #6b7280)
- `envoyé` → bleu (#EEF3FF / #3462EE)
- `accepté` → vert (#f0fdf4 / #16a34a)
- `refusé` → rouge (#fef2f2 / #dc2626)

**Header :** Titre "Devis", sous-titre "N devis · N en attente", bouton "Nouveau devis" (noir, rounded-full).

---

## Vue 2 — Détail (split screen)

**Header fixe :**
- Bouton retour, numéro + contact, badge statut
- Tabs : `Split` | `Édition` | `Aperçu`
- Boutons : `Envoyer` (outline), `Générer PDF` (lime #E2FF8D)

**Panel gauche (45%) — Formulaire :**

Sections :
1. **Client** : nom, téléphone, email
2. **Devis** : titre, validité (date), ville, adresse chantier
3. **Lignes** : tableau scrollable horizontalement (description, qté, unité, PU HT, TVA%, total HT) + bouton "Ajouter une ligne" + bouton suppression par ligne
4. **Notes** : textarea libre
5. **Totaux** : Total HT, TVA par taux (10%, 20%), Total TTC
6. **Informations** (encadré) :
   - Contact lié → lien cliquable vers `/contacts/[id]`
   - Conversation GHL → lien externe
   - Source → badge violet si IA·N8N, badge gris si manuel
   - Timeline : Créé / PDF généré / Envoyé / Réponse reçue (avec dates et canal)
   - Acompte (% + montant calculé)
   - PDF → lien téléchargement

**Panel droit (flex: 1) — Aperçu + sections :**

1. **Toolbar** : label "Aperçu PDF", boutons "Ouvrir ↗" et "Télécharger ⬇"
2. **Rendu A4** (max-width 540px, white card, shadow) :
   - Header noir : logo/nom entreprise + infos contact entreprise | numéro devis + date + client
   - Bloc objet : titre + adresse chantier + validité
   - Tableau lignes (alternating rows)
   - Totaux alignés à droite
   - Notes
   - Grille bas : zone signature | conditions | totaux
   - Footer noir : SIRET / TVA intra / Capital
3. **Signature électronique** (card blanche) :
   - Badge statut : "En attente" / "Vu le JJ/MM" / "Signé le JJ/MM"
   - Barre de progression 4 étapes : Créé → Envoyé → Vu → Signé
   - Info destinataire + bouton "Renvoyer le lien"
   - Stockage : colonnes `signature_url`, `signature_statut`, `signature_vu_le`, `signature_signe_le` dans table `devis`
4. **Relance automatique** (card blanche) :
   - Toggle on/off global
   - Liste des relances : délai (J+3, J+7…), canal (WhatsApp/Email/SMS), date prévue, statut (programmée / envoyée / annulée / ignorée)
   - Bouton "+ Ajouter une relance"
   - Stockage : table `devis_relances` (`devis_id`, `delai_jours`, `canal`, `statut`, `message`, `envoye_le`)
   - Route API : `POST /api/devis/[id]/relances`, `PATCH /api/devis/[id]/relances/[rid]`
5. **Statistiques de conversion** (card blanche) :
   - 3 KPIs : taux d'acceptation (%), délai moyen de réponse (jours), évolution vs mois précédent
   - Mini bar chart : devis similaires en montant → acceptés / refusés / en cours
   - Calculé côté serveur depuis la table `devis` au chargement de la page
   - Critère "similaires" : fourchette ±50% du montant HT du devis courant

---

## Nouvelles colonnes Supabase

```sql
-- Table devis (nouvelles colonnes)
ALTER TABLE devis ADD COLUMN signature_url TEXT;
ALTER TABLE devis ADD COLUMN signature_statut TEXT DEFAULT 'non_envoye'
  CHECK (signature_statut IN ('non_envoye','envoye','vu','signe'));
ALTER TABLE devis ADD COLUMN signature_vu_le TIMESTAMPTZ;
ALTER TABLE devis ADD COLUMN signature_signe_le TIMESTAMPTZ;

-- Nouvelle table relances
CREATE TABLE devis_relances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
  delai_jours INTEGER NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email','sms')),
  statut TEXT NOT NULL DEFAULT 'programmee'
    CHECK (statut IN ('programmee','envoyee','annulee','ignoree')),
  message TEXT,
  envoye_le TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Nouvelles routes API

| Méthode | Route | Action |
|---------|-------|--------|
| GET | `/api/devis/[id]/relances` | Lister relances d'un devis |
| POST | `/api/devis/[id]/relances` | Créer une relance |
| PATCH | `/api/devis/[id]/relances/[rid]` | Modifier/annuler une relance |
| GET | `/api/devis/[id]/stats` | Stats de conversion (devis similaires) |
| POST | `/api/devis/[id]/signature` | Envoyer le lien de signature |
| GET | `/api/devis/signature/[token]` | Page publique de signature (hors auth) |
| POST | `/api/devis/signature/[token]` | Enregistrer la signature |

---

## Tabs (Split / Édition / Aperçu)

- **Split** : `form-panel` width 45%, `preview-panel` flex 1 (visible)
- **Édition** : `form-panel` width 100%, `preview-panel` display none
- **Aperçu** : `form-panel` display none, `preview-panel` flex 1

---

## Fichiers à modifier / créer

| Fichier | Action |
|---------|--------|
| `src/components/devis/DevisView.tsx` | Refonte complète — vues liste + détail split |
| `src/app/api/devis/[id]/relances/route.ts` | Nouveau — CRUD relances |
| `src/app/api/devis/[id]/relances/[rid]/route.ts` | Nouveau — PATCH relance |
| `src/app/api/devis/[id]/stats/route.ts` | Nouveau — stats conversion |
| `src/app/api/devis/[id]/signature/route.ts` | Nouveau — envoyer lien signature |
| `src/app/api/devis/signature/[token]/route.ts` | Nouveau — page/endpoint signature publique |
| `supabase/migrations/20260409_devis_signature.sql` | Colonnes signature |
| `supabase/migrations/20260409_devis_relances.sql` | Table relances |

---

## Ce qui ne change pas

- Routes existantes (`/api/devis`, `/api/devis/[id]`, `/api/devis/[id]/pdf`, `/api/devis/[id]/send`) — inchangées
- Template HTML PDF (`src/lib/apitemplate.ts`) — inchangé
- Logique de numérotation auto — inchangée
- Auth Supabase — inchangée
