---
name: client-contract-documents
description: Créer des contrats, conventions et documents commerciaux Client Delivery en PDF à partir d'une offre, avec wording clair, branding, clauses business, export Chrome headless et QA texte/visuelle. Utiliser quand l'utilisateur demande un contrat PDF, bon de commande, convention d'accompagnement, conditions d'offre ou document de signature client.
version: 1.0.0
author: Hermes / ClientOps
license: MIT
metadata:
  hermes:
    tags: [clientops, aios, contract, pdf, legal-document, client-facing]
    category: clientops
    related_skills: [client-sales-hub-deliverables, ocr-and-documents, nano-pdf]
---

# Client Contract Documents — Contrats PDF Client Delivery

> Public/cohort-safe adaptation: this skill was sanitized from an internal delivery workflow. Replace placeholders like `<client_slug>`, `<client-dashboard-url>`, `<SECRET>` with your own environment values.

## When to Use

Utiliser quand operator/Team Member/operator demande :

- “prépare un contrat en PDF” ;
- “fais un bon de commande” ;
- “mets l'offre dans un contrat” ;
- “écris que le client paie X maintenant et Y plus tard” ;
- “ajoute le logo Client Delivery” ;
- “document à signer”.

Si le document devient un support public type deck/hub/CDC, charger aussi `client-sales-hub-deliverables`. Si l'utilisateur demande seulement un contrat PDF à envoyer vite, ce skill suffit.

## Principles

1. **Contrat utile > prose juridique gonflée.** Le client doit comprendre ce qu'il achète, ce qu'il paie, quand il paie, et ce qu'il doit faire.
2. **Pour VividFlow, privilégier un rendu sobre type contrat classique.** Jonathan a rejeté les contrats visuellement lourds : éviter trop d'encadrés, fonds colorés, badges, prose dense. Préférer articles numérotés, beaucoup d'espace blanc, hiérarchie claire, style proche d'un contrat simple mais propre.
3. **Ne jamais inventer les infos légales absentes.** Laisser des champs à compléter seulement si aucune source fiable n'existe. Pour VividFlow, l'identité de référence connue est : VividFlow LTD, société de droit anglais, siège 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom, représentée par Jonathan Zekhe. Activité commerciale notamment en Suisse.
4. **Droit applicable VividFlow.** Pour les contrats VividFlow liés à l'activité Suisse de Jonathan, inclure une clause `Droit applicable & juridiction` indiquant le droit suisse, sauf demande contraire explicite.
5. **Ne pas ajouter de note qui ralentit la signature.** Éviter les encadrés finaux du type “note de validation / relecture juridique recommandée” dans le PDF client si Jonathan veut un contrat prêt à signer. Si une caveat est nécessaire, la dire à Jonathan hors document.
6. **Respecter exactement le deal demandé.** Les montants, déclencheurs, échéances et conditions de solde ne doivent pas être “arrangés”.
7. **Client-facing propre.** Design sérieux, lisible, sans effet gadget.

## Standard Workflow

1. **Relire le contexte offre**
   - Chercher dans `wiki/index.md`, pages entités/concepts et mémoire projet.
   - Pour ClientOps Incubateur : `wiki/entities/incubateur-ia-clientops.md` et `wiki/entities/agence-clientops.md` contiennent souvent structure, Discord, coachings, outils.

2. **Trouver le logo/branding**
   - Chercher assets : `find /root -iname '*logo*'`, puis images webp/png/jpg liées à Client Delivery.
   - Si un asset est ambigu, faire une vision QA avant usage.
   - Ne pas utiliser un logo d'autre produit (ex: “IAO Mastermind”) comme logo ClientOps sauf demande explicite.
   - Si aucun logo officiel n'est disponible et que l'utilisateur veut un document maintenant : créer un wordmark propre Client Delivery dans le HTML et signaler implicitement que c'est un branding propre, pas un asset officiel validé.

3. **Structurer le contrat**
   Sections recommandées :
   - Parties.
   - Objet du contrat.
   - Description de la mission / périmètre.
   - Sécurité, données et confidentialité.
   - Limites de la prestation.
   - Prix et modalités de paiement.
   - Obligations des parties.
   - Absence de garantie de résultat automatique.
   - Confidentialité / propriété intellectuelle.
   - Résiliation.
   - Droit applicable & juridiction.
   - Signatures.

   Pour VividFlow, partir plutôt sur une structure `ARTICLE 1`, `ARTICLE 2`, etc. que sur une brochure commerciale. Le contrat doit être rassurant et rapide à lire.

