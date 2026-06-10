---
name: vividflow-premium-qa
description: Use when reviewing VividFlow content drafts, carousels, visuals, captions, scripts, or creative assets before showing them to Jonathan or publishing
---

# VividFlow Premium QA

## Core Principle

Readable is not enough. A VividFlow asset must be strategically sharp, visually premium, ICP-specific, and conversion-ready before Jonathan sees it.

## Review Order

Review in this order:
1. Strategy: is the pain real and specific?
2. Copy: does the sequence create tension and action?
3. Visual direction: does it feel premium and brand-specific?
4. Execution: is it publishable, not just clean?
5. Conversion: is the CTA natural and clear?

## Scoring

Score each axis from 1 to 5:
- ICP specificity.
- Operational pain clarity.
- Business cost intensity.
- VividFlow mechanism clarity.
- Hook strength.
- Slide rhythm.
- Visual sophistication.
- Brand consistency.
- Swiss real-estate credibility.
- CTA strength.

Minimum before delivery:
- No axis under 4.
- Average 4.3+.
- Visual sophistication must be 4+.

## Immediate Rejects

Reject without polishing if:
- It uses an unofficial, recreated, or guessed logo/mark while presenting the asset as final.
- It fails to distinguish official logo assets from legacy/other-brand assets such as QORPO or from placeholders generated during earlier iterations.
- It feels like generic SaaS content.
- It only applies the colors, not the DA.
- It uses invented data.
- It mentions internal names publicly.
- It has an unclear CTA.
- It would not beat the previous graphic designer's baseline.
- It is a mockup pretending to be final.
- A hero device/object looks fake, CSS-made, or low-detail.
- The typography feels like a generic web mockup rather than the reference post typography.
- The detail density is visibly lower than the old posts Jonathan provided.
- It was generated mainly from local CSS/HTML approximations instead of a mature visual model/source like Gemini Design, Claude Design, Higgsfield, Figma references, or recovered original assets when Jonathan is asking to evaluate creative quality.
- Image-generator output contains readable hallucinated micro-text, random English labels, fake CRM/dashboard copy, or generated brand components that should have been added in a controlled design layer.
- A Higgsfield/Gemini/Claude Design visual ignores old VividFlow references/assets when Jonathan explicitly asked to keep the previous direction.

## Jonathan Calibration Log

Every correction from Jonathan becomes one of:
- New hard rule.
- New example to emulate.
- New anti-pattern.
- Update to scoring threshold.

Do not wait for the same correction twice.

## Visual Collision QA

Before showing any carousel, PDF, deck, brand charter, or visual draft, run visual QA on the rendered output, not just the copy/source. For logo/charte work, also verify asset provenance before judging polish: official vs legacy/other-brand vs placeholder/recreated. Check:
- title/body collisions;
- title/highlight capsule collisions;
- UI card crops that look accidental;
- logo/wordmark overlap with paragraphs or hero objects;
- brand pill overlap with phone, card, CTA, or chevron;
- footer safety zone consistency;
- long French headline line breaks;
- color-token/code strings that overflow cards;
- screenshot grid legibility at social preview size;
- micro-label/footer contrast at realistic PDF/mobile zoom.

If collisions are found, patch and QA again. A calibration draft may have strategic imperfections, but it must not have obvious layout collisions. For HTML/PDF exports, use the loop: render → browser vision QA → patch layout/contrast → re-export PDF → verify PDF header/size/path before delivery.

## Calibration Failure Patterns

Jonathan's VividFlow calibration feedback has repeatedly flagged these as quality failures:
- Object realism: fake-looking CSS phones/devices break trust immediately.
- Typography mismatch: a readable headline can still fail if it feels like a generic web template instead of a designed VividFlow post.
- Detail density: references are richer and more realistic than simple HTML mockups.
- Real-estate specificity: SaaS UI must be grounded in mandates, owners, estimations, visits, delays, assignments, and agency workflow.
- Visual collisions: no H1/body/callout/card collision is acceptable, even in a draft.
- Wrong optimization target: when direction is right but execution is weak, improve fidelity rather than changing concept.

If any of these appear, do not frame the asset as “close enough”. Mark it as exploration, patch, and re-QA.

