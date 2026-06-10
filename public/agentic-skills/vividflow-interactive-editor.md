---
name: vividflow-interactive-editor
description: Use when creating or improving pitch decks, micro-SaaS mockups, dashboards, carousels, screenshots, or visual deliverables that need precise alignment, captions, draggable elements, layout QA, or an interactive editor workflow instead of static HTML/CSS guesswork.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [vividflow, editor, pitchdeck, microsaas, layout, visual-qa, interactive]
    related_skills: [vividflow-figma-production, vividflow-carousel-production-system, frontend-design]
---

# VividFlow Interactive Editor Workflow

## Canonical Skill

Pour le mode “Canva / Claude Design” directement injecté dans un vrai projet Vercel, utiliser d’abord `hermes-design-editor`.

Ce skill reste utile pour les éditeurs VividFlow plus larges : decks, carousels, canvas, pitch decks, exports, QA visuelle.

## Core Principle

When Jonathan or Thomas asks for a visual deliverable that requires precise placement — pitch deck, micro-SaaS screen, dashboard, carousel, UI mockup, product scene, caption overlay — do not rely only on static code guesses.

Build or use an interactive editor layer where elements can be selected, moved, resized, aligned, and exported.

The goal is simple: **make layout corrections visible and controllable**, especially for captions, cards, logos, arrows, labels, and slide sections.

## When to Use

Use this skill when the user says or implies:
- “crée une fonction editor”
- “je veux pouvoir déplacer la caption”
- “aligner les sections”
- “corriger le deck / pitchdeck”
- “faire un micro-SaaS propre”
- “les captions sont mal placées”
- “il faut un système interactif”
- “je veux éditer visuellement”
- “déplacer / redimensionner / réaligner les éléments”
- “exporter en image/PDF après correction”

Also use when a generated visual has repeated QA failures around:
- collisions text/UI
- mauvaises marges
- captions trop hautes/basses
- éléments non alignés
- CTA ou logo mal placé
- slides qui demandent des micro-ajustements manuels

## Don't Use For

- Pure copywriting without visual layout.
- Backend/API tasks.
- Simple one-shot static images where placement does not matter.
- Final Figma production if the user already has a designer actively editing the file.

## Decision Rule: Build vs Reuse Repo

### Prefer building a lightweight internal editor when:
- The need is VividFlow-specific.
- We need fast iteration with Jonathan/Thomas.
- We need export screenshots/images/PDF.
- Elements are mostly text, cards, captions, icons, arrows, UI blocks.
- We need precise but simple editing, not full PowerPoint parity.

Recommended stack:
- Next.js or Vite + React
- `react-konva` or `fabric.js` for canvas editing
- `zustand` for state
- JSON schema for slide/page elements
- export via canvas PNG, browser screenshot, or PDF pipeline

### Consider repo reuse when:
- The user needs full PowerPoint-like editing/import/export.
- There are many slide operations: themes, transitions, speaker mode, PPT import.
- Maintaining our own editor would be heavier than adapting an existing editor.

Repos to evaluate first:
- `pipipi-pikachu/PPTist` — full online PowerPoint-style editor, Vue/TS, strong feature coverage but heavy to adapt.
- `slidevjs/slidev` — great for developer Markdown decks, not ideal for drag/drop caption editing.
- `tldraw` ecosystem — good infinite canvas primitives; use if we need whiteboard/canvas, not deck-native.

Default recommendation for VividFlow: **build a focused internal editor**, not a full PPT clone.

## Minimal Editor Spec

Every interactive editor should support:

1. **Canvas / stage**
   - Fixed format presets: 16:9, 4:5, 1:1, 9:16, A4.
   - Zoom in/out.
   - Background color/image.
   - Safe margins overlay.

2. **Elements**
   - Text/caption.
   - Headline.
   - Card/container.
   - Image/logo.
   - Icon.
   - Arrow/connector.
   - CTA pill/button.
   - Screenshot/frame block.

3. **Direct manipulation**
   - Select element.
   - Drag.
   - Resize.
   - Rotate only if useful; default off for decks.
   - Duplicate.
   - Delete.
   - Lock/unlock.
   - Bring forward/send backward.

4. **Alignment controls**
   - Align left/center/right.
   - Align top/middle/bottom.
   - Distribute horizontally/vertically.
   - Snap to grid.
   - Snap to safe margins.
   - Show smart guides.

5. **Inspector panel**
   - X/Y position.
   - Width/height.
   - Font size/weight/line-height.
   - Color/background.
   - Border radius.
   - Opacity.
   - Element name/layer.

6. **Slide/page system**
   - Add duplicate slide.
   - Rename slide.
   - Reorder slides.
   - Save deck JSON.
   - Export single slide PNG.
   - Export all slides ZIP or PDF when available.

7. **QA overlays**
   - Collision detection warning.
   - Overflow warning.
   - Text outside safe area warning.
   - Tiny text warning.
   - Contrast warning if possible.

## VividFlow Element Schema

Use a simple JSON model. Example:

```json
{
  "deckId": "vividflow-demo",
  "format": { "width": 1920, "height": 1080 },
  "slides": [
    {
      "id": "slide-1",
      "name": "Cover",
      "background": "#080807",
      "elements": [
        {
          "id": "caption-1",
          "type": "text",
          "name": "Main caption",
          "x": 120,
          "y": 820,
          "width": 900,
          "height": 120,
          "rotation": 0,
          "locked": false,
          "style": {
            "fontFamily": "Poppins",
            "fontSize": 48,
            "fontWeight": 600,
            "color": "#F5F2EC",
            "lineHeight": 1.08
          },
          "content": "Le problème n’est pas le volume. C’est le suivi."
        }
      ]
    }
  ]
}
```

