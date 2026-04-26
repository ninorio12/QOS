# Soren — Mobile Layout + Dark/Light/System Theme

**Date:** 2026-04-26  
**Scope:** Theme system (dark/light/system toggle) + responsive mobile layout  
**Approach:** next-themes + CSS variables + Tailwind tokens  
**Desktop:** Unchanged — zero layout modifications on md+ screens

---

## 1. Theme System

### CSS Variables (globals.css)

Two token sets defined at root. `html.dark` overrides them — components never reference a theme directly.

```css
:root {
  --bg-app:     #EEF0EB;
  --bg-card:    #FFFFFF;
  --bg-sidebar: #111111;
  --bg-elevated:#F5F5F0;
  --accent:     #E2FF8D;
  --text:       #111111;
  --muted:      #6B7280;
  --subtle:     #9CA3AF;
  --border:     #E5E7EB;
}

html.dark {
  --bg-app:     #1C1C1E;
  --bg-card:    #2C2C2E;
  --bg-sidebar: #000000;
  --bg-elevated:#3A3A3C;
  --accent:     #E2FF8D;
  --text:       #FFFFFF;
  --muted:      #8E8E93;
  --subtle:     #636366;
  --border:     #38383A;
}
```

### Tailwind Tokens (tailwind.config.ts)

`soren.*` tokens updated to reference CSS variables instead of hardcoded hex:

```ts
colors: {
  soren: {
    app:      'var(--bg-app)',
    card:     'var(--bg-card)',
    sidebar:  'var(--bg-sidebar)',
    elevated: 'var(--bg-elevated)',
    accent:   'var(--accent)',
    text:     'var(--text)',
    muted:    'var(--muted)',
    subtle:   'var(--subtle)',
    border:   'var(--border)',
  }
}
```

Tailwind `darkMode` is NOT used — theming is handled entirely by CSS variables, so no `dark:` classes are needed in components.

### next-themes Integration

Install: `npm install next-themes`