## Potential Showcase Mode

If Jonathan explicitly asks to see what is possible with current assets, the draft can be delivered below final QA threshold only if all are true:
- It is clearly labeled as calibration/potential, not final-ready or publishable.
- It has undergone visual QA on the rendered PNG/screenshot, not just the source DOM or copy.
- Obvious collisions have been patched; remove non-essential UI badges/elements rather than shrinking everything into clutter.
- The remaining defects are named in 3 bullets maximum.
- The delivery includes screenshot/media and source path.
- The next blocker is stated concretely, not as a vague lack of quality.

Session example and render workflow: `references/session-2026-05-13-post-reproduction-calibration.md`.

## Discovery / Pitch Deck QA

### Progressive system slides and agent-activity visuals

When a VividFlow discovery/deck slide explains agents working across tools, prefer a benefit-led human message over a visible backend concept. Do not make “mémoire”, “source de vérité”, or architecture the main visible message unless Jonathan explicitly asks for technical explanation. Better narrative: tools create exchanges → agents prepare meaningful actions → consultants validate/keep the relationship.

For agent-activity visuals:
- show agents as active but calm, not as autonomous agents chatting with each other;
- use avatar + small notification-style badges, closer to iPhone/WhatsApp alerts than KPI dashboard counters;
- make counters meaningful and linked to actions: “+4 échanges résumés”, “+3 dossiers prêts”, “+6 relances préparées”, “+2 décisions à valider”;
- avoid timestamps like “maintenant / 1 min / 2 min” if they add pressure or noise; use calmer statuses such as “traité”, “prêt”, “à valider”, “transmis au consultant”;
- keep 3–4 visible notifications max and favor gentle progressive movement toward the consultant block;
- if the slide starts to feel like a dashboard, reduce cards/text before adding more animation.

Copy calibration for this class of slide: avoid blocky three-part titles that repeat the right-side consultant block. Prefer a simple benefit phrase such as “Vos consultants se concentrent sur la relation, pas sur le suivi.” Keep the consultant reassurance as a separate support block: “Vos consultants gardent la main.” / “Ils valident, ajustent et restent maîtres de la relation.”

For VividFlow discovery decks and AGaaS/IAO client-call presentations, additionally reject if:
- It feels like a framed PowerPoint, slide export, or generic HTML deck rather than a subtle guided experience.
- It shows visible slide numbers, internal labels, or “section / maquette” scaffolding to the prospect.
- It starts with abstract AGaaS education before enough client identification and operational pain.
- It uses too many empty “big phrase only” screens without enough concrete problem/consequence detail.
- It pastes mastermind/Kalvi screenshots as assets without integrating them into one mature VividFlow visual grammar.
- It does not help Jonathan sell conversationally: each screen should support a short explanation, a question, or a transition.
- It explains backend concepts like “mémoire”, “source de vérité”, architecture, or orchestration before the prospect clearly sees the operational relief.
- It fails to emulate the maturity of the old VividFlow horizontal deck experience: subtle controls, full-screen flow, low UI noise, and a natural sequence.

For slides about agent value, the default visible message should be agent relief + human role, not infrastructure: “Les agents préparent. Vos consultants gardent la relation.” Backend memory can stay implicit unless needed later.

Score deck assets on two extra axes:
- Prospect experience: identification → aggravation → education → projection → audit feels obvious.
- Seller experience: Jonathan can use each screen as a conversational stimulus without reading paragraphs.

### Slide copy / motion calibration from Jonathan

When reviewing VividFlow prospecting deck slides, prefer one clear human benefit over mechanical three-part titles. If a title repeats the right-side conclusion card, simplify the right-side card instead of stacking the same idea twice.

#### Boomer/patron before-after cards

For decision-maker cards, especially "Avant / Après" or "Ce qu’on a entendu / Ce qu’on installe", use the validated **boomer/patron** communication tempo:
- simple words a non-technical director understands in 3 seconds;
- concrete business situation, not naked abstract keywords;
- enough substance in 3–6 words, without long storytelling;
- global company view, not a forced narrow axis like only commercial, service, or operations unless asked;
- no SaaS/AI jargon, no grand phrases, no emotional over-writing.

Canonical example:

