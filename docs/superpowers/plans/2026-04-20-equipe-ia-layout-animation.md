# Équipe IA — Layout & Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les cards coupées et remplacer les animations lourdes par un scale doux 150ms, pour que les 3 rangées tiennent à l'écran sans scroll.

**Architecture:** Un seul fichier modifié (`EquipeView.tsx`). Les changements sont purement visuels — hauteurs, paddings, transitions CSS. La logique métier (start/stop/heartbeat) reste intacte.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, React inline styles

---

## Fichiers

- Modify: `src/components/equipe/EquipeView.tsx` — 4 zones distinctes touchées : `SorenHeroCard`, `AgentCard`, `AgentCardInTraining`, layout rows dans `EquipeView`

---

### Task 1 — SorenHeroCard : hauteurs + animation

**Files:**
- Modify: `src/components/equipe/EquipeView.tsx:133-225`

- [ ] **Step 1 : Remplacer la div extérieure de SorenHeroCard**

Ligne ~134-139. Remplacer le className conditionnel par une transition simple + style inline pour l'animation :

```tsx
<div
  onClick={onClick}
  className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
  style={{
    background: '#F2F3F0',
    border: isSelected ? '2px solid #C8F135' : '1px solid #E2E4DF',
    boxShadow: isSelected
      ? '0 6px 20px rgba(0,0,0,0.10)'
      : '0 4px_16px rgba(0,0,0,0.07)',
    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
    transition: 'transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out',
  }}
>
```

- [ ] **Step 2 : Réduire l'inner div (minHeight)**

Ligne ~141. Changer `minHeight: 152` → `minHeight: 128` :

```tsx
<div className="flex items-stretch" style={{ minHeight: 128 }}>
```

- [ ] **Step 3 : Réduire la left zone (width + avatar)**

Ligne ~144. Changer `width: 185` → `width: 165` :

```tsx
<div className="relative flex-shrink-0 overflow-hidden rounded-l-2xl" style={{ width: 165, background: '#F2F3F0' }}>
```

Ligne ~152-154. Changer `height: '148px'` → `height: '120px'` :

```tsx
<img src="/soren-avatar.png" alt="Soren"
  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-auto object-contain"
  style={{ height: '120px', zIndex: 3, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.18))' }} />
```

- [ ] **Step 4 : Réduire le padding right zone + titre**

Ligne ~158. Changer `px-4 py-3` → `px-4 py-2.5` :

```tsx
<div className="flex flex-col justify-between flex-1 min-w-0 px-4 py-2.5">
```

Ligne ~175. Changer `text-[17px]` → `text-[16px]` :

```tsx
<h2 className="text-[16px] font-black text-[#0D0D0D] leading-tight tracking-tight mb-1">
```

- [ ] **Step 5 : Limiter les skills à 3 chips + badge +N**

Ligne ~184-191. Remplacer le map des tools par une version limitée :

```tsx
{/* Skills */}
<div className="flex flex-wrap gap-1 my-1.5">
  {agent.tools.slice(0, 3).map(tool => (
    <span key={tool} className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: '#E6E8E4', color: '#374151', border: '1px solid #D8DAD5' }}>
      {formatTool(tool)}
    </span>
  ))}
  {agent.tools.length > 3 && (
    <span className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: '#E6E8E4', color: '#9CA3AF', border: '1px solid #D8DAD5' }}>
      +{agent.tools.length - 3}
    </span>
  )}
</div>
```

- [ ] **Step 6 : Vérifier visuellement dans le navigateur**

Ouvrir `http://localhost:3000/equipe`. La card Soren doit être compacte (~128px), l'avatar non coupé, et cliquer dessus doit donner un scale(1.01) + bordure lime.

- [ ] **Step 7 : Commit**

```bash
git add src/components/equipe/EquipeView.tsx
git commit -m "fix: SorenHeroCard hauteurs réduites + animation scale"
```

---

### Task 2 — AgentCard : hauteurs + animation + contenu

**Files:**
- Modify: `src/components/equipe/EquipeView.tsx:242-329`

- [ ] **Step 1 : Remplacer l'animation de la div extérieure**

Ligne ~243-250. Remplacer le className conditionnel par style inline :

```tsx
<div
  onClick={onClick}
  className="relative rounded-2xl overflow-hidden cursor-pointer select-none flex-1 min-w-0"
  style={{
    background: agent.accentColor,
    transform: isSelected ? 'scale(1.015)' : 'scale(1)',
    boxShadow: isSelected
      ? '0 8px 24px rgba(0,0,0,0.18)'
      : '0 4px 12px rgba(0,0,0,0.12)',
    transition: 'transform 150ms ease-out, box-shadow 150ms ease-out',
    ['--accent' as string]: agent.accentColor,
  } as React.CSSProperties}
>
```

- [ ] **Step 2 : Description line-clamp-1**