4. **Rédiger les clauses business critiques**
   - Mettre les montants en chiffres et en lettres si possible.
   - Définir précisément le déclencheur du solde : signature, validation écrite, facture, encaissement, etc.
   - Si le solde dépend d'un événement (“premiers clients”), écrire une phrase robuste :
     > Le solde devient exigible dès validation écrite, signature commerciale, facture ou encaissement lié à un premier contrat client.
   - Ne pas promettre un résultat automatique : Client Delivery fournit cadre, méthodes, coaching et ressources ; le résultat dépend de l'exécution client.

5. **Produire en HTML → PDF**
   - Créer le HTML dans `/workspace/outputs/contracts/`.
   - Exporter avec Chrome headless :

```bash
/usr/bin/google-chrome --headless=new --no-sandbox --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf=/workspace/outputs/contracts/<slug>.pdf \
  file:///workspace/outputs/contracts/<slug>.html
```

6. **QA obligatoire**
   - `pdfinfo <file>.pdf` : vérifier pages, A4, non chiffré.
   - `pdftotext <file>.pdf - | grep -E "<mots clés>"` : vérifier que les éléments demandés existent.
   - Générer une preview première page avec `pdftoppm` et vision QA :

```bash
mkdir -p /tmp/contract-preview
pdftoppm -png -f 1 -singlefile -r 120 <file>.pdf /tmp/contract-preview/page1
```

   - Vérifier visuellement : logo/wordmark visible, texte lisible, pas de chevauchement, pas de contenu coupé.

7. **Livraison Telegram**
   - Réponse courte.
   - Inclure `MEDIA:/absolute/path.pdf`.
   - Lister les points inclus et QA faite.

## Post-Contract Email Pattern

When Jonathan asks to send a VividFlow contract/proposition to a Swiss TPE/PME prospect:
- Draft first and wait for validation unless he explicitly says “envoie”.
- Keep the email short; avoid long process explanations.
- Attach the PDF contract/proposition and include the Vercel/client recap link if available.
- Ask the client to return the signed contract by email.
- After validation/signature, do **not** say “bloquer un créneau” as the immediate next step unless Jonathan asks. Preferred flow: send the **formulaire d’intégration**, then the client reserves a slot via the site for kick-off + audit with the relevant collaborators.

Example concise wording:
```text
Bonjour <Prénom>,

Merci encore pour notre échange.

Comme convenu, vous trouverez en pièce jointe la proposition d’accompagnement entre VividFlow et <Client>.

Vous pouvez également retrouver ici le récapitulatif de ce que nous avons vu ensemble :
<link>

Si tout est bon pour vous, vous pouvez simplement nous retourner le contrat signé par email.

Une fois le contrat validé, nous vous transmettrons votre formulaire d’intégration. Vous pourrez ensuite directement réserver un créneau via notre site pour l’appel de kick-off et l’audit de votre entreprise, avec vous et les collaborateurs concernés.

Bien à vous,
Jonathan Zekhe
VividFlow
```

For a corrected version:
```text
Petite correction : il y avait une erreur dans la version précédente du contrat.
Vous trouverez en pièce jointe la bonne version rectifiée.
Merci de bien prendre en compte cette version pour signature.
```

## VividFlow Swiss Client Contract Pattern

For VividFlow client contracts in Switzerland, use the reusable defaults in `references/vividflow-swiss-contract-defaults.md` before leaving legal identity fields blank. Key points:
- Prestataire: **VividFlow LTD**, société de droit anglais, siège social **71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom**, représentée par **Jonathan Zekhe**.
- If work is sold/delivered from Switzerland while the company seat is in the UK, state that the company has activity/intervention in Switzerland where relevant.
- Include a **Droit applicable et juridiction** section with **droit suisse** when Jonathan asks for Swiss client contracts.
- Do **not** add a visible “relecture juridique / note de validation” warning by default in client-facing PDFs for Jonathan; it slows the closing process and can create unnecessary doubt. If legal caveats are needed, keep them internal in the final assistant note, not in the contract PDF, unless Jonathan explicitly asks to include them.

## VividFlow Contract Pattern

Use this when Jonathan asks for a VividFlow client contract/proposition.

Known prestataire identity:
- **VividFlow LTD**, société de droit anglais.
- Siège social : **71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom**.
- Représentée par **Jonathan Zekhe**.
- Mention useful if relevant: activité commerciale exercée notamment en Suisse.

Default legal clause for Swiss activity:
> Le présent contrat est régi par le droit suisse. Tout litige sera soumis aux tribunaux compétents en Suisse, sous réserve des règles impératives applicables.

Style:
- classic contract, article-based, not a colorful sales deck;
- minimal header, no heavy cards/badges;
- white background, black/grey typography, clear spacing;
- concise clauses; avoid bloated descriptions.

