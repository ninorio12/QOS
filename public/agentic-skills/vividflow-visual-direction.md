---
name: vividflow-visual-direction
description: Use when designing or reviewing VividFlow social visuals, carousels, art direction, layouts, UI cards, visual systems, or brand consistency
---

# VividFlow Visual Direction

## Core Principle

VividFlow visuals must feel like premium B2B operational AI infrastructure, not generic AI SaaS decoration. Current strategic direction is generalist: no niche limit, able to serve TPE/PME, large accounts, institutions, and sectors such as insurance, medical, beauty, real estate, services, or public organizations.

Current strategic direction: VividFlow is no longer limited to real estate. It is a sector-agnostic premium B2B studio/agency for AI agents, automation, and hidden operational infrastructure. It must be able to speak simply to TPE/PME while carrying enough perceived value to attract large accounts, brands, institutions, and complex organizations.

## Brand Base

Known DA:
- Font: Poppins Medium when available.
- Orange: #FA5001.
- Black: #080807.
- Grey: #E0E0E0.
- Style: premium, clean, sober, secure, Swiss, SaaS, trustworthy.
- SaaS logo source when available: use the real orange V mark asset (`/vividflow-v-logo.svg`) instead of rebuilding a placeholder text “V”.
- SaaS contrast contract: every orange card, caption, pill, active nav item, avatar, or button using `#FA5001` must have white typography/icons. Do not leave black/dark text on orange, even inside nested spans/chips.

## Website / Framer Reference Direction

When Jonathan provides a website reference (e.g. Naiom, Framer template, competitor page) and asks for a VividFlow site direction:
When Jonathan provides a website reference (e.g. Naiom, Framer template, competitor page) and asks for a VividFlow site direction:
- first distinguish the request type explicitly: **visual clone/test** vs **strategic adaptation**. If Jonathan says “même direction visuelle”, “à l’identique”, “suis leur brand”, or “juste changer le texte”, do **not** reinterpret the reference with VividFlow colors/DA or new positioning. Reproduce the reference’s visible brand grammar as closely as legally/practically possible and swap only the copy/brand text.
- extract the reference’s strategic grammar only when he asks for adaptation, not when he asks for identical visual testing;
- keep VividFlow sector-agnostic unless Jonathan explicitly asks for a vertical page/case;
- treat Naiom-like agencies as direct benchmarks/competitors when they sell AI agents/automation to SMEs;
- public language should be simple and market-facing: “agents IA”, “automatisation”, “opérations”, “croissance”, “équipes”, “outils”; hide technical infrastructure/orchestration language beneath the surface;
- avoid saying “VividFlow fait/déploie…” in the hero headline; Jonathan prefers market statements/headlines, then a human subheadline like “Nous déployons…”;
- use product proof early: agents → tasks automated → tools connected → operations structured → growth supported;
- narrative order matters: hero → problem/identification → intro/solution → agents → services → process → CTA → FAQ → final CTA. Do **not** put intro/promise before the problem; visitors must recognize themselves first;
- during live site/copy workshops, state only the validated step and the next step; if the step is not validated, keep brainstorming instead of advancing;
- be opinionated: challenge ideas that weaken the premium/generalist B2B positioning instead of mirroring Jonathan’s suggestions;
- prefer a visible prototype over a long explanation;
- QA hero clarity, CTA visibility, contrast, jargon, exact copy preservation, FAQ answers, and section order before presenting.

Current validated hero-copy direction from Jonathan:
- Headline: “L’IA opérationnelle au service de votre croissance”
- Subheadline: “Nous déployons des agents IA qui automatisent vos tâches, connectent vos outils et structurent vos processus métier.”
- Intro line: “VividFlow délivre des agents IA opérationnels, des automatisations et des systèmes connectés pour soutenir vos équipes au quotidien.”

A validated session workflow is stored in `vividflow-product-artifact-studio/references/framer-reference-to-prototype-workflow.md`. Session-specific positioning notes are in `references/vividflow-generalist-premium-website-direction.md`.

For the current VividFlow public website copy/structure, also load `references/vividflow-website-copy-structure-2026-05.md`. It contains the validated hero, intro, services, agents/names, process, FAQ tone, and key pitfalls from Jonathan’s calibration.

