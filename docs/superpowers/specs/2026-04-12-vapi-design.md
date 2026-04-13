# Vapi Integration — Design Spec
**Date:** 2026-04-12  
**Statut:** Validé

## Contexte

Ajouter Vapi (voice AI) au SaaS Soren avec deux points d'entrée :
1. **Settings** — section de configuration + numéro Vapi affiché pour test
2. **Fiche contact** — bouton "Appeler via Vapi" qui ouvre le composeur avec le numéro Vapi

L'artisan appelle lui-même le numéro Vapi depuis son téléphone pour tester l'agent vocal. Pas d'appel sortant depuis le SaaS pour l'instant.

## Périmètre

**Inclus :**
- Section Vapi dans les Paramètres (credentials + numéro affiché)
- Bouton "Appeler via Vapi" sur la fiche contact
- Migration Supabase (3 nouvelles colonnes dans `company_settings`)

**Hors périmètre :**
- Appels sortants automatisés depuis le SaaS (futur)
- Configuration de l'assistant Vapi depuis le SaaS (géré sur app.vapi.ai)
- Transcriptions ou logs d'appels dans le SaaS (futur)

## Architecture

### Base de données

Migration `company_settings` — 3 colonnes ajoutées :
```sql
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vapi_api_key      TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vapi_assistant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vapi_phone_number TEXT NOT NULL DEFAULT '';
```

### API — `/api/settings/company`

Route existante. Ajouter `vapi_api_key`, `vapi_assistant_id`, `vapi_phone_number` à la liste `allowed` dans le PATCH.

### Composants

**`src/components/settings/VapiSettingsSection.tsx`** (créer)
- Section autonome avec ses propres états de sauvegarde
- 3 champs :
  - `vapi_api_key` — input type `password` (masqué par défaut, toggle reveal)
  - `vapi_assistant_id` — input texte
  - `vapi_phone_number` — input texte (format E.164 ex: +33612345678)
- Numéro Vapi affiché en grand si renseigné : `[numéro]` + bouton **Copier** + bouton **Appeler** (lien `tel:`)
- Bouton **Sauvegarder** avec spinner + toast (pattern identique aux autres Settings)

**`src/components/settings/CompanySettingsView.tsx`** (modifier)
- Ajouter `vapi_api_key`, `vapi_assistant_id`, `vapi_phone_number` au type `CompanySettings`
- Importer et rendre `<VapiSettingsSection>` en bas de page

**`src/components/contacts/ContactDetailPage.tsx`** (modifier)
- Si `vapi_phone_number` configuré (récupéré depuis `/api/settings/company`) : afficher bouton "Appeler via Vapi" à côté du téléphone du contact
- Le bouton ouvre `tel:[vapi_phone_number]`
- Icône : `Phone` de lucide-react, style identique aux autres boutons d'action de la fiche

## UX — Section Settings

```
┌─────────────────────────────────────────────────────┐
│  VAPI — Agent vocal                                  │
│                                                      │
│  Clé API          [••••••••••••••••••] 👁            │
│  Assistant ID     [asst_xxxxxxxxxxxxx]               │
│  Numéro Vapi      [+33 1 23 45 67 89]               │
│                                                      │
│  📞 Numéro à appeler pour tester l'agent :           │
│  ┌─────────────────────────────┐                    │
│  │  +33 1 23 45 67 89          │  [Copier] [Appeler]│
│  └─────────────────────────────┘                    │
│                                                      │
│                              [Sauvegarder]           │
└─────────────────────────────────────────────────────┘
```

## UX — Fiche Contact

Bouton ajouté dans la zone d'actions en haut de la fiche, visible uniquement si `vapi_phone_number` est configuré :

```
[← Retour]  [Modifier]  [📞 Appeler via Vapi]
```

## Fichiers à créer/modifier

| Fichier | Action |
|---|---|
| `supabase/migrations/20260412_vapi_settings.sql` | Créer — 3 nouvelles colonnes |
| `src/components/settings/VapiSettingsSection.tsx` | Créer |
| `src/components/settings/CompanySettingsView.tsx` | Modifier — intégrer VapiSettingsSection |
| `src/app/api/settings/company/route.ts` | Modifier — ajouter les 3 champs à `allowed` |
| `src/components/contacts/ContactDetailPage.tsx` | Modifier — bouton Appeler via Vapi |

## Critères de succès

- Les credentials Vapi se sauvegardent et se rechargent correctement
- Le numéro Vapi s'affiche et le bouton "Appeler" ouvre le composeur téléphonique
- Le bouton "Copier" copie le numéro dans le presse-papier
- Le bouton "Appeler via Vapi" sur la fiche contact n'apparaît que si le numéro est configuré
- 0 régression sur les Settings et les fiches contact existantes