**Avant**
- Trop d’infos dans les boîtes mail
- Des clients suivis au cas par cas
- Des relances parfois oubliées
- Des dossiers pas toujours à jour
- Des opportunités qui échappent
- Une direction qui voit trop tard

**Après**
- Les infos importantes ressortent
- Les clients sont mieux suivis
- Les relances sont prêtes à temps
- Les dossiers restent à jour
- Les opportunités sont surveillées
- La direction voit quoi traiter

Anti-patterns from Jonathan calibration:
- stopping too early at generic labels like “info dispersée”, “suivi manuel”, “contexte perdu”;
- turning the card into a spoken script or beautiful paragraph when the structure is meant to stay as cards;
- saying “vos équipes…” or inventing a broad storyline when the existing structure already makes sense;
- choosing an axis instead of describing the whole leadership situation simply.

For slides showing agents at work:
- Show agents as active but calm: avatar + small notification/badge works better than abstract KPI counters.
- Notifications should feel like iPhone/WhatsApp alerts, not dashboard metrics: e.g. “+4 échanges résumés”, “+3 dossiers prêts”, “+6 relances préparées”, “+2 décisions à valider”.
- Avoid visible agent-to-agent chat; it can imply autonomous chaos. The desired feeling is “everything is handled in the background, without pressure”.
- Do not make titles look like rigid blocks. Let the headline breathe and use the visual sequence for the mechanism.

For “what it is / what it is not” slides, anchor copy around integration, not tool replacement. Validated direction: “Ce n’est pas un outil de plus. C’est une IA qui s’intègre à votre façon de travailler.” All surrounding copy should support that idea.

### Boomer/patron before-after cards

When Jonathan/Thomas asks for VividFlow R2/discovery cards that show the client’s current situation and the after-state, do **not** switch into a narrow communication axis (“commercial”, “service”, “charge mentale”) unless explicitly requested. The validated target is a simple decision-maker view: global business situation, readable by an older/non-technical company director in 3 seconds.

Rules:
- Use short concrete bullets, not long storytelling sentences.
- Avoid naked keywords with no substance: “Info dispersée” is too abstract; “Trop d’infos dans les boîtes mail” is better.
- Avoid robotic SaaS phrases: “infos clés qui remontent seules”, “suivi client préparé automatiquement” can feel unidentifiable.
- Keep the whole-company view: client follow-up, relances, dossiers, opportunités, direction visibility.
- Do not over-segment into separate commercial/service versions; the point is clarity for a patron.
- Prefer plain French a boomer/patron understands: “boîtes mail”, “clients”, “relances”, “dossiers”, “opportunités”, “direction”.

Canonical example:

**AVANT**
- Trop d’infos dans les boîtes mail
- Des clients suivis au cas par cas
- Des relances parfois oubliées
- Des dossiers pas toujours à jour
- Des opportunités qui échappent
- Une direction qui voit trop tard

Session reference: `references/session-vividflow-boomer-patron-before-after.md` captures the calibration path and canonical wording for this copy mode.

## Deck Trame Discipline

When reviewing VividFlow prospect/deck sections, first verify fidelity to the previously validated narrative structure before improving copy or adding detail. If a designer/agent changes the section’s role, correct direction immediately instead of polishing the new direction.

Rules:
- Preserve the section’s intended job: cover, respiration, mirror, friction, projection, mockup, deployment, CTA.
- Do not let a simple respiration page become a mini-analysis just because the copy/material is good.
- If the initial trame says “one strong phrase”, reject added columns/cards for that section and move them to the next logical section.
- When Jonathan says “tu dois lui répondre à lui”, answer as a ready-to-send message to the collaborator, not as commentary to Jonathan.
- The priority is narrative rhythm and trust-building, not showing all insight as early as possible.
- If Jonathan says “reprends ce qu’on avait dit”, retrieve and preserve the validated source before proposing. A polished reconstruction from memory is a failure.
- Do not invent or approximate the prospect category. Verify the business model/source site first; for Schmid Signature, say **gérance immobilière / gérance immobilière patrimoniale**, not “agence immobilière”.

