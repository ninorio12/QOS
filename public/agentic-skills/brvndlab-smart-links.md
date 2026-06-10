---
name: brvndlab-smart-links
description: Logique produit, data, UX et règles de développement du module Smart Links Brvndlab. À charger avant toute intervention sur /smart-links, /r/[slug], tracking, leads attribution ou domaines custom.
---

# Brvndlab Smart Links

## Quand utiliser

Charge ce skill avant de toucher à :
- `/smart-links` ;
- `/r/[slug]` ;
- `convex/tracking.ts` ;
- `trackingLinks`, `trackingVisitors`, `trackingTouchpoints` ;
- attribution contenu vers vente ;
- domaines custom ;
- geo tracking ;
- Leads / Heat Score liés à un clic.

Charge aussi `brvndlab-product-brief` et `brvndlab-ui-design` pour tout UI.

## Rôle stratégique

Smart Links est le différenciateur T2 de Brvndlab face à Trakyo/Cook.

Promesse : attribuer chirurgicalement une vente Stripe/Whop à une source de publication précise.

Sans Smart Links : l’infopreneur sait qu’il a généré du cash, mais ne sait pas quel contenu a créé la vente.
Avec Smart Links : il voit qu’une vidéo, story, email, pub ou bio précise a généré clics, leads, bookings et ventes.

## Concept

Un Smart Link = un lien tracké unique par source de publication.

Exemples de sources :
- Vidéo YouTube X ;
- Story Instagram du 5 mai ;
- Bio TikTok ;
- Pub Meta ;
- Email newsletter ;
- Post LinkedIn.

Un Smart Link pointe vers une destination habituelle :
- booking iClosed/Calendly ;
- page de vente ;
- lead magnet ;
- newsletter ;
- Whop ;
- Systeme.io ;
- affiliation.

Règle scellée : 1 lien par source. Ne jamais fusionner deux contenus dans le même Smart Link, sinon attribution perdue.

## Logique data

Backend :
- `convex/tracking.ts` ;
- `convex/businessHandle.ts` ;
- `convex/customDomains.ts` ;
- redirect route `/r/[slug]`.

Exports critiques consommés par `/smart-links` et `/smart-links/domain` :
- `businessHandle.getMyHandle`, `suggestHandle`, `checkHandleAvailability`, `sealBusinessHandle` ;
- `tracking.createLinksMulti`, `listGroupedByPlatform`, `listLinksWithStats`, `deleteLink`.

Ne jamais déployer Convex après un changement Radar/cron sans vérifier que ces exports Smart Links existent encore. Un export manquant casse la page même si le frontend n'a pas bougé.

Tables :
- `trackingLinks` : slug, destinationUrl, platform, funnel, contentItemId, ownerClerkUserId.
- `trackingVisitors` : visitorId, email, intent, heatScore.
- `trackingTouchpoints` : click, opt_in, booking, sale, country, amount.
- `customDomains` : domaines user, DNS status.

`clerkUserId` pivot universel mais toujours obtenu via `ctx.auth.getUserIdentity().subject`, jamais en arg client.

`visitorId` est un string custom qui survit aux merges anonyme vers identifié.

## Redirect critique

Route publique : `/r/[slug]`.

Flow :
1. visiteur clique Smart Link ;
2. `/r/[slug]` capture referrer, UA, country via `x-vercel-ip-country` ;
3. insertion touchpoint type `click` ;
4. recalcul Heat Score ;
5. redirect vers destination ;
6. si opt-in/booking/sale plus tard, webhooks iClosed/Calendly/Stripe/Whop enrichissent le visiteur.

Ne jamais casser `/r/[slug]`.
Ne pas protéger cette route par Clerk : elle est publique par design.

## Geo tracking

Geo top 5 pays seulement.
Source réelle : `trackingTouchpoints` type `click` avec `country`.
Pays via headers Vercel `x-vercel-ip-country`.
Drapeaux emoji par regional indicators.

Ne jamais afficher pays, visiteurs, cartes, pourcentages ou géo si la data backend réelle n’existe pas.

## Domaines

