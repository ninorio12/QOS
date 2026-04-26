# Mobile Layout + Dark/Light/System Theme — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add dark/light/system theme toggle and mobile-first bottom nav layout to Soren, leaving desktop completely unchanged.

**Architecture:** next-themes manages theme state (class on `<html>`). CSS variables in globals.css hold all color tokens — light defaults, `html.dark` overrides. Tailwind soren.* tokens reference vars. Mobile layout uses a single `md` breakpoint: sidebar/header hidden on mobile, MobileNav shown instead.

**Tech Stack:** Next.js 14, Tailwind CSS v3, next-themes, Lucide React

---

### Task 1: Foundation — globals.css + tailwind.config.ts

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] Add dark CSS vars and utilities to `globals.css`
- [ ] Update tailwind.config.ts soren.* tokens to reference CSS vars
- [ ] Commit

---

### Task 2: Install next-themes + ThemeProvider

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] `npm install next-themes`
- [ ] Wrap body in ThemeProvider in layout.tsx
- [ ] Add viewport-fit=cover meta
- [ ] Commit

---

### Task 3: Color token migration

**Files:** All `src/components/**/*.tsx`, all dashboard page `src/app/**/*.tsx`

- [ ] Run sed find-and-replace for all 7 color tokens
- [ ] Manual review of `#111111` edge cases (sidebar stays dark)
- [ ] Commit

---

### Task 4: MobileNav component

**Files:**
- Create: `src/components/MobileNav.tsx`
- Modify: `src/components/AppShell.tsx`

- [ ] Create MobileNav with 5 tabs using same Lucide icons as Sidebar
- [ ] Update AppShell to hide Sidebar/Header on mobile, show MobileNav
- [ ] Commit

---

### Task 5: MobilePageHeader component

**Files:**
- Create: `src/components/shared/MobilePageHeader.tsx`

- [ ] Create MobilePageHeader shared component
- [ ] Commit

---

### Task 6: ThemeToggle in Paramètres

**Files:**
- Create: `src/components/settings/ThemeToggle.tsx`
- Modify: `src/components/settings/CompanySettingsView.tsx`

- [ ] Create ThemeToggle component with Light/Sombre/Système buttons
- [ ] Add Apparence section to CompanySettingsView
- [ ] Commit

---

### Task 7: Deploy

- [ ] `vercel --prod`