For Naiom visual-clone requests and strict copy-only PDF corrections from the May 23 session, also load `references/session-2026-05-23-naiom-clone-and-copy-pdf-corrections.md`. It captures the “follow their brand identically, only swap text” rule and the “do not invent unvalidated agent copy” PDF rule.

For ClaudeDesign/Framer landing-page handoffs and audits, also load `references/session-2026-05-22-landing-copy-claudedesign-calibration.md`. It captures Jonathan’s corrections on exact copy preservation, responsibility vs promesse, FAQ answers, CTA simplicity, section order, warm/chill DA, and agent illustration workflow.

## Visual System

Use visual elements only when they carry meaning:
- CRM/ops cards for leads, tickets, policies, tasks, follow-ups, approvals, reporting.
- Conversation panels for WhatsApp/email/SMS as channels.
- Workflow lines for dispatch, routing, follow-up, escalation.
- Sector artifacts only when relevant: insurance files/policies, sales pipeline, support inbox, invoice, contract, property/mandate if the specific client is real estate.
- Light rays and blur only for depth, never as filler.

## Layout Rules

- Strong hierarchy: one dominant idea per slide.
- High contrast between hero text and support elements.
- Breathing room. Premium means restraint.
- Branding discreet and consistent.
- Orange highlights only the key action, risk, or transition.
- Every slide must have a distinct role, not the same composition repeated.

## Reference-site visual-clone pitfall

If Jonathan asks to “faire le site VividFlow avec la direction visuelle, motion, dashboard, texture, couleur” of a reference site, build a prototype yourself rather than only writing a prompt/brief, unless he explicitly asks for a handoff. Preserve the visual grammar (layout rhythm, hero treatment, motion, dashboard cards, textures, colors) while rewriting all copy from VividFlow’s validated positioning. Do not label VividFlow as “studio opérationnel” or reuse the competitor’s category language just because the reference does.

## Existing deck filtering / DA-only extraction

When Jonathan asks to use the VividFlow visual-direction reference for a client deck, do **not** substitute an old/adjacent VividFlow deck link from memory. The canonical reference may be a specific Vercel DA deck. First retrieve/verify the exact DA deck URL from session files/history or ask if it cannot be found; explicitly say when you have not found it. Never send a plausible but wrong reference such as an old Netlify deck. For handoffs, include both links together: the current client R2 URL and the exact VividFlow DA deck URL.

When Jonathan provides an existing VividFlow deck/link and asks for “uniquement ce qui concerne la DA / communication visuelle”:
- do **not** redesign, reinterpret, summarize, or invent new visual language;
- copy the existing deck/source as the base and remove only non-DA sections;
- preserve original CSS, layout, labels, images/assets, color values, and wording from the kept sections;
- keep only sections directly about visual direction: summary/verdict DA, colors/materials, interfaces/SaaS visual style, typography/layouts, avatars/characters, imagery/motion if already present;
- remove copy, narrative structure, problem, services, agents’ operational copy, process, CTA, FAQ, ClaudeDesign prompt/brief, QA copy checklist;
- if assets are referenced relatively from the original deployment, make them absolute or copy them so the filtered link stays visually identical;
- verify by searching the deployed HTML for removed-section snippets before handing over.

Pitfall from Jonathan correction: a DA-only extraction is a deletion/filtering task, not a creative production task. Inventing a new DA page is wrong even if visually polished.

## Existing VividFlow Post Patterns

From Jonathan's reference posts, the strongest assets use this logic:
- Start from a short aphorism or contradiction: volume vs intelligence, canal vs méthode, hasard vs système, générique vs intention.
- Make one word the visual object: orange, black, or white capsule; sticker effect; subtle shadow/glow; sometimes editor selection or strike-through.
- Build a scene around the idea: human pain, phone, key, card, laptop, dashboard, message bubble, CRM card.
- Keep the reader path simple: headline → highlighted word → proof visual → brand pill → swipe/CTA.
- Use living backgrounds: orange warmth, blue/black depth, radial glows, blurred UI, subtle dots/lines, not flat blocks.
- Use the bottom system consistently on carousels: VividFlow brand pill bottom-left + circular chevron/CTA bottom-right.
- Make UI visual proof, not decoration: lead notification, inbox, CRM dashboard, acquisition dashboard, status pill, magnifier, flow line.
- Preserve movement across slides: stable brand pill and navigation, varied scene/object, consistent highlighted-word treatment.

