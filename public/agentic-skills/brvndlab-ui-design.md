---
name: brvndlab-ui-design
description: Règles UI/UX/design Brvndlab. À charger avant tout travail frontend, page, composant, mockup ou polish visuel Brvndlab.
---

# Brvndlab UI Design

## Règle absolue

Tout frontend Brvndlab doit passer par la logique design Brvndlab avant code.

Si `gemini-design-mcp` est disponible, il est obligatoire pour :
- création frontend ;
- modification frontend ;
- snippet frontend ;
- audit UI ;
- comparaison mockup/prod.

Outils déclarés côté Claude : `create_frontend`, `modify_frontend`, `snippet_frontend`.

Si Gemini Design MCP n’est pas connecté dans Hermes, annoncer le manque avant toute refonte UI sensible et limiter Hermes au backend/data ou à des corrections UI triviales validées.

## Philosophie

Brvndlab = SaaS premium mature, pas démo flashy.

Principes :
- less is more religion ;
- old money premium ;
- light mode par défaut ;
- noir profond ;
- typo légère, jamais lourde ;
- accents champagne/orange discrets ;
- silence visuel valorisé ;
- zéro redondance ;
- une intention claire par écran.

Avant livraison, appliquer le test :
> Qu’est-ce que je peux supprimer ?

## Les 6 principes UI/UX fondamentaux

1. Dynamique à l’arrivée : chaque carte/élément arrive subtilement, pas de mur figé.
2. Intuitif : action principale évidente au premier regard.
3. Épuré : pas de bruit visuel, espace respecté.
4. Minimaliste : tout élément non utile à comprendre ou agir est retiré.
5. Dynamique en interaction : hover, transition, loading state, retour immédiat.
6. Skeleton loading systématique : jamais de spinner muet.

Checklist 6/6 obligatoire avant livraison UI.

## Règles de copy in-app et d’échange produit avec Jonathan

Pour Jonathan, surtout en audit produit Brvndlab : faire simple. Quand il demande de clarifier une logique complexe, répondre d’abord en 2-4 blocs courts, sans long prompt complet. Utiliser des distinctions simples du type “Source = matière de départ / Format = résultat final”. Ne donner un prompt Claude long que s’il le demande explicitement.

À faire :
- français de France ;
- “on” / “nous” / “ton” / “ta” / “tes” ;
- chirurgical + humain ;
- phrases courtes ;
- une phrase maximum entre titre et bouton sur écran premium ;
- descriptions uniquement si elles guident une action nécessaire.

À éviter :
- sous-texte sous titre de section ;
- blabla pédagogique permanent ;
- phrases onboarding visibles en permanence ;
- jargon technique ;
- ton agence administrative ;
- math salesy ;
- “je”, “mon”, “ma” ;
- em dashes ;
- mots béquilles : truc, machin, chose, bidule ;
- québécois : gym, magasiner, canceller.

## Mobile camera / download UX

Quand Brvndlab guide une capture vidéo mobile :
- ne jamais ajouter un bouton de confirmation parasite après une action système iOS/Android ; Jonathan rejette le flow “Télécharger puis cliquer encore pour confirmer” ;
- ne pas afficher un toast de succès au simple clic si le téléphone ouvre encore une feuille native de téléchargement/partage ; le feedback doit correspondre à une action réellement terminée ou à une étape assumée du produit ;
- privilégier un CTA unique et net : accepter la question → ouvrir caméra ; si iOS/Android propose déjà “Utiliser la vidéo / Reprendre”, ne pas recréer ensuite le même choix avec “Recommencer / Terminer” ;
- après retour de capture native acceptée, considérer la prise comme validée côté Brvndlab, afficher un feedback court (“Prise validée 🎉”) puis revenir à `/content` ;
- éviter les flows qui mélangent download navigateur + toast + redirection automatique, car iOS peut intercaler une feuille native et rendre l’expérience incohérente ;
- qualité vidéo : ne jamais réencoder, compresser, canvaser ou passer par `MediaRecorder` si l’objectif est “qualité originale/max”. Garder le fichier brut fourni par iOS/Android via capture native ;
- être transparent en interne : le web mobile ne garantit pas la qualité exacte de l’app Caméra iPhone/ProRes/Cinematic. Si Jonathan exige cette garantie stricte, la bonne réponse produit est app native iOS, pas bricolage navigateur.

