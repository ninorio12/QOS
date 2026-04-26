# Devis Cards Redesign — Design Spec

## Contexte

Le module devis affiche actuellement des cards avec une vignette PDF CSS générique (header noir/lime SOREN) qui ne correspond pas au vrai template PDF généré par APITemplate. L'utilisateur veut que la vignette miniature soit fidèle au vrai PDF, que les cards soient bien intégrées dans le module (centrées), et qu'un bouton "Aperçu" permette d'ouvrir le PDF.

## Décisions de design

**Layout cards :** scroll horizontal (option A). Quand 1-2 cards, elles sont centrées dans le module. Quand plusieurs, scroll gauche→droite naturel avec la dernière card partiellement visible pour indiquer le scroll.

**Vignette PDF :** miniature CSS fidèle au vrai template PDF Soren :
- Fond blanc (document)
- Header gauche : icône maison CSS (border brand color) + texte "SOREN" en gras + tagline
- Header droite : "DEVIS N°xxx" en couleur brand (orange `#d28e46`)
- Body : ligne "Objet : [titre]" + tableau simulé (header en brand color, 3-4 lignes données)
- Footer : barre brand color avec infos légales simulées
- Tout ça sur fond sombre (#111) dans la card — contraste fort

**Bouton aperçu :** badge glassmorphism "Aperçu ↗" en bas à droite de la zone vignette, visible en permanence si `pdfUrl` existe. Clic → ouvre le PDF dans un nouvel onglet. Si pas de PDF : état "PDF non généré" avec icône.

**Composant PdfThumbnail mis à jour :**
- Props : `pdfUrl`, `numero`, `titre`, `brandColor`, `montantTtc`
- Rendu fidèle au buildDevisHtml (même structure visuelle à échelle mini)
- Bouton "Aperçu ↗" uniquement si `pdfUrl` non null

**DevisListView mis à jour :**
- Zone cards : `flex items-center` (centrage vertical) + `justify-center` quand peu de cards, scroll horizontal quand débordement
- Passe `titre` et `brandColor` au PdfThumbnail (brandColor depuis les settings entreprise ou fallback `#d28e46`)
- Fond de la zone thumbnail : `#111` (contraste avec le document blanc)

## Fichiers modifiés

- `src/components/devis/PdfThumbnail.tsx` — refonte complète
- `src/components/devis/DevisListView.tsx` — centrage + passage des nouvelles props
- `src/app/devis/page.tsx` — fetch brandColor depuis company_settings

## Non concerné

- DevisDetailView, SignatureSection, RelancesSection, StatsSection — pas touchés
- API routes — pas touchées
- Template PDF réel (apitemplate.ts) — pas touché
