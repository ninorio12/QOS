---
name: aga-as-handdrawn-deck
summary: Produire le deck éducatif AGaaS/VividFlow avec narration commerciale, avatar 3D cohérent, copy ultra simple, storyboard minimaliste, et boucle Vercel/Canva/Gemini.
description: Use when creating, reviewing, or iterating the VividFlow AGaaS discovery/education deck, especially slide copy, visual prompts, 3D avatar direction, Canva/Gemini workflow, or Vercel prototypes.
---

# AGaaS VividFlow Deck

## Trigger
Use this skill for the VividFlow AGaaS discovery/education deck when Jonathan references Gemini, Canva, Vercel prototypes, 3D avatars/icons, the “bras droit opérationnel”, Data OS, mobile copilote, or the education/ambition deck narrative.

## Non-Negotiables
- Vercel is the delivery target.
- Current DA after Jonathan correction: consistent premium 3D avatar/icon character, same man across all slides, clean minimal deck, simple business scenes, readable copy.
- Use Jonathan’s provided 3D icon/avatar references as style direction for Gemini; generate an original recurring male character, not a copy of the reference.
- Forget previous orange/black VividFlow deck directions and stop forcing hand-drawn characters for this artifact unless Jonathan explicitly reverts.
- A hand-drawn black/white editorial board can still inspire composition density, cards, and pacing, but not the character style once the 3D avatar direction is active.
- No visible logo unless Jonathan explicitly asks.
- No visible nav buttons, slide numbers, progress bars, or corporate deck chrome.
- No SaaS dark UI, no glassmorphism, no generic dashboard mockups.
- Very little text: one idea per screen.
- Hyper-minimalism is mandatory: if the slide looks like a busy diagram, UI prototype, or dense SVG composition, reject it.
- The visual must explain the idea; text only anchors it.
- Jonathan may assemble in Canva and use Gemini for illustrations; in that workflow, collaborate on slide text + illustration prompts, not on forcing a full coded deck.
- Do not create or send long Markdown handoff packs unless Jonathan explicitly asks for files. When he asks for a brief/message, give a direct copy-paste message in chat.
- Do not over-explain process. Jonathan wants quick visual iterations and will correct the rendered output.

## Reference DA Breakdown
The chosen reference is a grid of black-and-white illustrated educational slides:
- White canvas with large negative space.
- Bold black hand-drawn editorial characters.
- Sans headline, heavy but friendly, often left or right aligned.
- Hand-drawn bubbles, arrows, squiggles, bursts, underline marks.
- Some slides use big black organic panels for contrast, but use them sparingly; dominant black masses can easily become too heavy.
- Text density is low: title + tiny support copy, or title integrated with illustration.
- Composition alternates: character + headline, diagram + character, split black/white, object metaphor.
- It is a communication system, not just a style: each slide is a simple pedagogical scene that can be understood in two seconds.

## Quality Bar: Gemini-Level Behavior
Before producing slides, behave like a senior deck/visual storytelling designer:
1. Extract the pedagogical job of the slide.
2. Choose one visual metaphor only.
3. Reduce copy until the slide can be understood in 2 seconds.
4. Sketch the composition in words before coding or prompting image generation.
5. Build one calibration slide first if producing a rendered artifact; otherwise validate text and Gemini illustration direction slide-by-slide.
6. Verify visually in browser when coding and reject if it feels like HTML/SVG slop.
7. Iterate until Jonathan validates the direction, then scale.

## Copy and Slide Text Discipline
Jonathan is extremely sensitive to over-written slides and long assistant explanations.

Rules:
- Work slide-by-slide when ideating or prompting Gemini; do not dump blocks of 5+ slides unless Jonathan asks for a full prompt.
- Keep chat responses short while collaborating. If Jonathan says “go/next”, give only the next slide or the exact asset/prompt requested.
- No paragraphs on slides unless explicitly requested.
- Avoid “cacahuètes”: long explanatory bullets, corporate phrasing, and consultant frameworks.
- Use words everyone understands: simple business and daily language. Avoid abstract/technical words such as “intuition terrain”, “contexte équipe”, “orchestration”, “agentique”, “système cognitif”, “contexte métier”.
- Slide copy should feel readable by a sales person without sounding like a script: title + short phrase, or clear cards.
- Avoid repeated bubble words across slides; each slide needs a distinct semantic world.
- Avoid “projection questions” as a repeated slide format. Jonathan dislikes salesy closing questions. The final discussion can happen orally; if a final slide is needed, frame it calmly as “La première mission”, not a pushy sales question.
- Avoid one-word capability lists when the meaning becomes vague. Use short concrete phrases when needed: “les infos importantes”, “les prochaines actions”.
- For visual slides, prefer 3–9 visible words plus illustration. Put detail in Jonathan’s oral bridge, not on the slide.
- If using before/after, keep labels concrete and business-readable, not abstract single verbs.
- Never present a full deck when the design direction is not validated unless Jonathan explicitly asks to generate everything fast.