Old signed contracts provided by Jonathan are often **reference material only**: use identity wording and legal clause style, not the old commercial offer, unless he explicitly asks to reuse the offer.

## ClientOps Incubateur Offer Pattern

Pour une offre Incubateur ClientOps avec paiement `2 000 € + 2 000 € à la signature des premiers clients`, inclure explicitement :

- 4 coachings collectifs hebdomadaires ;
- coachings individuels 1-1 ;
- étapes clés en vidéo ;
- communauté Discord privée ;
- ressources opérationnelles/templates/checklists ;
- prix total 4 000 € ;
- paiement initial 2 000 € ;
- solde 2 000 € exigible à la signature/validation/facturation/encaissement des premiers clients.

## Design Pattern

- For generic ClientOps docs: fond crème/warm, page blanc cassé, bordures beiges, accent orange ClientOps can work.
- For **VividFlow contracts**: prefer the lightweight article-based template in `templates/vividflow-simple-contract.html`.
- Header with simple wordmark/logo à gauche, métadonnées minimalistes if needed.
- Encadrés only for pricing or critical terms; avoid heavy cards everywhere.
- Signature in two blocks side by side.
- Pas de tables Markdown : HTML/CSS propre.

### VividFlow / Suisse — contrat sobre préféré

Quand Jonathan demande un contrat client VividFlow, privilégier une direction proche d’un contrat classique : blanc, typographie simple, articles courts, peu d’encadrés. Éviter les documents “premium” trop chargés visuellement ou trop lourds en informations. Utiliser `templates/vividflow-swiss-contract-simple.html` comme base.

Règles spécifiques :
- Identité prestataire : `VividFlow LTD`, société de droit anglais, siège social `71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom`, représentée par Jonathan Zekhe.
- Activité Suisse : inclure une clause `Droit applicable & juridiction` indiquant que le contrat est régi par le droit suisse.
- Un ancien contrat signé peut servir de référence de forme, identité et droit applicable, mais ne jamais reprendre son ancienne offre commerciale si Jonathan dit que l’offre n’est plus utilisée.
- Ne pas ajouter de “note de validation”, “relecture juridique recommandée” ou champ “à compléter avant signature” dans le document client sauf demande explicite : cela peut ralentir la signature.
- Garder la substance utile : objet, mission, sécurité/confidentialité, limites, prix/paiement, obligations, absence de garantie de résultat, propriété intellectuelle, résiliation, droit applicable, signatures.

## Common Pitfalls

1. **Utiliser le mauvais logo.** Un asset “IAO Mastermind” n'est pas automatiquement le logo ClientOps.
2. **Oublier le déclencheur du solde.** Le contrat doit dire quand les 2 000 € restants deviennent dus.
3. **Inventer SIRET/adresse/immatriculation.** Si l'utilisateur demande une structure type `ClientOps AI Consulting FZCO`, chercher d'abord dans wiki/outputs/root + web si disponible. Si aucune source fiable ne confirme license/registration/adresse, laisser explicitement `à compléter` dans le contrat au lieu de fabriquer. Exception VividFlow: utiliser les informations validées dans `references/vividflow-swiss-contract-defaults.md` au lieu de mettre des placeholders visibles.
4. **Faire trop juridique.** Le document doit être signable et compréhensible, pas un mur de jargon.
5. **Ne pas vérifier le PDF.** Un HTML joli peut exporter en 3 pages coupées. Toujours `pdfinfo`, `pdftotext`, preview image + vision QA.
6. **Ignorer une coupe visuelle détectée par QA.** Si la preview montre du contenu coupé en bas de page, patcher le HTML avec un `page-break-before` / section break propre, ré-exporter, puis relancer `pdfinfo` + preview vision avant livraison.
7. **Oublier l'après-document.** Pour une propale/contrat issue d'un R2, produire aussi un draft mail prêt à copier/envoyer et mettre à jour le Second Brain : page entité, `wiki/index.md`, `wiki/log.md`.
8. **Surcharger les contrats VividFlow.** Pour Jonathan, un contrat client VividFlow doit rester sobre et proche d’un contrat classique. Trop d’encadrés, trop de design ou une note de validation finale donnent une impression lourde et peuvent ralentir la signature.
9. **Confondre ancien contrat et offre actuelle.** Un ancien contrat signé peut aider pour l’identité VividFlow et le droit suisse, mais son offre commerciale peut être obsolète ; ne pas la réutiliser sans confirmation.

## Final Response Format

```text
Contrat PDF prêt : MEDIA:/workspace/outputs/contracts/<file>.pdf

Inclus :
- ...

QA faite : PDF A4, texte lisible, branding visible, éléments demandés présents.
```