Default domain : `brvnd.co/@username/slug`.
Custom premium : `go.tonsite.com/slug`.
Phase 1 : DNS verification CNAME + TXT via Cloudflare DoH.
Cron DNS verification chaque minute jusqu’à active.
Phase 2 roadmap : HTTPS auto via Vercel Domains API.

Domaine custom = configuration avancée/secondaire. Ne pas forcément l’afficher comme section permanente sur la page principale si ça crée du bruit.

## Sources et destinations

Destinations canoniques du brief :
- Booking ;
- Newsletter ;
- Lead magnet ;
- Ventes ;
- Affiliation.

Plateformes canoniques :
- YouTube ;
- Instagram ;
- TikTok ;
- LinkedIn ;
- X ;
- Email ;
- Web.

Communauté/Autre retirées.

Attention : les destinations ne doivent pas être pluralisées en BD avec leurs variants. La liste reste canonique, les liens portent la source.

## UX page principale

La page principale doit suivre la lecture du mockup final, car ce mockup est une spécification de logique produit, pas une simple inspiration visuelle.

Hiérarchie canonique :
1. **Nouveau lien tracké** : action principale, promesse `1 bouton · 2 questions`.
2. **Tous mes liens** : liste réelle des Smart Links, coeur business.
3. **D’où viennent tes visiteurs** : géo uniquement quand vraie donnée click/country disponible, sinon état vide sobre.
4. **Destinations habituelles** : configuration secondaire des URLs finales.
5. **Domaine custom** : configuration avancée/secondaire.

Le modal de création doit rester en 2 questions :
1. **Vers quelle destination ?** choisir une destination habituelle existante.
2. **Où vas-tu coller ce lien ?** champ libre de contexte de publication. Exemples : vidéo YouTube, story Instagram, pub Meta, bio, newsletter.

L’automatisation attendue : `createLinkAuto` utilise ce contexte pour deviner la plateforme, générer le slug et créer le lien tracké. Ne pas transformer YouTube/Instagram en sources à configurer séparément tant que le mockup final ne le demande pas.

À afficher selon contexte :
- titre sobre ;
- action principale évidente ;
- liste réelle des liens ;
- état vide propre ;
- destinations/domaine dans les bonnes sections, pas comme coeur de page ;
- éventuellement métriques réelles si présentes, jamais fictives.

À éviter en permanence :
- inventer une nouvelle architecture type `Sources → Destinations → Smart Links` si le mockup final dit autre chose ;
- faire passer `Configurer une destination` pour l’action principale ;
- gros guide ;
- pédagogie visible ;
- données géo globales si elles appartiennent au détail d’un lien ou si aucun agrégat réel n’existe ;
- filtres/catégories visibles s’ils n’aident pas l’action réelle ;
- data de mockup ;
- fake visiteurs, fake pays, fake montants.

## Détail d’un Smart Link

La fiche détail idéale peut contenir :
- nom ;
- slug public ;
- destination ;
- source/contenu ;
- clics ;
- visiteurs ;
- pays ;
- appareils ;
- referrers ;
- conversions ;
- timeline ;
- ventes attribuées ;
- relation avec Leads ;
- relation avec Mémoire dorée.

N’afficher ces données que si elles existent réellement. États vides par sous-section.

## Heat Score et parcours

Exemple logique :
- click Smart Link : Heat Score +5, intent cold ;
- opt-in/booking : enrichit email, score monte ;
- sale Stripe/Whop : intent client, score 100 verrouillé ;
- sale apparaît dans Transactions, Leads, Dashboard cash 7j.

Le cash ne vient pas de iClosed/GHL. Cash = Stripe + Whop only.

## Mockups Smart Links

Mockup canonique déclaré : `https://brvndlab-mockups.vercel.app/brvndlab-smart-links-final`.
Autres références :
- volume adaptive : `/brvndlab-smart-links-volume` ;
- deck : `/brvndlab-smart-links-deck` ;
- tracking evolution : `/brvndlab-tracking-evolution` ;
- sources : `/brvndlab-sources`.

Important : Jonathan a ensuite recadré l’interprétation. Le mockup est intention/structure, pas permission d’afficher de fausses données comme état prod.

