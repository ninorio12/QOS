# Company Settings & Devis Template Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permettre à l'admin de configurer les paramètres de son entreprise (logo SVG, couleur brand, infos légales) dans la page Paramètres de Soren, et que ces paramètres soient automatiquement utilisés lors de la génération des devis PDF.

**Architecture:** Table Supabase `company_settings` (1 ligne admin), page Paramètres du compte dans la sidebar, `buildDevisHtml()` adapté pour accepter un logo SVG inline à la place du CSS house logo.

**Tech Stack:** Next.js 14 App Router, TypeScript, Supabase, Tailwind CSS, APITemplate.io

---

## Périmètre

### Ce qui change
1. Nouvelle table Supabase `company_settings`
2. Nouvelle page/section Paramètres du compte dans Soren
3. `buildDevisHtml()` mis à jour pour logo SVG
4. Routes PDF et Send qui lisent depuis Supabase au lieu des env vars

### Ce qui ne change pas
- Le template HTML du devis (maisons en filigrane, couleur brand, structure)
- Le module Devis (création, liste, lignes, envoi GHL)
- `generatePdfFromHtml()` (appel APITemplate.io)

---

## 1. Table Supabase `company_settings`

```sql
CREATE TABLE company_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL DEFAULT 'Soren',
  tagline      TEXT DEFAULT 'Construction · Rénovation · Aménagement',
  address      TEXT DEFAULT '',
  phone        TEXT DEFAULT '',
  email        TEXT DEFAULT '',
  siret        TEXT DEFAULT '',
  capital      TEXT DEFAULT '',
  tva_intra    TEXT DEFAULT '',
  assurance    TEXT DEFAULT '',
  brand_color  TEXT NOT NULL DEFAULT '#d28e46',
  logo_svg     TEXT DEFAULT '',   -- Contenu SVG brut (pas une URL)
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Ligne admin par défaut
INSERT INTO company_settings (name) VALUES ('Soren');
```

Une seule ligne pour l'instant. Quand les sous-comptes arriveront, on ajoutera `user_id UUID REFERENCES auth.users`.

---

## 2. Page Paramètres du compte

**Emplacement :** Section "Configuration" dans la sidebar (déjà existante), nouvel item "Paramètres du compte".

**Route :** `/parametres` ou tab dans la page configuration existante.

**Composant :** `src/components/settings/CompanySettingsView.tsx`

**Champs du formulaire :**
| Champ | Type | Description |
|-------|------|-------------|
| Nom de l'entreprise | text | Ex: "Soren" |
| Tagline | text | Ex: "Construction · Rénovation · Aménagement" |
| Adresse | textarea | Adresse complète (multi-ligne) |
| Téléphone | text | |
| Email | text | |
| SIRET | text | |
| Capital social | text | Ex: "50 000 euros" |
| TVA intracommunautaire | text | Ex: "FR 25 500 123 321" |
| Assurance décennale | text | Description complète |
| Couleur brand | color picker | Hex color — alimente tout le template |
| Logo SVG | textarea + aperçu | Coller/uploader le contenu SVG brut |

**Comportement :**
- Au chargement : `GET /api/settings/company` → récupère la ligne unique
- Aperçu logo en temps réel sous le champ SVG
- Bouton "Sauvegarder" → `PATCH /api/settings/company`
- Toast de confirmation

---

## 3. Routes API Settings

### `GET /api/settings/company`
```ts
// Retourne la ligne company_settings
{ company: CompanySettings }
```

### `PATCH /api/settings/company`
```ts
// Body: Partial<CompanySettings>
// Met à jour la ligne unique, updated_at = now()
{ company: CompanySettings }
```

---

## 4. `buildDevisHtml()` mis à jour

**Nouveau paramètre :** `logoSvg?: string | null`

**Logique dans le header :**
- Si `logoSvg` fourni → injecter le SVG inline à la place du bloc `.logo-house` CSS
- Si non → garder le logo maison CSS actuel (fallback)

```ts
const logoBlock = logoSvg
  ? `<div style="width:60px;height:60px;display:flex;align-items:center;justify-content:center;">
       ${logoSvg}
     </div>`
  : `<div class="logo-house"></div>`
```

Le reste du template (couleur brand, maisons filigrane, tableau, totaux) reste identique.

---

## 5. Routes PDF et Send mises à jour

Les deux routes `/api/devis/[id]/pdf` et `/api/devis/[id]/send` doivent :

1. Faire un `SELECT * FROM company_settings LIMIT 1` via Supabase
2. Construire un objet `CompanyInfo` depuis ce résultat (plus `getCompanyFromEnv()`)
3. Passer `logoSvg: company.logo_svg` à `buildDevisHtml()`

```ts
const { data: settings } = await supabase
  .from('company_settings')
  .select('*')
  .single()

const company: CompanyInfo = {
  name:        settings.name,
  tagline:     settings.tagline,
  address:     settings.address,
  phone:       settings.phone,
  email:       settings.email,
  siret:       settings.siret,
  capital:     settings.capital,
  tvaIntra:    settings.tva_intra,
  assurance:   settings.assurance,
  brandColor:  settings.brand_color,
  accentColor: '#ffffff',
  logoSvg:     settings.logo_svg,
}
```

---

## 6. Sidebar

Ajouter "Paramètres du compte" dans le tableau `CONFIGURATION` de `src/components/Sidebar.tsx` :

```ts
{ label: 'Paramètres du compte', href: '/parametres', icon: Settings2 }
```

---

## Flux complet

```
Admin ouvre Paramètres du compte
  → remplit les champs + colle son SVG logo
  → clique Sauvegarder
  → PATCH /api/settings/company → company_settings mis à jour

Thomas crée un devis → clique "Générer PDF"
  → POST /api/devis/[id]/pdf
    → SELECT company_settings → buildDevisHtml(logoSvg, brandColor, ...)
    → generatePdfFromHtml(html) → APITemplate.io → pdf_url
    → retourne pdf_url au frontend
```

---

## Hors périmètre (pour plus tard)

- Multi-tenant : colonne `user_id` sur `company_settings`
- Upload fichier logo (Supabase Storage) — pour l'instant paste SVG texte
- Preview du devis complet avant génération PDF
- Webhook N8N (spec séparée déjà écrite)