## Closest Recovered VividFlow Series Pattern

When trying to match Jonathan's current VividFlow examples, prioritize this structure:
- Format: vertical 4:5, 1080 × 1350 equivalent.
- Background: full-bleed orange gradient for context/problem slides; black premium tech for solution/change slides.
- Grid: very thin red/orange construction lines, low opacity, recurring across slides.
- Hero: one realistic real-estate or tech object, never a fake CSS device. Keys, mandate folder, laptop, CRM interface, architectural plan, property card.
- Title: very large white sans-serif, bold/extra-bold, tight line-height, left aligned.
- Highlight: 1-2 segments in black block on orange slides, or orange block/text on black slides.
- Body: short white paragraph under title, limited width.
- Footer: brand pill bottom-left with VividFlow + “L’IA des agences immobilières”; circular arrow button bottom-right.
- Rhythm: context → problem → change/solution, with orange → orange → black transition.

Reject if a carousel feels like a static document instead of a sequence of visual scenes.

## Avatar / Character Direction

When Jonathan shares avatar or character moodboards, do **not** equate premium B2B credibility with corporate clothing or polished consultant aesthetics. VividFlow can carry premium infrastructure value with chill, human, GenZ-coded characters if the business promise stays mature.

Accepted avatar direction:
- chill, accessible, human, personality-driven;
- founder/operator energy, not corporate stock-photo energy;
- caps/relaxed outfits are allowed when controlled;
- characters can reflect Jonathan’s real-world vibe.

Reject only if the visual becomes NFT collection, adolescent gaming, pure streetwear brand, or if style becomes louder than operational trust.

Detailed Pinterest calibration: `references/pinterest-moodboard-calibration.md`.

## Anti-Generic Rules

Never rely on:
- Black/orange/glassmorphism alone.
- Fake dashboards with meaningless numbers.
- Futuristic AI clichés.
- Floating cards without operational context.
- Overloaded UI mockups.
- Corporate dress codes as a proxy for trust.

## Swiss B2B Codes — updated calibration

Prefer:
- Precision.
- Trust.
- Calm authority.
- Operational clarity.
- Plain-language business outcomes over infrastructure jargon.
- Warm, chill, human, illustrated energy when Jonathan is calibrating the broader VividFlow DA.

Important correction from Jonathan: do **not** confuse premium B2B credibility with corporate clothing/codes. VividFlow can sell serious AI infrastructure while feeling founder-led, GenZ-aware, relaxed, warm, and human. The premium must come from clarity, structure, copy, proof, execution quality, and business maturity — not from making the brand look like a cold consulting firm.

Avoid:
- Startup chaos.
- Neon sci-fi.
- Meme energy.
- Cold corporate disguise.
- Judging credibility by whether avatars/people look like consultants.
- Loud creator-brand aesthetics when it weakens trust.
- Over-verticalizing VividFlow as immobilier when the current strategic direction is generalist B2B.

## Landing-page / ClaudeDesign copy handoff rules

