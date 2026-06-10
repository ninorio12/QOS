---
name: claude-ui-ux-pro-max
description: Use when building, redesigning, or reviewing any UI/UX component, page, or interaction in Brvndlab or any project. Triggers on frontend work, design reviews, layout decisions, component creation, responsive design, accessibility audits, micro-interactions, and visual polish. Also use when the user says "make it premium", "polish this", "design system", or "UI review".
---

# UI/UX Pro Max

Elite-tier UI/UX design methodology. Every pixel intentional, every interaction memorable, every layout premium.

## Philosophy

**"Less is more sur ecrans premium"** -- Max 1 phrase entre titre et bouton. La valeur vient du silence.

You are not a developer adding UI. You are a design director who happens to write code. Every decision must pass the **"Would Jony Ive ship this?"** test.

## Design Hierarchy (Non-Negotiable)

### 1. Visual Hierarchy
- ONE focal point per viewport. Everything else supports it.
- Use scale contrast: if everything is the same size, nothing matters.
- White space is not empty -- it's breathing room. Use it aggressively.
- Z-pattern for landing pages, F-pattern for dashboards.

### 2. Typography System
- **Display**: Bold, large, commanding. Used sparingly (1-2 per page max).
- **Heading**: Semi-bold, clear hierarchy (h1 > h2 > h3 with visible scale jumps).
- **Body**: Regular weight, optimal line-height (1.5-1.6), max 65-75 characters per line.
- **Caption/Label**: Lighter weight, smaller, uppercase tracking for section labels.
- **Rule**: Never use more than 2 font families. One display, one body.
- **Anti-pattern**: All text the same size/weight = visual noise.

### 3. Color Architecture
- **60-30-10 Rule**: 60% neutral (background/surface), 30% secondary (cards/sections), 10% accent (CTAs/highlights).
- **Semantic consistency**: One color = one meaning across the entire app.
- **Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for large text/icons).
- **Dark cards**: Use sparingly as accent blocks, not as default.
- **Gradients**: Subtle, directional, max 2 stops. Never rainbow.

### 4. Spacing System (8px Grid)
- Base unit: 4px (micro), 8px (standard), 16px, 24px, 32px, 48px, 64px, 96px.
- **Card internal padding**: 24px minimum.
- **Section gaps**: 24-48px depending on hierarchy.
- **Page margins**: 32px mobile, 48-64px desktop.
- **Rule**: If two elements feel cramped, double the gap. When in doubt, more space.

### 5. Component Excellence