Référence session : `references/session-2026-05-07-creation-flow.md` documente la refonte v1, les tests, le piège snapshot about:blank et le nettoyage des placeholders hérités.
Référence session : `references/session-2026-05-07-final-mockup-flow-correction.md` documente la correction Jonathan : le mockup final est la logique de lecture système, avec `Nouveau lien tracké → Tous mes liens → Géo → Destinations → Domaine`, et le modal `Vers quelle destination ?` + `Où vas-tu coller ce lien ?`.
Référence session : `references/session-2026-05-20-smartlinks-convex-regression.md` documente la régression où un deploy Convex non-Smart-Links a cassé `/smart-links` via exports manquants `businessHandle`/`tracking`, avec fix et smoke tests.

## Erreurs à ne jamais reproduire

- Copier des données de mockup comme si elles étaient actives.
- Afficher pays/visiteurs globaux sans backend réel.
- Confondre destination et Smart Link.
- Afficher toutes les configurations comme sections principales.
- Fusionner plusieurs contenus dans le même Smart Link.
- Casser le redirect `/r/[slug]`.
- Oublier `x-vercel-ip-country`.
- Créer des catégories/filtres qui brouillent la logique.
- Ajouter du texte pédagogique permanent.
- Réintroduire Communauté/Autre sans validation.
- Se limiter au snapshot initial : cliquer les CTAs et vérifier les modals, car des placeholders hérités peuvent n’apparaître qu’après interaction.
- Scanner uniquement la page modifiée : les exemples visibles peuvent vivre dans des composants enfants (`DestinationsManager`, `CustomDomainSection`, helpers) et réapparaître en prod.

## Tests obligatoires

Frontend simple :
- eslint ciblé ;
- tests ;
- build avec env ;
- smoke `/smart-links` ;
- smoke `/smart-links/domain` dès que `businessHandle` ou Convex est déployé ;
- console navigateur ;
- vérifier absence d'ErrorBoundary Convex et d'exports manquants ;
- vérification visuelle ;
- smoke interactif des modals/actions primaires : ouvrir `Destinations`, `Ajouter une destination`, `Nouveau lien` si concerné ;
- scanner aussi les composants importés, pas seulement `page.tsx`, pour retirer placeholders et exemples sales (`iClosed`, `jonathan`, domaines personnels, montants/pays/mockup).

Si redirect/tracking/backend touché :
- tester création lien ;
- curl `/r/[slug]` ou navigation live ;
- vérifier 302 ;
- vérifier touchpoint Convex ;
- tester au moins 2 payloads indépendants ;
- ne pas continuer si erreur backend sans root cause + 3 tests.

## Social post watchlist sans Smart Link

À distinguer strictement du tracking Smart Links : un post Instagram/TikTok/LinkedIn random sans Smart Link ne permet pas d’attribuer des ventes business. Il peut seulement être **observé**.

Pattern MVP viable :
- l’utilisateur colle l’URL publique d’un post/reel ;
- Brvndlab crée une fiche `Post observé` ;
- bouton UI : **Actualiser les performances** / **Dernier scan** plutôt que “temps réel” ;
- le bouton déclenche Hermes/agent navigateur en production, pas Claude Code ;
- Hermes lit uniquement les métriques visibles publiquement : vues si visibles, likes, commentaires, caption, date, screenshot preuve ;
- Brvndlab stocke des snapshots datés et calcule croissance 24h/J3/J7 + score de traction.

Positionnement produit : **Watchlist de contenus** ou **Radar de posts observés**, jamais “analytics Instagram connecté” sans API officielle.

Cadence recommandée : on-demand, quotidien, ou toutes les 6h pendant quelques jours après publication. Éviter toute promesse de vrai temps réel et tout scraping agressif.

Claude Code / Atlas Dev sert à construire la feature ; Hermes sert à exécuter les scans ; Brvndlab reste l’UI, la base de données et le dashboard.

## Garde-fous

- Auth Convex via backend uniquement.
- Pas de fake data prod.
- Pas d’action destructive sur tracking sans validation Jonathan.
- Pas de migration schema sans audit indexes.
- Pas de prod deploy sans validation locale + smoke live.
- Ne pas confondre observation visible d’un post social avec attribution business : sans Smart Link ou webhook de vente, aucune vente ne peut être reliée au post.