When Jonathan asks for a deck/brief/link/prompt/PDF for ClaudeDesign, Framer, Claude Code, or another design/build agent:
- first classify the task: **faithful handoff of validated material** vs **new production/strategy**. If Jonathan says “exactement”, “ce qu’on avait validé”, “structure slide par slide”, “copie/colle”, “à envoyer à Claude”, or corrects an invention, stop synthesizing and retrieve/copy the source material verbatim.
- for faithful handoffs, use the validated source as the authority: preserve the exact logic, section order, slide titles, body copy, CTA, placeholders, and URL pattern. Do not rewrite, shorten, expand, “make more complete”, or import stronger lines from adjacent brainstorms unless Jonathan explicitly asks.
- if the validated source is in the current conversation, quote it directly; if not, search session files/logs before drafting from memory. A polished synthesis is a failure when the ask is pass-through fidelity.
- include exhaustive copy and instructions for design-agent handoffs only when the material is not already validated; for faithful pass-through, copy first, add only minimal implementation constraints after the source.
- if he asks for a **copy-only document/PDF**, include only section names, validated copy, and clearly labeled CTAs. Do not include instructions, rationale, design notes, or unvalidated filler;
- preserve validated wording exactly; do not silently rewrite, rename, or “improve” copy blocks;
- for agents, use `responsibility`, not `promesse`;
- do not add unvalidated brand phrases inside agent copy (e.g. avoid inventing “vos agents VividFlow”);
- do not invent agent descriptions or “Ce qu’il/elle peut faire” bullets in copy-only deliverables. If the exact agent card text is not validated, include only validated agent names/roles or ask for the missing validated text;
- FAQ/Q&A must include full answers, not only questions;
- final CTA must stay simple unless Jonathan validates more: `Vos opérations peuvent travailler plus vite grâce à l’IA.` + `Réserver un appel`;
- do not add unvalidated micro-reassurance such as response delay, call duration, or “sans engagement”;
- verify section order and rendered content before saying the brief is ready.

Landing narrative order validated by Jonathan:
1. Header
2. Hero
3. Problem / identification
4. Intro / solution
5. Agents IA
6. Services
7. Process
8. CTA intermédiaire
9. FAQ
10. Final CTA

When reviewing a generated landing PDF/design:
- compare against the exact copy and flag every drift;
- reject if the design feels like a technical infrastructure document rather than warm/ludic/human premium;
- reduce console/log/system labels to micro-details only;
- require agent/persona placeholders even if final Gemini illustrations come later;
- remove prototype/dev footer language.

## Required Before Production

When Thomas/Jonathan asks for MCP/CLI/tools to make strong VividFlow designs with Vision Architect, recommend this stack:
- **Figma MCP**: source of truth, frames, assets, component inspection.
- **Framer MCP**: landing/CMS/publication checks; not the main art-direction brain.
- **Higgsfield CLI**: realistic premium scenes/backgrounds; generate visual maturity upstream of local rendering.
- **Gemini Design MCP**: visual iteration and image-understanding when available.
- **Claude Design / HTML artifacts**: fast interactive prototypes, not final DA invention.
- **browser-harness / browser-use**: reference-site capture, screenshot QA, responsive checks.

Rule: use Higgsfield/Gemini for creative maturity, Figma/Framer for structure and delivery, HTML/CSS only as prototype/render layer.

## Pinterest / Moodboard Calibration Workflow

When Jonathan uses Pinterest/moodboards to define VividFlow DA, keep the workflow entrepreneur-friendly and non-graphist:
- Start with 4 clear boards only: `Couleurs & matières`, `Typos & layouts`, `Interfaces & SaaS`, `Avatars & personnages`.
- Avoid a vague `Mood global` board if Jonathan is confused; it becomes a catch-all and creates brouhaha.
- Do not ask for large curation counts. Ask for a small top-selection of the strongest references, and start with the board that matters most for the current decision.
- Do **not** tell him to delete everything above a count. Frame it as “top références” while the rest can remain in Pinterest.
- When reviewing avatars, do not reject chill/streetwear/casquette energy as non-premium by default. Translate the useful signal into VividFlow: chill, human, stylish, accessible, but not cheap/NFT/gaming.
- When producing a design handoff/deck from moodboards, include both DA and execution instructions: exact site copy, sections, agents, process, FAQ, final block, anti-errors, and a ready-to-send brief. A pure mood/DA deck is insufficient for ClaudeDesign if the goal is to build the landing page without mistakes.
- Session-specific details and copy blocks: `references/pinterest-moodboard-to-claudedesign-handoff.md`.

## Required Before Production

For client R2/deck visual upgrades, default to Jonathan’s validated workflow: work **section by section**, request **3 true visual mockups** for the first section, validate one direction, then décline. Do not ask the design agent to “make the whole deck more beautiful” in one pass. If the visual system itself feels weak, pause section production and run a short visual-direction brainstorm before rebuilding from Section 1.