## Implementation Workflow

### 1. Clarify only the minimum
Ask at most one question if required:
- “On part sur deck 16:9, carousel 4:5 ou app screen ?”

If the context is obvious, proceed with the most likely format.

### 2. Create the editor before over-polishing visuals
If repeated placement issues happen, stop generating static variants and create an editor.

Minimum first version:
- left slide list
- center canvas
- right inspector
- draggable text/card/image blocks
- save/load JSON
- PNG export

### 3. Load existing visual as editable elements
If an existing HTML/mockup exists:
- extract text blocks and UI cards into elements
- preserve visual hierarchy
- do not flatten everything into a single screenshot unless used as locked background

### 4. Add correction handles for the user
Expose the exact controls the user keeps asking for:
- move caption
- resize caption box
- align sections
- move CTA/logo
- adjust card spacing
- export result

### 5. Verify visually
After building or modifying the editor:
- run local server
- open in browser
- drag at least one element
- edit one caption
- export or screenshot
- check console errors

Do not claim it works without browser verification.

## Repo Evaluation Checklist

When evaluating an external repo for this need, check:

- License permits internal/commercial use.
- Maintained recently.
- Can run locally with current Node version.
- Supports drag/drop and resize.
- Supports custom export.
- Easy to theme with VividFlow DA.
- Data model understandable.
- Not too heavy for our needs.
- No suspicious install scripts.
- No opaque backend dependency.
- No forced cloud account.

Recommended initial repo candidates:

### PPTist
Best for full presentation editor.
Pros:
- Mature PowerPoint-like editing.
- Slide list, canvas, layers, rich elements.
- Better if we want a full deck builder.
Cons:
- Vue stack, heavier integration.
- Overkill for simple caption/layout correction.
- Needs security/dependency audit before use.

### Slidev
Best for markdown/code-driven decks.
Pros:
- Fast for developer-style presentations.
- Good export ecosystem.
Cons:
- Not designed for drag/drop caption placement.
- Less useful for Jonathan/Thomas visual micro-adjustments.

### tldraw / canvas primitives
Best for canvas-native custom editor.
Pros:
- Strong direct manipulation model.
- Flexible.
Cons:
- Need to implement deck/page/export semantics ourselves.

## Default Recommendation

For VividFlow, build a small focused editor rather than adapting a massive repo.

Reason:
- Our recurring problem is not “we need PowerPoint online”.
- The problem is “we need to move captions, align sections, and export clean visual deliverables quickly”.
- A focused editor can be created faster and match our DA + workflows better.

## Embedded Editor Mode Pattern

When Thomas says the editor is “too complicated” or references “Claude Design”, do **not** create a separate canvas/product unless explicitly requested.

Default pattern: embed a tiny editor layer directly inside the real Vercel project:

- top-right button: `Editor mode`;
- when off, the app behaves normally;
- when on, click any existing UI element to select it;
- drag/drop selected elements to visually reposition them;
- double-click text/captions to edit copy inline;
- a small comment bubble opens next to the selected element;
- comments are anchored to the exact element/selector;
- local persistence via `localStorage`;
- export JSON for the agent/dev with selector, text, x/y offset, and comment;
- prefer stable `data-editor-id` attributes on important elements.

This is meant as a feedback layer on the real app, not as a replacement for the app.

Keep the UX almost invisible: one button, one bubble, no sidebar, no complex tool palette.

Reusable starter: `templates/editor-mode-overlay.js` contains a drop-in vanilla JS overlay for Vercel/Next preview deployments.

## Fast Static POC Pattern

Only use a standalone static proof-of-concept if the target project/repo is unavailable. Otherwise inject the embedded editor mode directly into the real app and verify on the live Vercel URL.

Detailed recipe: `references/static-editor-poc-vercel.md`.

## Quality Gate

Before delivering an editor or editor-based visual:
- [ ] Captions are selectable and draggable.
- [ ] Cards/sections are selectable and alignable.
- [ ] Inspector changes update the canvas live.
- [ ] Layout saves to JSON.
- [ ] Reload restores positions.
- [ ] Export works or fallback screenshot path is documented.
- [ ] Browser console has no blocking errors.
- [ ] At least one real correction was tested manually.
- [ ] If deployed, canonical Vercel alias is HTTP 200, public/no-login, noindex, and tested with a real interaction.

## Common Pitfalls

1. **Building another static mockup.** If the user asked for editor/control, static HTML is not enough.

2. **Using a full PPT clone too early.** It can slow us down. Start with the exact VividFlow pain: captions, alignment, export.

3. **Flattening everything into an image.** It kills editability. Only use flattened images as locked backgrounds.

4. **No persistence.** Drag/drop without JSON save is a demo, not a workflow.

5. **No visual verification.** Layout tools must be tested in a browser with real dragging/resizing.

6. **Overasking.** If Thomas says “une fonction editor”, infer the need and ship a minimal editor spec/prototype.

## Output Format When Advising

Respond with:
- verdict: build/reuse/hybrid
- why
- MVP scope
- stack/repo candidate
- next action

Keep it short and execution-oriented.