#### Cards
- Clear visual boundary (border, shadow, or background shift).
- Consistent border-radius within a family (don't mix 8px and 28px on sibling cards).
- Hover state: subtle lift (translateY -2px to -4px) + shadow increase.
- Content hierarchy inside: icon/image > title > description > action.

#### Buttons
- Primary: filled, high contrast, shadow for depth. ONE per section max.
- Secondary: outlined or ghost. Supporting action.
- Tertiary: text-only with underline or icon.
- **Sizing**: min-height 40px touch target, min-width 120px for primary.
- **States**: default, hover (scale 1.02), active (scale 0.98), disabled (opacity 0.5), loading (spinner).
- **Rule**: If you have 3+ buttons in a row, your hierarchy is broken.

#### Forms & Inputs
- Label ABOVE input (not inside as placeholder-only).
- Clear focus ring (2px solid accent color).
- Error states: red border + message below, never just color change.
- Success states: green check icon, subtle.
- Input height: 44px minimum (touch-friendly).

#### Navigation
- Current page indicator: bold + accent color + indicator dot/bar.
- Max 7 items visible. Group the rest.
- Mobile: bottom nav or hamburger with full-screen overlay.
- Breadcrumbs for depth > 2 levels.

#### Tables & Lists
- Zebra striping OR generous row spacing, not both.
- Sticky header on scroll.
- Row hover highlight.
- Actions: icon buttons aligned right, max 3 visible + overflow menu.

#### Modals & Drawers
- Backdrop blur + dimming (not just dark overlay).
- Max width 560px for modals, 480px for drawers.
- Close button top-right, always.
- Focus trap inside.
- ESC to close.

### 6. Motion & Micro-Interactions

#### Page Transitions
- Fade + slight Y translate (8-16px) on enter.
- Stagger children by 50-80ms for list items.
- Duration: 200-400ms. Never over 500ms.
- Easing: ease-out for enters, ease-in for exits.

#### Hover Effects
- Cards: translateY(-2px) + shadow boost.
- Buttons: scale(1.02) or background shift.
- Links: underline animation (left to right).
- Icons: subtle rotation or color shift.

#### Loading States
- Skeleton screens > spinners > progress bars.
- Skeleton: pulse animation on gray rectangles matching content shape.
- Never show empty white space while loading.
- Stream status messages for long operations ("on analyse...", "on prepare...", "presque pret").

#### Feedback
- Success: green toast, top-right, auto-dismiss 3s.
- Error: red toast, persistent until dismissed.
- Confirmation: modal with clear destructive/safe button distinction.

### 7. Responsive Design (Mobile-First)

#### Breakpoints
- `sm`: 640px (large phone landscape)
- `md`: 768px (tablet)
- `lg`: 1024px (laptop)
- `xl`: 1280px (desktop)
- `2xl`: 1536px (large desktop)

#### Rules
- Touch targets: 44px minimum on mobile.
- No horizontal scroll. Ever.
- Stack columns on mobile, grid on desktop.
- Hide secondary actions behind menus on mobile.
- Font sizes: scale down max 2px from desktop, never below 14px body.
- Test thumb zones: primary actions within natural thumb reach.

### 8. Accessibility (Non-Negotiable)

- All images: meaningful `alt` text or `aria-hidden` for decorative.
- All interactive elements: keyboard accessible (tab, enter, escape).
- Focus indicators: visible, high contrast (never `outline: none` without replacement).
- Color: never use color alone to convey meaning. Add icon or text.
- Aria labels on icon-only buttons.
- Screen reader: logical heading hierarchy, landmark regions.
- Reduced motion: respect `prefers-reduced-motion`.

### 9. Dark Mode (When Applicable)

- Background: not pure black (#000). Use #0A0A0A to #1A1A2E.
- Cards: slightly lighter than background (bg-white/5 to bg-white/10).
- Text: not pure white. Use #E5E5E5 to #F5F5F5.
- Accent colors: may need slight saturation/lightness adjustment.
- Borders: subtle (white/10 to white/20).
- Shadows: nearly invisible on dark -- use borders instead.

### 10. Performance-Aware Design

- Images: always specify width/height, use next/image or srcset.
- Fonts: max 2 families, preload critical weights, display: swap.
- Icons: SVG sprite or icon component, never individual image files.
- CSS: prefer Tailwind utility classes over custom CSS.
- Animations: CSS transforms only (never animate width/height/top/left).
- Lazy load below-fold content.

## Review Checklist

Before declaring any UI work complete, verify:

- [ ] Visual hierarchy is clear (squint test: can you identify the focal point with blurred vision?)
- [ ] Spacing is consistent (no random gaps or cramped sections)
- [ ] Typography has clear hierarchy (min 3 distinct levels visible)
- [ ] Colors are semantically consistent across the page
- [ ] All interactive elements have hover/focus/active states
- [ ] Mobile layout tested (or responsive classes verified)
- [ ] No orphaned text (single words on a line)
- [ ] Loading states exist for async content
- [ ] Empty states designed (not just "No data")
- [ ] Error states handled visually
- [ ] Touch targets >= 44px on mobile
- [ ] Contrast ratios meet WCAG AA

## Brvndlab-Specific Design Tokens

When working on Brvndlab, always use the Frosted Bento design system:
- Background: `#EEF0F4`
- Cards: `bg-white/80 backdrop-blur-lg rounded-[28px]`
- Accent: `#f97316` (orange-500)
- Text primary: `#1A1A2E`
- Text secondary: `#6B7280`
- Shadows: `shadow-xl shadow-slate-200/50`
- Active nav: orange dot + `text-[#f97316]`
- Refer to `design-system.md` for complete token reference.

## Anti-Patterns (Instant Red Flags)

- Gray text on gray background (contrast fail)
- Buttons without hover states
- Forms without validation feedback
- Lists without loading/empty states
- Modals without close mechanism
- Tables without sticky headers on long lists
- Cards all the same size in a grid (vary for hierarchy)
- Center-aligned body text (left-align body, center only titles)
- More than 3 font sizes on one card
- Neon colors on white backgrounds
- Drop shadows that look like the 2010s (too heavy, too spread)


---

## Import Hermes

Source Claude Code locale : `/Users/businessmanagement/.claude/skills/ui-ux-pro-max`.
Importé pour aligner Hermes avec Claude Code.