For outbound/projection decks, the base DA is not “VividFlow landing SaaS” and not niche-specific luxury. Treat it as a **dossier de projection personnalisé signé VividFlow**: modular across niches, premium, tailored, and strong enough that each of the ~7 pages can create a “wow” without becoming overloaded. Session detail: `references/projection-dossier-da-brainstorm.md`.

Visual brainstorm must explicitly frame these 5 points before prompting a designer:
- Base: dossier de projection personnalisé signé VividFlow, not a generic commercial deck.
- Color: clean off-white/soft-grey Apple-like base, deep black typography, rare surgical VividFlow orange as attention lever; avoid beige invisibility, full-orange fatigue, dark SaaS blocks, or heavy color backgrounds.
- Typography: 100% modern sans-serif Apple-like direction (SF Pro / Inter / Helvetica Now / Neue Haas-like); avoid full generic Poppins and avoid serif by default.
- Texture/surface: no paper/grain by default; use studio-light surface, soft gradients, premium shadows, ghost grid/micro-dots, rare orange points as reading signals.
- Rhythm: preserve the validated 8-screen trame; one idea per screen; each page must be a moment, not a filled slide.

For client R2/deck visual upgrades, default to Jonathan’s validated workflow: work **section by section**, request **3 true visual mockups** for the first section, validate one direction, then décline. Do not ask the design agent to “make the whole deck more beautiful” in one pass. Start with the most commercially revealing section (often Avant / Après) rather than the header if the goal is to test whether the DA serves the sale.

For outbound personalized projection decks, use the Apple-like dossier calibration in `references/projection-personnalisee-apple-dossier-calibration.md`: a **dossier de projection personnalisé signé VividFlow, traité comme une Keynote Apple**. Keep the validated screen order; do not turn mystery/reveal pages into explanatory SaaS schematics.

For personalized outbound/projection decks, use `references/projection-deck-apple-like-da-calibration.md` before prompting a design agent. Current validated direction: **personalized projection dossier signed by VividFlow, treated like an Apple Keynote**. Preserve the validated 8-screen trame from `brainstorm-profond/references/projection-personnalisee-outbound-v1.md`; do not invent a new rhythm. Calibrate five axes before production: base, colors, typography, textures/surface, rhythm. Default: clean off-white/soft-grey Apple-like surface, deep black typography, rare surgical VividFlow orange, modern sans only, ghost grid/micro-dots as subtle reading signals, one idea per screen.

For every graphic asset, define:
- Reference or benchmark.
- Slide/page composition model.
- Main visual metaphor.
- UI components needed.
- What each visual element proves.
- Typography calibration target and word-pivot treatment.
- Sector artifact or workflow detail that makes the scene specific when a vertical/client context is known.

For outbound projection/maquette pages, do not answer with only “premium dashboard” direction. Provide enough visual detail for execution: page-by-page composition, exact UI cards/status labels, realistic scene layer, CTA placement, and why each visual proves the business pain. Thomas/Jonathan may explicitly benchmark “best maquette on the market”; in that case, raise the detail density before styling polish.

For R2 dashboard maquettes, distinguish **dashboard de présentation** from real back-office. The first view must be simple, sharp, and proof-led: personalized greeting, 4 KPI max, 3 objectives max, visible agent/bras droit activity, and clients to follow. Remove noise such as repeated section labels, fake date/prepared-at lines, excessive badges/buttons, nav dots, and total counts styled like notifications. The active menu state can be blue; no extra bullet/circle is needed. Show the client’s “Après” in 10 seconds, not every feature.

Critical handoff rule from Jonathan correction: when a maquette/script/structure has already been validated, a Claude Code/Claude Design handoff must preserve it exactly. Do **not** invent a new slide sequence, rewrite validated titles, change the commercial logic, or add a “better” story just because the visual format changes. First recover the exact validated script from the conversation/session files if needed, then package it as the source of truth. Use design notes only to execute the validated copy/structure; if something is missing, ask before inventing.

## Fast Brand Charter / Logo PDF Workflow