Schmid calibration example:
- Section 1 = cover/promise: “une première lecture”.
- Section 2 = comprehension métier: one premium sentence only, not service cards.
- Section 2 sentence follows: “Entre [domaines métier], votre activité demande de garder une vision claire sur des décisions où [détail concret] peut peser sur [valeur métier/client].” Profond, sobre, concret, never résumé de site or gnangnan.
- Valid Schmid line: “Entre gestion locative, estimation et mise en valeur, votre activité demande de garder une vision claire sur des décisions où chaque détail peut peser sur la valeur d’un patrimoine.”
- Section 5 Schmid: “C’est là que beaucoup de gérances immobilières plafonnent.”
- Section 6 = dossier fermé / mystery: “La solution se trouve ici.” Do not show a system yet.
- Section 7 = dossier ouvert / reveal: show what comes out visually (agents IA, bras droit IA, équipes humaines, tools such as mails/WhatsApp/documents). Do not put paragraphs inside the dossier, do not mention dashboard, and do not invent specific client tools such as Claude or an unknown logiciel métier.
- Valid section 2 structure: “Entre [domaines métier concrets], votre activité demande de garder une vision claire sur des décisions où [détail concret] peut peser sur [valeur métier/client].”
- Valid Schmid line: “Entre gestion locative, estimation et mise en valeur, votre activité demande de garder une vision claire sur des décisions où chaque détail peut peser sur la valeur d’un patrimoine.”
- Avoid sentimental endings that feel “gnangnan”; prefer precise business values such as patrimoine, prix, délai, confiance, marge, qualité d’exécution.
- Valid Schmid line: “Entre gestion locative, estimation et mise en valeur, votre activité demande de garder une vision claire sur des décisions où chaque détail peut peser sur la valeur d’un patrimoine.”
- Calibration examples: VividFlow → qualité d’exécution d’une entreprise; KidsCare → sérénité des parents; AGCI → prix, délai ou confiance; Garage Guex → confiance du client, délai de vente ou marge du garage.
- Keep the tone profound but sober. Reject endings that feel emotional, generic, or “gnangnan”.
- Detailed gérance / estimation / mise en valeur blocks belong after, not on the respiration page.

## Section 2 — Compréhension métier template

When a prospect deck section is defined as “compréhension métier”, keep it as a one-phrase editorial mirror, not a service summary. The goal is to show a deep business reading of what their work makes possible or risks for their clients.

Validated structure:

> Entre [domaines métier concrets], votre activité demande de garder une vision claire sur des décisions où [détail concret] peut peser sur [valeur métier/client].

Rules:
- Use concrete domains from the company’s reality, but do not list website navigation as-is.
- The second half must name the deeper client/business impact, not just the company’s internal challenge.
- Stay sober and patron-level: no sentimental ending, no “avenir de vos clients” unless genuinely justified.
- Prefer precise business impact words: prix, délai, confiance, valeur, sérénité, qualité d’exécution.
- If the sentence becomes too long, cut the domain list before weakening the impact.
- Visual direction: editorial, elegant, very readable; domains can appear as fragments around the central sentence. No columns/cards if the trame calls for a single phrase.

Examples:
- Schmid Signature: “Entre gestion locative, estimation et mise en valeur, votre activité demande de garder une vision claire sur des décisions où chaque détail peut peser sur la valeur d’un patrimoine.”
- VividFlow: “Entre agents IA, outils existants et processus métier, votre activité demande de garder une vision claire sur des décisions où chaque automatisation peut peser sur la qualité d’exécution d’une entreprise.”
- AGCI: “Entre estimation juste, vente, location et accompagnement local, votre activité demande de garder une vision claire sur des décisions où chaque détail peut peser sur le prix, le délai ou la confiance d’un projet immobilier.”

Reject:
- “Entre X, Y et Z, votre activité demande d’accompagner…” — too generic.
- Website summaries disguised as insight.
- Emotional/generic endings such as “l’avenir de vos clients” when a concrete business lever is available.

## Delivery Format

Before showing a draft, include:
- Status: draft, wireframe, or final-ready.
- Score: /50.
- Weakest axis.
- What still needs validation.

## Common Mistakes

- Mistaking clean for premium.
- Treating the CTA as a footer.
- Letting visual effects replace meaning.
- Shipping without comparing against known good references.