Ligne ~282. Changer `line-clamp-2` → `line-clamp-1` :

```tsx
<p className="text-[10px] text-white/70 leading-relaxed line-clamp-1">{agent.description}</p>
```

- [ ] **Step 3 : Skills — 3 chips max + badge +N**

Ligne ~286-296. Remplacer le map :

```tsx
<div className="flex flex-wrap gap-1">
  {agent.tools.slice(0, 3).map(tool => (
    <span
      key={tool}
      className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
    >
      {formatTool(tool)}
    </span>
  ))}
  {agent.tools.length > 3 && (
    <span
      className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}
    >
      +{agent.tools.length - 3}
    </span>
  )}
</div>
```

- [ ] **Step 4 : Réduire le padding du bouton footer**

Lignes ~308, 313, 319. Changer `py-1.5` → `py-1` sur les 3 boutons (Arrêter, Init…, Démarrer) :

```tsx
{/* Arrêter */}
<button onClick={onStop}
  className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white"
  style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)' }}>
  <Square size={8} /> Arrêter
</button>

{/* Init… */}
<div className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white"
  style={{ background: 'rgba(255,255,255,0.15)' }}>
  <RefreshCw size={8} className="animate-spin" /> Init…
</div>

{/* Démarrer */}
<button onClick={onStart}
  className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold text-white hover:brightness-110 transition-all"
  style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.3)' }}>
  <Play size={8} /> Démarrer
</button>
```

- [ ] **Step 5 : Vérifier visuellement**

Cards Kai et Mia : contenu non coupé dans 168px, clic → scale(1.015) + ombre douce.

- [ ] **Step 6 : Commit**

```bash
git add src/components/equipe/EquipeView.tsx
git commit -m "fix: AgentCard animation scale + contenu compacté"
```

---

### Task 3 — AgentCardInTraining : contenu compact

**Files:**
- Modify: `src/components/equipe/EquipeView.tsx:332-390`

- [ ] **Step 1 : Description line-clamp-1**

Ligne ~360. Changer `line-clamp-2` → `line-clamp-1` :

```tsx
<p className="text-[10px] text-[#AAAEB3] leading-relaxed line-clamp-1">{agent.description}</p>
```

- [ ] **Step 2 : Skills — 3 chips max + badge +N**

Ligne ~364-371. Remplacer le map :

```tsx
<div className="flex flex-wrap gap-1">
  {agent.tools.slice(0, 3).map(tool => (
    <span key={tool}
      className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: '#D8DBDE', color: '#9CA3AF', border: '1px solid #C8CCD0' }}>
      {formatTool(tool)}
    </span>
  ))}
  {agent.tools.length > 3 && (
    <span
      className="text-[8.5px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: '#D8DBDE', color: '#AAAEB3', border: '1px solid #C8CCD0' }}>
      +{agent.tools.length - 3}
    </span>
  )}
</div>
```

- [ ] **Step 3 : Réduire padding bouton Indisponible**

Ligne ~381-384. Changer `py-1.5` → `py-1` :

```tsx
<button disabled
  className="flex items-center gap-1 px-3 py-1 rounded-xl text-[9.5px] font-bold cursor-not-allowed"
  style={{ background: '#CDD0D3', color: '#9CA3AF', border: '1px solid #C4C8CC' }}>
  <Play size={8} /> Indisponible
</button>
```

- [ ] **Step 4 : Commit**

```bash
git add src/components/equipe/EquipeView.tsx
git commit -m "fix: AgentCardInTraining contenu compact"
```

---

### Task 4 — Layout rows : hauteurs finales + gap

**Files:**
- Modify: `src/components/equipe/EquipeView.tsx:486-517`

- [ ] **Step 1 : Réduire le gap du conteneur**

Ligne ~488. Changer `gap-3` → `gap-2` :

```tsx
<div
  className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto pr-0.5"
  style={{ animation: 'fadeSlideUp 400ms ease-out 90ms both' }}
>
```

- [ ] **Step 2 : Row 2 — hauteur 168px**

Ligne ~504. Changer `height: 185` → `height: 168` :

```tsx
<div className="flex gap-3" style={{ height: 168 }}>
```

- [ ] **Step 3 : Row 3 — hauteur 155px**

Ligne ~513. Changer `height: 175` → `height: 155` :

```tsx
<div className="flex gap-3" style={{ height: 155 }}>
```

- [ ] **Step 4 : Vérifier que les 3 rangées tiennent à l'écran**

Ouvrir `http://localhost:3000/equipe`. Sans scroller, les 3 rangées doivent être toutes visibles : Soren en haut, Kai+Mia au milieu, Alex+Leo en bas.

- [ ] **Step 5 : Commit final**

```bash
git add src/components/equipe/EquipeView.tsx
git commit -m "fix: layout rows hauteurs finales, tout à l'écran sans scroll"
```