When Thomas or Jonathan asks for a quick VividFlow “charte graphique + logo” PDF, produce a useful v1 instead of blocking on Figma unless they explicitly require Figma source. Use the known brand base and real logo asset when available, then:
1. Create a self-contained A4 landscape HTML brand charter with sections: cover, positioning, logo lockup, clear space, colors, typography, visual components, social/carousel rules, tone/copy, do/don't, quick kit.
2. Include VividFlow specifics: premium B2B operational AI, agents IA, automation infrastructure, orange `#FA5001`, black `#080807`, grey `#E0E0E0`, white text on orange.
3. Export with headless Chrome to PDF.
4. Run rendered visual QA with `browser_vision`, patch collisions/overflow/contrast, then re-export.
5. Deliver the PDF as media and label it as “v1/final-ready” only after verification.

Do not over-explain the production process to Thomas; send the file with a short status and one caveat if needed. Detailed reusable steps and export commands: `references/fast-brand-charter-pdf.md`.

If Thomas/Jonathan rejects a brand charter or post as not matching the 13 May images, stop polishing the generic version. Recover and reverse-engineer the source Figma exports (`Samedi.png`, `Logo.svg`, `Profil Button.svg` when available) and rebuild around the actual source formula: orange/red full-bleed, small top logo, short high-tension headline, black word-pivot sticker, proof card, and realistic mobile/person/object. Detailed correction notes: `references/source-brand-charter-v2-calibration.md`.

Jonathan correction 2026-05-13: do not rely on local CSS/HTML/PIL-style reconstruction as the primary creative source for VividFlow posts. If the output is meant to test visual maturity, first route ideation/visual generation through higher-maturity design sources such as Gemini Design MCP, Claude Design process, Higgsfield, and/or Figma/reference assets as source of truth. Local HTML/CSS is only a renderer/prototype layer, not the art-direction brain.

Jonathan follow-up 2026-05-13: keep the previous VividFlow direction and assets. Do not restart from a new generic DA. When using Higgsfield, provide recovered old VividFlow references as `--image` inputs, generate the mature scene/background only, avoid final text in the image, and add controlled typography/brand components later in Figma/design layer. The winning prompt pattern and CLI commands are documented in `references/session-2026-05-13-higgsfield-mature-calibration.md`.

When the task is visual calibration against Jonathan's references, also load:
- `vividflow-typography-calibration`
- `vividflow-realistic-scene-design`

When creating or reviewing a VividFlow discovery/pitch deck, especially AGaaS / IAO client-call material, use `references/discovery-deck-calibration.md`, `references/discovery-deck-progressive-interaction.md`, and `references/discovery-deck-white-sketch-calibration.md`. For Claude Cotte / minimal editorial AGaaS deck reviews, also load `aga-as-handdrawn-deck` and its `references/session-2026-05-19-claude-cotte-kalvi-review.md`: keep the validated cream/editorial DA, then add Kalvi substance, diagrams, progressive moments, and phrase-level fixes. For R1 pre-sale discovery/demo/audit decks, also use `references/r1-agaas-sales-deck-brainstorming.md` before any storyboard or prototype. Key lesson: do not produce a framed PowerPoint-like HTML deck and do not start from design/code/storyboard before extracting Jonathan's sales process. Emulate the subtle old VividFlow horizontal experience (`https://vividflow-deckfr.netlify.app/`): full-screen flow, no slide numbers/internal labels, strong but sparse copy, diagrams that live in the space, and a narrative built from client identification before AGaaS education. For the white-sketch AGaaS education deck specifically, do **not** apply the orange/black SaaS/social DA: use a light paper background, animated minimal sketches, no visible VividFlow logo, and no visible deck buttons unless Jonathan asks. Critical interaction lesson: screens should often reveal buttons/layers progressively, not show all ideas at once. Before any storyboard or design, run the sales-brainstorm roadmap from `references/discovery-deck-calibration.md`: one simple question at a time, visible bloc/question numbering, challenge vague answers without inventing intent, and extract Jonathan's actual R1 sales process first. If reference-led sketch prototypes are rejected or Jonathan asks for a handoff/stack for another builder, stop polishing the prototype and use `references/agaas-deck-external-handoff-calibration.md` to package references, stack, narrative, DA constraints, structure, and acceptance criteria for transfer.

