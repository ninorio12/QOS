# Paramètres Redesign Élégant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Affiner visuellement CompanySettingsView.tsx — supprimer les shadows, ajouter une border subtile sur les cards, affiner labels et typographie — sans toucher à la logique métier.

**Architecture:** Un seul fichier modifié (`src/components/settings/CompanySettingsView.tsx`). Tous les changements sont des classes Tailwind CSS — aucun comportement, aucun state, aucune API touchée.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS

---

## Fichiers

- Modify: `src/components/settings/CompanySettingsView.tsx`

---

### Task 1 — Tokens globaux : labelCls + header subtitle

**Files:**
- Modify: `src/components/settings/CompanySettingsView.tsx:23,419`

- [ ] **Step 1 : Mettre à jour `labelCls`**

Ligne 23. Remplacer :

```ts
const labelCls = 'block text-[9px] font-medium text-[#9CA3AF] mb-0.5 uppercase tracking-wide'
```

Par :

```ts
const labelCls = 'block text-[8px] font-medium text-[#9CA3AF] mb-1 uppercase tracking-widest'
```

- [ ] **Step 2 : Mettre à jour le sous-titre du header**

Ligne ~419. Remplacer :

```tsx
<p className="text-[11px] text-[#9CA3AF] mt-0.5">Ces informations apparaissent sur vos devis PDF</p>
```

Par :

```tsx
<p className="text-[10px] text-[#9CA3AF] mt-0.5">Ces informations apparaissent sur vos devis PDF</p>
```

- [ ] **Step 3 : Vérifier dans le navigateur**

Ouvrir `http://localhost:3000/parametres`. Les labels de champ doivent être légèrement plus petits et mieux espacés.

- [ ] **Step 4 : Commit**

```bash
rtk git add src/components/settings/CompanySettingsView.tsx
rtk git commit -m "style: labelCls text-[8px] tracking-widest, header subtitle text-[10px]"
```

---

### Task 2 — Cards : border + padding + gap + titres de section

**Files:**
- Modify: `src/components/settings/CompanySettingsView.tsx:439-549`

- [ ] **Step 1 : Remplacer toutes les card shells (4 occurrences)**

Chercher et remplacer **toutes** les occurrences de :

```
className="bg-white rounded-2xl shadow-sm p-3 flex flex-col gap-2 overflow-hidden"
```

Par :

```
className="bg-white rounded-2xl border border-[#EAECE7] p-4 flex flex-col gap-3 overflow-hidden"
```

Il y a exactement 4 occurrences (Identité & Logo, Profil, Coordonnées, Informations légales).

- [ ] **Step 2 : Remplacer tous les titres de section (4 occurrences)**

Chercher et remplacer **toutes** les occurrences de :

```
className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider flex-shrink-0"
```

Par :

```
className="text-[8px] font-semibold text-[#9CA3AF] uppercase tracking-widest flex-shrink-0"
```

Il y a exactement 4 occurrences (une par card).

- [ ] **Step 3 : Vérifier visuellement**

Ouvrir `http://localhost:3000/parametres`. Checklist :
- Aucune ombre sur les cards — uniquement une border fine gris clair
- Les 4 cards ont un padding intérieur légèrement plus généreux
- Les titres de section ("Identité & Logo", "Profil utilisateur", etc.) sont légèrement plus petits et plus aérés
- Pas de scroll — tout tient à l'écran

- [ ] **Step 4 : Commit**

```bash
rtk git add src/components/settings/CompanySettingsView.tsx
rtk git commit -m "style: cards border #EAECE7 + p-4 gap-3, section titles text-[8px] tracking-widest"
```