## Slide Design Formula
For every slide, define:
- **Job:** what the prospect must understand.
- **Scene:** the visual situation.
- **Object:** the one dominant illustration/metaphor.
- **Text:** 3–9 words preferred; never paragraph-first.
- **Reveal:** what appears first, second, third.
- **Oral bridge:** what Jonathan says, not necessarily visible.

## Current Narrative
The default target is 16–18 slides. Do not exceed 18 casually; if there are more ideas, condense 2–4 related ideas into card-grid slides. The deck should stay light, educational, and visual.

Include these arcs:
1. Reality now: tools show activity but miss what actually moves business.
2. Information still lives in a few heads and gets lost across messages, follow-ups, and decisions.
3. Hidden cost: time lost, opportunities missed, communication blurred.
4. Old model: more humans, more tools, more processes; not always more clarity.
5. Shift: technology can now understand what needs to be followed, not only produce content.
6. Warning: automating chaos accelerates chaos.
7. Missing layer: between tools, information, and decisions.
8. Operational right hand: keeps the thread, captures, connects, prepares, alerts.
9. Concrete view: mobile text/voice channel (do not name Telegram by default; say phone/message/vocal, with WhatsApp/SMS/Telegram only if asked), execution actions, reporting, Data OS.
10. Ambition/pilotage: once daily execution is followed, leaders can pursue bigger goals, drive the vision, and make ambition executable.

Recommended slide forms:
- Title + short support phrase.
- Constat + consequence.
- 3–4 card grid for grouped ideas.
- Concrete demonstration slide.
- Ambition/pilotage slide.

Avoid making the deck only problem/solution. It must also show “what becomes possible”.

## Execution Workflow
1. If Jonathan is working in Canva + Gemini, do not force a coded deck. Collaborate slide-by-slide on:
   - visible text,
   - oral intent,
   - Gemini illustration direction,
   - validation criterion.
2. Start with one slide only when rendering. Prefer slide 8, 9, 15, or 16 for calibration because they test the education layer.
3. Make it look like a minimal illustrated education deck, not a coded diagram.
4. Use Gemini/generated illustrations when possible. If coding, keep strokes extremely sparse and organic; do not over-engineer fake drawings.
5. Deploy to Vercel only when the artifact is actually meant to be a web deck.
6. Screenshot the live Vercel page and verify against the DA checklist.
7. Ask Jonathan to validate or reject the direction before scaling.
7. Ask Jonathan to validate or reject the direction before making the full deck.

## Rendu Calibration Lessons
- A strong slide can use an organic black contrast panel, but if it dominates attention, shrink/lighten it or make its role explicit.
- If a note/caption overlaps bottom-right action bubbles, remove the note. Do not preserve clever copy at the expense of legibility.
- Browser vision QA is useful for catching collisions before showing Jonathan; use it as a gate, not as a replacement for taste.
- The live screenshot is the proof Jonathan needs, not a process explanation.
- Session-specific calibration notes are in `references/session-2026-05-18-calibration.md`.

## Rejection Checklist
Reject and redo if:
- It looks like a PowerPoint template.
- It looks like SaaS/product marketing.
- The drawing looks cheap or programmatic.
- There is too much text.
- The slide can’t be understood in 2 seconds.
- The education layer is missing.
- The slide is decorative instead of explanatory.
- A single slide tries to explain too many capabilities.
- Black contrast shapes dominate the message instead of supporting it.
- Jonathan says it should be “minimaliste”: remove elements aggressively before adding anything.

## Visual Communication Reference
See `references/visual-communication-notes.md` for condensed notes on the reference board, composition families, Canva/Gemini workflow, and failure modes.
See `references/session-2026-05-18-3d-avatar-pivot.md` for the session pivot to consistent 3D avatar style, simple business copy, and concrete mobile/Data OS/ambition requirements.
See `references/session-2026-05-19-claude-cotte-kalvi-review.md` for the Claude Cotte minimal editorial deck review: keep the DA, add Kalvi substance, progressive pedagogical moments, diagrams, and stronger phrase replacements.

## Internet/Benchmark Rule
If Jonathan asks for Gemini-level quality and existing skills are insufficient, use available Gemini Design MCP / image-generation references where possible. If external search is blocked, continue from Jonathan’s provided visual references and this DA breakdown rather than guessing.