Wrap `layout.tsx` body:
```tsx
import { ThemeProvider } from 'next-themes'

<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

### Color Migration

Global find-and-replace across all `src/` files — 6 substitutions:

| Find (hardcoded) | Replace (token) | Role |
|---|---|---|
| `bg-[#EEF0EB]` | `bg-soren-app` | App background |
| `bg-[#FFFFFF]` / `bg-white` | `bg-soren-card` | Card/surface backgrounds |
| `bg-[#111111]` | `bg-soren-sidebar` | Dark backgrounds |
| `text-[#111111]` | `text-soren-text` | Primary text |
| `border-[#E5E7EB]` / `border-gray-200` | `border-soren-border` | Borders |
| `text-[#6B7280]` | `text-soren-muted` | Secondary text |
| `text-[#9CA3AF]` | `text-soren-subtle` | Tertiary/placeholder text |

Some `#111111` usages are sidebar backgrounds (intentionally always dark) — those keep `bg-[#111111]` or use `bg-soren-sidebar`. Requires case-by-case check during migration.

### Theme Toggle Component

New `ThemeToggle` component added to `src/components/settings/ThemeToggle.tsx`:
- Three buttons: **Light / Sombre / Système**
- Uses `useTheme()` from next-themes
- Placed in `ParametresView` or `CompanySettingsView` under a "Apparence" section
- Persists automatically via next-themes (localStorage)

---

## 2. Mobile Layout

### Breakpoint Strategy

Single breakpoint: `md` (768px). Below `md` = mobile. Above `md` = desktop (unchanged).

### AppShell Changes (`src/components/AppShell.tsx`)

```tsx
<div className="min-h-screen bg-soren-app">
  {/* Sidebar — desktop only */}
  <div className="hidden md:block">
    <Sidebar />
  </div>

  {/* Header — desktop only */}
  <div className="hidden md:block">
    <Header />
  </div>

  {/* Mobile bottom nav — self-hides on desktop via flex md:hidden */}
  <MobileNav />

  {/* Main content */}
  <main className="md:ml-60 md:pt-14 pb-16 md:pb-0 h-screen overflow-hidden">
    <div key={pathname} className="page-enter h-full">
      {children}
    </div>
  </main>
</div>
```

### MobileNav Component (`src/components/MobileNav.tsx`)

New component. Visible only on mobile (`flex md:hidden`).

**5 tabs — mêmes icônes Lucide que `Sidebar.tsx` (cohérence totale) :**
| Tab | Lucide icon | Route |
|---|---|---|
| Home | `LayoutDashboard` | `/dashboard` |
| Pipeline | `GitMerge` | `/pipeline` |
| Contacts | `Users` | `/contacts` |
| Messages | `MessageSquare` | `/conversations` |
| Agents IA | `BotMessageSquare` | `/equipe` |

Import: `import { LayoutDashboard, GitMerge, Users, MessageSquare, BotMessageSquare } from 'lucide-react'`

**Styling:**
- `flex md:hidden fixed bottom-0 left-0 right-0 z-50`
- Background: inline style `rgba(255,255,255,0.88)` light / `rgba(28,28,30,0.88)` dark — Tailwind opacity modifiers (`/90`) don't work with CSS `var()` in Tailwind v3, so frosted glass uses direct CSS or a `.mob-nav` class in globals.css
- `backdrop-filter: blur(20px)` via globals.css class `.mob-nav-blur`
- `border-t border-soren-border`
- `pb-safe` (safe area inset for iPhone home bar — requires `env(safe-area-inset-bottom)`)
- Active tab: icon background `bg-soren-accent`, label `text-soren-text`
- Inactive tab: icon transparent, label `text-soren-subtle`

### Mobile Header (per-page)

On mobile, each page shows a simple in-page header (no fixed global header):
- Page title (large, left-aligned)
- Avatar button (right, opens profile sheet)
- No search bar on mobile (search accessible via dedicated flow later)

This header is rendered inside each page's top section, not in AppShell.

**Implementation:** A shared `MobilePageHeader` component (`src/components/shared/MobilePageHeader.tsx`) that takes a `title` prop. Each page wraps its content in this on mobile.

### Safe Area (iPhone)

Add to `globals.css`:
```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 16px);
}
```

Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` in `layout.tsx`.

---

## 3. Scope Boundaries

**In scope:**
- CSS variable system + dark/light/system toggle
- `AppShell.tsx` responsive restructure
- `MobileNav.tsx` new component
- `MobilePageHeader.tsx` new shared component
- Color token migration (find-and-replace + manual review)
- ThemeToggle in Paramètres
- `next-themes` install + ThemeProvider in layout

**Out of scope:**
- Desktop layout — zero changes
- Per-page mobile optimizations beyond basic responsiveness (Pipeline Kanban, Calendar, etc. get follow-up sprints)
- Mobile search
- Push notifications / mobile-specific features
- PWA / installable app

---

## 4. Files Changed

| File | Change |
|---|---|
| `src/app/globals.css` | Add dark vars, pb-safe utility |
| `tailwind.config.ts` | Tokens → CSS vars, no darkMode config |
| `src/app/layout.tsx` | ThemeProvider + viewport meta |
| `src/components/AppShell.tsx` | Responsive restructure |
| `src/components/MobileNav.tsx` | New file |
| `src/components/shared/MobilePageHeader.tsx` | New file |
| `src/components/settings/ThemeToggle.tsx` | New file |
| `src/components/settings/CompanySettingsView.tsx` | Add ThemeToggle in Apparence section |
| All `src/components/**` + `src/app/**` | Color token migration |

---

## 5. Implementation Order

1. `globals.css` — add dark vars + pb-safe
2. `tailwind.config.ts` — tokens → CSS vars
3. Install next-themes, add ThemeProvider to layout
4. Color migration (find-and-replace + manual review of `#111111` edge cases)
5. `MobileNav.tsx` + `AppShell.tsx` restructure
6. `MobilePageHeader.tsx`
7. `ThemeToggle.tsx` + wire into Paramètres
8. Test: toggle in settings, system preference detection, mobile layout on iPhone viewport