When Thomas asks to improve a live SaaS screen in UX/motion/design, treat it as an app calibration loop, not a simple CSS polish pass. Audit the current screen first, preserve working logic, then improve hierarchy, dark/orange DA, motion feedback, disabled states, and visual density before build/deploy. Detailed recipe: `references/app-ux-motion-calibration.md`.

When Jonathan/Thomas asks for a Miro-style diagram of the VividFlow operating system, agentic Slack/Telegram/Data OS/Second Brain/GBrain stack, or a visual explanation of the “COO / executors / memory” model, load `references/operating-system-miro-diagram-calibration.md` first. Key calibration: landscape, simple, few useful arrows, one Data OS labeled “Source de vérité”, COO text kept short, memory shown as a background layer with a VPS Hostinger stack: Context Loader → GBrain → Second Brain.

## VividFlow landing / ClaudeDesign handoff discipline

When Jonathan asks for a Vercel link, deck, or brief to send to ClaudeDesign/Framer/Gemini for the VividFlow landing, do **not** produce only a DA moodboard. Build an exhaustive copy-and-design handoff: exact hero, intro, services, agents, responsibilities, missions, process, CTA placements, FAQ questions **with answers**, final block, logo/assets notes, anti-errors, and a ready-to-copy prompt.

Hard rules from Jonathan’s corrections:
- Never rename validated labels. If the chosen agent field is `Responsabilité`, do not change it to `Promesse`.
- Never present invented copy as validated. If exact wording is missing, mark it as a suggestion or ask for the exact phrase.
- In copy-only PDFs/documents, do not “complete” missing agent card text from style rules or examples. Examples like `repérer les prospects...` are style examples, not validated copy for every agent.
- Do not insert extra brand phrasing inside agent copy when it was not validated (pitfall: `vos agents VividFlow`).
- FAQ/Q&A must visibly include both `Question` and `Réponse` for every item.
- CTA principal is `Réserver un appel`; repeat it at the main decision points without creating aggressive competing CTAs.
- For agent illustrations, prefer Gemini for generating a coherent validated image series, then ClaudeDesign for page layout/integration.

Detailed checklist: `references/landing-copy-brief-handoff-rules.md`.

When Thomas says a VividFlow/Data OS workflow board is “pas beau”, broken, or not fluid, load `references/workflow-canvas-polish.md`. Key pitfall: selectable SVG arrows need a separate invisible hitbox path with `marker-end:none`; otherwise the hitbox can inherit/show giant arrowheads or black triangles. Verify marker styles, pan/grab, Focus, inspector scrolling, build, production HTTP, and console before reporting done.

## Realism and Detail Standard

Jonathan's calibration feedback: the references are more detailed, more realistic, and use different typography. A fake-looking constructed object breaks the premium standard.

Hard rules:
- Do not use obviously fake CSS-drawn phones, laptops, dashboards, or objects as the hero visual unless the style is intentionally illustrative.
- Prefer real-looking photo composites, high-fidelity mockups, or screenshot-like UI with realistic shadows, bezels, gradients, and micro-details.
- If realistic image generation/assets are unavailable, do not fake a device in CSS. Switch to a high-detail product/UI scene, or ask for an asset if the format truly needs photo realism.
- For fast “show me what it gives” requests, prefer one strong 1080×1350 calibration post over a weak carousel. Render it, run vision QA, patch collisions, and label it calibration.
- Typography must be calibrated against the references before production. If it looks like generic Poppins web mockup, reject and rework.
- Detail density must be higher than a simple HTML mockup: realistic device texture, believable UI hierarchy, micro-labels, depth, and scene context.
- “Clean” is not enough. It must feel designed, realistic, and close to the old VividFlow posts.
- In calibration, one strong single-slide format can be better than a weak six-slide carousel. Use it to test visual fidelity before scaling to a full carousel.

## Quality Gate

Reject visual direction if:
- It would still work for a generic AI startup.
- It cannot be recognized without the logo.
- It has no relationship to concrete operations, workflows, teams, tools, or business outcomes.
- It looks like a technical HTML mockup rather than a designed asset.
- The hero object looks fake or obviously generated with basic CSS.
- The typography does not resemble the reference posts.
- The detail level is lower than the old VividFlow examples.