Référence détaillée : `references/mobile-video-capture-ux.md`.

## Anti-patterns design

Interdits :
- gros glow orange ;
- startup flashy ;
- typo bold massive sur landing premium ;
- avatars/pastilles d’initiales sur leads/prospects/clients/transactions ;
- duplication de KPI ;
- filtres ou catégories visibles si la logique produit ne les justifie pas ;
- sections permanentes pour de la configuration secondaire ;
- mockup copié avec fausse data active ;
- spinner muet ;
- refonte d’un module validé sans demande explicite.

## Patterns visuels réutilisables

### Modals
- Small 480px.
- Medium 720-860px.
- Large 1080px max desktop.
- Full-screen mobile.
- Backdrop : `bg-black/40 backdrop-blur-sm`.
- Esc to close.
- Click extérieur ferme sauf formulaire non sauvegardé.

### Drawers
- Right-side.
- 480-640px desktop.
- Full-screen mobile.
- Header sticky avec close + titre.

### Empty states
- Icon dans cercle 56px.
- `rounded-2xl bg-orange-50`.
- Titre H3.
- Sous-titre 1-2 lignes max.
- CTA primaire orange si action pertinente.

### Skeletons
Obligatoires pour chaque `useQuery` undefined.

Pattern :
```tsx
{data === undefined ? <Skeleton /> : data.length === 0 ? <EmptyState /> : <List />}
```

Skeleton = dimensions exactes du contenu réel, `bg-slate-100 animate-pulse`, pas de saut layout.

### Pills
Container : `inline-flex p-1 bg-white rounded-xl border border-black/[0.04] gap-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]`.
Active : `bg-[#1A1A2E] text-white px-3.5 py-2 rounded-lg text-[11.5px] font-bold`.

### Cards / Bento
Standard : `bg-white border border-black/[0.04] rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),0_10px_30px_-15px_rgba(148,163,184,0.12)]`.
Frosted : `bg-white/80 backdrop-blur-lg rounded-[28px] p-6 shadow-xl shadow-slate-200/50`.
Dark accent : `bg-[#1A1A2E] rounded-[28px] p-6 text-white`.

### Animations
Framer Motion fade-up/stagger subtil :
```tsx
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.04 }}>
```

### Iconographie
Lucide React uniquement.
Sizes 13-18px.
Stroke 2, ou 2.5 pour accents.

### Typography scale
10, 11, 11.5, 12, 12.5, 13, 14, 15, 16, 18, 20, 22, 26, 28, 32, 36, 42.

## Interprétation des mockups

Mockups = source de structure, intention, flow, hiérarchie.
Mockups ≠ permission d’inventer data prod.
Mockups ≠ design final si le brief dit phase UX finale via Gemini/21st.dev.

Avant d’implémenter :
1. Identifier le mockup canonique et son statut.
2. Distinguer data réelle, data d’exemple, état futur, état vide.
3. Vérifier la page live voisine pour les patterns.
4. Supprimer ce qui est seulement démonstratif.
5. Ne garder visible que ce qui sert l’action principale.

## Workflow UI obligatoire

1. Charger `brvndlab-product-brief` + `brvndlab-ui-design`.
2. Lire le brief local si besoin : `/Users/businessmanagement/.hermes/cache/HERMES-BRIEF.md`.
3. Vérifier si Gemini Design MCP est connecté.
4. Auditer page live + composants existants.
5. Identifier mockup canonique.
6. Brainstorm UX avant code.
7. Si changement significatif : produire ou consulter mockup HTML.
8. Implémenter avec Gemini MCP si disponible.
9. Ne modifier que le scope demandé.
10. Eslint ciblé, type check fichiers touchés, tests, build.
11. Smoke test live et console navigateur.
12. Confirmation avec URL.

## Cas où demander validation Jonathan

Demander validation avant :
- refonte d’un module validé ;
- changement de logique produit ;
- modification de copy publique critique ;
- auth, paiement, données critiques ;
- nouveau coût ;
- usage d’un outil design non connecté qui bloque la qualité.

Ne pas demander pour :
- bug UI mineur ;
- correction de typo ;
- alignement spacing évident ;
- suppression de bruit non fonctionnel validée par les règles.
