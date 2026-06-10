---
name: brvndlab-product-brief
description: Source de vérité produit Brvndlab. À charger avant toute décision produit, refonte de module, priorisation ou question sur la logique business du SaaS.
---

# Brvndlab Product Brief

## Quand utiliser

Charge ce skill avant toute tâche Brvndlab qui touche :
- logique produit ou UX d’un module ;
- priorisation roadmap ;
- interprétation d’un mockup ;
- wording in-app ;
- tracking, leads, analytics, Brand OS, Smart Links ;
- arbitrage entre ce qui doit être visible, caché, reporté ou supprimé.

Source complète locale : `/Users/businessmanagement/.hermes/cache/HERMES-BRIEF.md`.
Brief public : `https://brvndlab-mockups.vercel.app/hermes-brief`.

## Vision

Brvndlab est l’OS de la marque personnelle pour infopreneurs, consultants, coachs, experts high-ticket francophones qui font environ 10 k€ à 200 k€ par mois.

### Cadrage RMS / Content OS livré

Quand Jonathan parle de vendre Brvndlab/RMS “dans ce contexte”, ne pas le recadrer comme SaaS public. Le cadrage validé est : **infrastructure privée livrée au client pour créer, organiser et piloter du contenu localement**.

Le socle vendu n’est pas :
- un SaaS multi-tenant avec consommation IA portée par VividFlow ;
- une agence ;
- une équipe montage/communication ;
- un abonnement IA illimité ;
- un remplacement de Meta Business Suite ou TikTok Analytics.

Le client utilise ses propres comptes/outils/abonnements et leurs limites : Claude/Claude Code/Hermes, navigateur, réseaux sociaux, YouTube, Stripe, Whop. VividFlow peut accompagner l’usage/configuration, mais les quotas, blocages et limites des plateformes tierces restent côté client.

Brvndlab n’est pas :
- une agence ;
- un outil pour créateurs lambda ;
- un Skool bis ;
- un Notion packagé ;
- un CRM générique ;
- une suite de formulaires ;
- un réseau social ;
- une API d’intégration tierce ouverte.

Promesse dans ce cadrage : centraliser Brand OS, création de contenu, calendrier, Smart Links, stats visibles/locales, ventes Stripe/Whop et décisions dans une infrastructure premium livrée.

## Boucle de valeur centrale

La boucle à respecter partout :

1. Brand OS : source de vérité de l’identité.
2. Content : production de contenu ancrée dans le Brand OS.
3. Calendar : planification et bientôt publication native.
4. Smart Links : distribution trackée par source de publication.
5. Leads : visiteurs et prospects enrichis par touchpoints.
6. Heat Score : intention et priorité commerciale.
7. Transactions : ventes Stripe/Whop attribuées.
8. Mémoire dorée : intelligence marché anonymisée, Jonathan only.
9. Décisions : contenu, produit, vente, pricing, rétention.

Tout module doit servir cette boucle ou rester secondaire.

## Modules prod au 7 mai 2026

Livrés en prod :
- Brand OS : 12 modules, edit, completion, seed.
- Dashboard : cockpit quotidien, pas onboarding. Doit montrer état du système, production actuelle, calendrier, distribution, business attribué et signaux utiles actionnables. Supprimer/masquer checklist setup, Brand OS permanent non actionnable et blocs vides. Les CTA doivent pointer directement vers l’objet précis, pas une page parent suivie d’une redirection.
- Contents : bibliothèque/contenus/assets/éléments de contenu. Label visible validé : “Contents”, pas “Création de contenu” ni “Content OS”.
- Pipeline : page/section individuelle séparée de Contents. Label visible validé : “Pipeline” seulement. Sert au suivi du processus de production, étapes, statuts, contenus à faire avancer.
- Content creation : atelier de création clair, pas une liste de boutons. Séparer les **sources de départ** (brainstorm, idée/direction, inspiration, vidéo déjà filmée, Journal, Question audience) des **formats de sortie** (script complet, bullet points, réponse spontanée, carrousel, story, clip). Brand OS/Brand DNA nourrit la cohérence quand `brandOsGuided` est true; Journal nourrit la matière vivante/récente quand `journalGuided` est true.
- Question audience : ancien Q&A à recadrer. Brvndlab propose une question pertinente comme si elle venait de l’audience; l’utilisateur peut Passer, Garder ou Répondre. Usage prioritaire short-form/story/post court, pas long-form ni tunnel lourd. Questions guidées par Brand OS + Journal si activés, jamais random générique.
- Calendar : calendrier éditorial.
- Analytics : feed YouTube, drill-down comments, KPI business, filtres, URL state.
- Radar : signaux live, briefs, brainstorm 3 étapes, actions de scan/enrichissement. Le scraping/scan continu doit rester désactivé tant que quotas/cache/logs coûts/model router ne sont pas en place ; privilégier manuel/on-demand.
- Smart Links : slug auto, redirect `/r/[slug]`, tracking, domaines custom, volume UI, onboarding.
- Leads : visitors, fiche 3 tabs, Heat Score, call logs.
- Transactions : Stripe + Whop only, drawer journey.
- Messaging : collaborateurs uniquement, jamais clients.
- Collaborateurs : invite, revoke, re-invite Resend.
- Coach : legacy à challenger.
- Settings, Journal, Affiliation, Pricing, Résiliation, pages légales, Admin, Mémoire dorée Jonathan only.

Intégrations live : Stripe, Whop, Calendly, iClosed, YouTube, Instagram OAuth post-MVP, TikTok OAuth post-MVP, Resend, crons Convex.

En queue : GHL, publication native YouTube/IG/TikTok dans Calendar, Custom Domains phase 2, bugs Calendar/Content, review timestampée, RAG Mémoire dorée.

Correction scellée Jonathan : GHL n’est PAS encore connecté. C’est la #4 des intégrations restantes sur la roadmap. Le filtre `BANKING_PLATFORMS = ["stripe", "whop"]` dans `tracking.ts`, `leadActions.ts` et `dashboards.ts` exclut iClosed, qui est connecté, ET GHL en préventif pour éviter tout doublon cash le jour où GHL sera activé.

## Décisions scellées

- Brand OS = source de vérité centrale, cœur/cerveau/âme de Brvndlab. Il doit nourrir toute création de contenu : audience, ton, identité, valeurs, mission, offre, positionnement, style, personas, problèmes/désirs/objections. Le contenu ne doit pas être générique ou déconnecté du client.
- Brand OS = source de vérité centrale, cœur/cerveau/âme de Brvndlab. Il doit nourrir toute création de contenu : audience, ton, identité, valeurs, mission, offre, positionnement, style, personas, problèmes/désirs/objections. Le contenu ne doit pas être générique ou déconnecté du client.
- Brand DNA = couche structurée exploitable du Brand OS pour les prompts futurs : query `getBrandDna`, agrégation sans LLM, fallback `rawByModule`, aucun contenu inventé. Le Brand OS stocke la vérité; le Brand DNA la rend utilisable.
- Création guidée par mémoire agentique : Brand OS + Journal + historique utile doivent fonctionner comme contexte invisible toujours actif dans les flows de création. Ne pas afficher de toggles “Brand OS activé / Création libre” ou “Journal activé / Sans Journal” dans l’UX de création; cela fait formulaire/outil et casse la sensation de sparring partner. L’agent décide en arrière-plan quoi utiliser selon la conversation, sans demander à l’utilisateur de choisir la source.
- Logique Contents : séparer les deux portes d’entrée “Je veux brainstormer” et “J’ai déjà une direction”. Les formats R1 validés sont : Vidéo courte, Vidéo longue, Carrousel, Post simple, Story. Plateformes R1 : Instagram, TikTok, YouTube, LinkedIn. Ne pas tracker YouTube Shorts en R1; éviter “Reels” comme catégorie principale si cela brouille LinkedIn/TikTok, même si le wording public peut rester familier.
- Brainstorming Contents : ce n’est pas une génération de 5 idées ni une sélection de format. C’est une conversation IA type sparring partner, ouverte par une phrase du style “Balance ce que tu as en tête. Même si c’est brouillon.” Pas de boutons initiaux “Brand OS / Journal / Marché / Spontané” : les sources sont invisibles. Pas de limite fixe; l’agent continue à reformuler, challenger et creuser jusqu’au pic de compréhension. Sortie seulement quand il tient un angle solide : vrai sujet, tension centrale, cible, problème/désir profond, angle différenciant, pourquoi maintenant, piste de contenu exploitable. La sortie est un Angle sauvegardé, exploitable ensuite en format concret.
- Question audience / questions-réponses spontanées : remplacer la logique “Session Q&A” par un mode rapide et spontané depuis Contents, indépendant du brainstorming et des Angles : question proposée, puis Passer/Garder/Répondre, avec chemin mobile-first vers caméra / face cam. Sorties possibles : vidéo spontanée, 3 bullet points, story ou post court. À réserver aux short-forms/stories; pas de script long ni long-form. `Angle → Questions` est une transformation future secondaire, pas le flow principal.
- Question audience R1 mobile : Brvndlab n’est pas une app caméra. Abandonner le flux web `<input capture>` pour la vidéo facecam premium : qualité Safari/iOS variable, sauvegarde souvent dans Fichiers, aucune garantie Photos. Flow validé : question acceptée → CTA “Ouvre la caméra et réponds” → écran tournage avec “Reviens ici quand c’est fait.” → CTA “J’ai filmé” → `markAnswered` fire-and-forget → overlay “Prise ajoutée 🎉” (~1300ms) → retour Contents. Aucun preview, téléchargement, upload, réencodage, bouton Instagram/monteur ou texte long qualité. La vidéo est tournée hors Brvndlab avec la caméra native du téléphone; app mobile compagnon seulement en R2 si usage récurrent fort.
- Prompt Question audience : les questions doivent rester collées à la direction donnée par l’utilisateur. Conserver explicitement les mots-clés du thème (objet, cible, effet : ex. “OnlyFans”, “jeunes filles”, “conséquences”, “sensibiliser”) dans chaque question ou presque. Ne pas élargir vers parents/école/société/débat méta sauf si l’utilisateur l’a demandé. Une bonne question est concrète, humaine, légèrement naïve, douloureuse, answerable en 30–90s facecam, et reconnaissable comme venant du thème utilisateur.
- Question audience — qualité minimale : les questions doivent ressembler à de vraies questions audience, pas à des titres LinkedIn/coaching génériques. Elles doivent être concrètes, humaines, légèrement naïves, douloureuses, faciles à répondre en facecam, et liées à une objection, un blocage, une décision ou une croyance. Exemples de niveau : “Pourquoi mes contenus attirent des likes mais pas de clients ?”, “Comment je parle de mon offre sans avoir l’air de vendre tout le temps ?”, “Comment je sais si mon problème vient de mon offre ou de ma manière d’en parler ?”.
- Question audience — caméra : pour R1 premium, ne plus utiliser de capture web. Un `<input capture>` mobile ne garantit ni qualité native, ni sauvegarde Photos, ni absence de friction Fichiers/preview. Le pattern validé est orchestration hors-app : CTA “Ouvre la caméra et réponds”, retour utilisateur, “J’ai filmé”, puis `answered_locally`. Pas d’upload serveur tant que le stockage vidéo n’est pas décidé; accept/camera/validation doivent rester zéro coût IA.
- Séparation stricte des modules : chaque module a une intention unique.
- Création cross-module via modal du module propriétaire, jamais duplication formulaire.
- Convex auth : `ctx.auth.getUserIdentity()`, jamais `clerkUserId` ou email depuis le client.
- Cash KPI = `trackingTouchpoints` type sale avec platform Stripe ou Whop uniquement. iClosed/GHL exclus.
- Pricing : 149 / 349 / 749 €, annuel -20 %.
- Offre / modèle économique : si Jonathan arbitre entre setup infrastructure et SaaS, distinguer clairement les deux perspectives. Pour cash immédiat et clients premium sur-mesure, setup privé 3k/5k/6k reste possible. Pour cash récurrent, valorisation et revente, privilégier SaaS opéré si les coûts IA sont contrôlés par workspace, quotas et modèle par feature. Ne pas vendre d’illimité IA : chaque plan inclut un volume/usage interne, puis upgrade de forfait si l’activité augmente.
- Gouvernance coût SaaS : préserver Sonnet sur les moments où le client ressent la qualité Brvndlab (brainstorming, angles, scripts, carrousels, hooks, Brand OS/profondeur créative). Optimiser avec Haiku seulement sur les tâches mécaniques/faible valeur perçue (reporting simple, stats, classification, notifications, extraction, tri). Règle Jonathan : optimiser les coûts sur l’opérationnel, pas sur la création.
- Pricing : 149 / 349 / 749 €, annuel -20 %.
- Offre SaaS vs infrastructure : si les coûts IA sont contrôlés par feature/workspace, privilégier le SaaS opéré pour MRR, rétention, valo et revente. Garder l’infrastructure privée one-shot comme offre premium/enterprise/sur-mesure, pas comme focus principal.
- SaaS Brvndlab : chaque plan doit inclure un volume IA interne/plafond invisible; pas d’illimité, pas de facture surprise au centime. Si l’usage augmente, pousser l’upgrade de forfait.
- Affiliation : 25 % à vie tous tiers, cookie 60j, validation 45j, Stripe Connect.
- Notifications = dernière étape SaaS.
- Publication native vit dans Calendar, pas dans Intégrations.
- Mémoire dorée = top secret, jamais mentionnée en UI publique.
- API d’intégration externe refusée définitivement.
- Brainstorming IA : si Jonathan impose “zéro API”, ne pas proposer/brancher Anthropic/OpenAI/OpenRouter par défaut. Auditer d’abord un bridge privé Brvndlab → VPS/Mac/Hermes/Claude Code CLI, admin-only, sécurisé, en assumant que ce n’est pas une solution SaaS standard tant que non validée.
- Gouvernance IA 2026-05 validée : Anthropic direct, pas OpenRouter/OpenAI/Opus, `aiGateway` central obligatoire, mapping modèle par feature sans fallback silencieux. Brainstorming = Sonnet uniquement; tâches légères futures (Question audience, stories/bullets, résumé Journal) = Haiku; analyse vidéo/PDF/image, Radar auto et recommandations dashboard IA = OFF tant que non validés. Toute consommation IA doit logger feature, model, tokens in/out, coût estimé, statut, durée, sans prompt/réponse.
- Brainstorming produit : ne pas le traiter comme “pré-script” jetable ni comme formulaire. Flow R1 validé : Contents → “Je veux brainstormer” → chat direct avec accroche variable → Lya creuse jusqu’à clarté, sans demander format/source/funnel au départ → “On tient quelque chose” → résumé structuré → sauvegarde automatique du brainstorm/angle → choix “Créer un contenu maintenant” ou “Le garder pour plus tard”. Brand OS + Journal sont mémoire agentique silencieuse dans ce flow; pas de toggles visibles. La section visible devient “Brainstorms sauvegardés” (URL `/angles` possible). Voir `references/brainstormer-r1-agentic-conversation-2026-05.md`.
- Brainstorms sauvegardés — cartes d’angles business : validé comme bibliothèque de cartes d’idées, pas liste de résumés texte. Chaque carte doit afficher une seule catégorie business parmi **Positionnement / Conversion / Autorité / Offre / Marché**, un titre substantiel, un point fort, et une perspective/alignement expliquant pourquoi l’angle mérite d’exister pour cette marque/audience/business. Interdits : formats de sortie (vidéo/carrousel/story/post), maturité Brute/Solide/Prête, scores visibles, résumé gris long, tags nombreux. Si un brainstorm est sauvegardé, il doit déjà être exploitable; ne pas afficher de statut de maturité. Objectif : moins de texte, plus de sens, scan rapide et envie d’ouvrir.
- Brainstorms sauvegardés — titres : ne pas optimiser “court pour court”. Le titre doit garder sujet + tension/thèse/promesse; un titre vague type “J’aimais le rap” est pire qu’un titre un peu long. Éviter les découpes heuristiques mécaniques (`:`/ponctuation) qui amputent la thèse. Le titre peut prendre plus de hauteur; le détail complet reste au clic.
- Brainstorms sauvegardés / cartes `/angles` : le titre doit être scannable mais substantiel. Ne pas faire “court pour faire court” et ne pas couper mécaniquement un ancien titre au `:` ou à la ponctuation si cela perd la thèse. Un bon titre garde sujet + tension/thèse/promesse, accepte 1–2 lignes, et alterne les formes (“Pourquoi…” autorisé mais pas systématique). Voir `references/brainstorm-card-title-quality-2026-05.md`.
- Titres de cartes “Brainstorms sauvegardés” : l’objectif est scannable **et substantiel**, pas “court pour court”. Ne pas couper mécaniquement au `:` ou à la première ponctuation si cela produit un fragment vide (“J’aimais le rap.”). Le titre doit garder la thèse/l’idée forte du brainstorm, même s’il prend 1–2 lignes. Alterner naturellement les formes (question, tension, observation, promesse, contraste), sans bannir ni surutiliser “Pourquoi…”. Voir `references/brainstorm-card-title-substance-2026-05.md`.

## Abandonné, ne plus suggérer

- Notion comme outil actif.
- Skool integration.
- Rôle Coach dans le SaaS public.
- Formulaires dans Intégrations.
- API d’intégration tierce.
- Avatars/pastilles initiales sur leads/prospects/clients/transactions.
- Supabase, Slack, Discord, shadcn/ui pour Brvndlab.

## Stack

Frontend : Next.js 16 App Router, React, TypeScript, Tailwind direct, Lucide, Framer Motion, Vercel.
Backend : Convex prod `accurate-cormorant-297.eu-west-1.convex.cloud`. Pour les `httpAction` publics Convex, utiliser l’URL HTTP régionale `.convex.site`, observée : `https://accurate-cormorant-297.eu-west-1.convex.site`.
Auth : Clerk, `auth.config.ts`, `requireCoach` pattern via founder emails.
Paiements : Stripe Connect, Whop.
Booking/CRM : Calendly, iClosed, GHL en cours.
Social : YouTube Data API v3, Instagram Graph, TikTok.
Email : Resend.
LLMs produit : Sonnet 4.6, Opus 4.6, Haiku 4.5 selon coût/valeur. Gouvernance obligatoire : aucun endpoint IA client sans auth serveur, logging coût/tokens, quota par user/workspace, budget cap et modèle par défaut économique. Ne pas optimiser les coûts au détriment des moments où le client ressent la qualité : création de contenus, brainstorming, angles, scripts, carrousels, hooks, Brand OS profond et reformulation premium doivent rester en Sonnet quand la profondeur compte. Haiku est réservé aux tâches mécaniques/faible valeur perçue : reporting simple, résumé de stats, classification, extraction, notifications, labels, tri/rangement et analyses cash basiques. Opus ne doit pas être le défaut SaaS client ; le réserver aux plans hauts, crédits premium ou livrables à forte valeur.
Radar créateurs publics : pas d’OAuth YouTube utilisateur ; utiliser une clé serveur `YOUTUBE_API_KEY`. OAuth YouTube appartient aux analytics du compte client, pas à la veille marché.

### Analytics RMS sans coûts sociaux privés

Pour le RMS/Content OS livré, la règle est : **mesurer ce que RMS possède ou peut observer gratuitement/localement**.

- YouTube : API officielle OK pour stats propres et raisonnables.
- Smart Links : stats internes OK, clics/visiteurs/source/conversions.
- Stripe/Whop : webhooks/API OK pour ventes attribuées.
- Instagram/TikTok : pas d’API privée/complexe par défaut ; utiliser uniquement stats visibles via snapshots Hermes/navigateur quand la page/post est accessible.
- Ne pas promettre temps réel : dire “mise à jour à la demande” ou “snapshots périodiques”.
- Ne pas promettre stats privées : impressions réelles, reach privé, saves, shares, démographie, watch time privé restent hors socle sauf mission/add-on explicite.

Transcript Radar : `kome.ai` puis `SearchAPI.io`. Apify est interdit et ne doit plus être utilisé ni proposé, y compris dans les routes API, actions Convex, fallbacks et crons.

## Outillage Jonathan

MCP/outils déclarés dans le brief :
- `gemini-design-mcp` : obligatoire pour tout frontend, outils `create_frontend`, `modify_frontend`, `snippet_frontend`.
- `claude-mem` : mémoire cross-session.
- Vercel MCP/CLI.
- GitHub MCP.
- Playwright MCP.
- Context7.
- Telegram Bruce Lee bot.

Hermes actuel peut ne pas avoir ces MCP connectés. Si un outil obligatoire manque, ne pas compenser à l’aveugle sur frontend.

Avant tout dev Brvndlab, faire l’audit setup demandé par Jonathan : MCP servers, CLIs locales, mémoire fichier Claude, skills custom/process/Vercel/mémoire, accès humains GitHub/Vercel/Convex/Stripe/Clerk. Ne pas coder tant que les gaps critiques ne sont pas identifiés.

## Workflow produit

1. Lire brief/mémoire avant action.
2. Pour Brvndlab dev, respecter le binôme : Claude Code implémente, Hermes/Chief of Staff audite et double-check. Hermes peut rédiger le brief à envoyer à Claude Code; ne pas patcher directement sauf demande explicite.
3. Si Jonathan demande “où on en était” ou recadre la vision, répondre court : rappeler seulement les décisions actives et la prochaine décision, sans réouvrir SaaS/agence/API si déjà tranché.
4. Brainstorm depuis l’existant, jamais from scratch.
4. Si nouvelle feature UI : mockup HTML statique, puis validation Jonathan.
4. Si implémentation frontend : Gemini Design MCP obligatoire si disponible.
5. Data wiring manuel ensuite.
6. Type check fichiers touchés.
7. Tests et build.
8. Déploiement Convex/Vercel si nécessaire.
9. Smoke test live.
10. Confirmation factuelle avec URL et résultats.

## Phrases Jonathan à reconnaître

- “Go” : déployer sans validation supplémentaire.
- “Pas de back and forth” : exécuter séquence complète.
- “Ça fait brouhaha” : supprimer duplication et bruit.
- “C’est pas celui-là” : mauvais mockup ou mauvaise référence, proposer les alternatives.
- “Fais simple” / “réponse simple” / “j’en ai marre des longues réponses” : répondre ultra-court, concret, 3-6 puces maximum, sans prompt prêt-à-envoyer sauf demande explicite.
- “Avant de lui envoyer” / “on n’a pas encore validé” : ne pas produire automatiquement un message pour Claude; clarifier d’abord la décision en langage simple.
- Si Jonathan demande une décision produit ou dit “je laisse développer mon idée” : ne pas sauter directement au brief Claude Code; résumer la décision recommandée en 3-6 puces, attendre “go” pour préparer le message d’exécution.
- Si Jonathan explore une idée ou une UX non validée : ne pas proposer spontanément “message à envoyer à Claude Code”. D’abord clarifier/décider la direction produit avec lui. Ne fournir un prompt Claude que s’il demande explicitement “prompt pour Claude”, “Claude Code ?”, ou valide le cap.
- “Trop de brouhaha” / “trop de CTA” : réduire à une idée principale, 1-2 choix maximum, mots simples, pas de jargon de type “shape / pipeline / diagnostic” sans traduction.
- “Trop de détails” : il veut plus de profondeur, pas moins, sauf s’il demande explicitement de simplifier.

## Sécurité

- Ne jamais exposer secrets.
- Convex : éviter `npx convex env list --prod` en session partagée, car la commande peut afficher les valeurs en clair. Si une inspection env est nécessaire, utiliser une méthode masquée ou confirmer explicitement le risque avant.
- Si une clé apparaît en plaintext dans une session/log, demander rotation rapide des clés concernées et ne jamais les recopier.
- Ne jamais toucher auth/paiement/données critiques sans validation explicite.
- P0 prod down : rollback immédiat, puis diagnostic.
- Aucun endpoint `/api/*` public sans auth/signature/secret-path, sauf `/r/[slug]`.
- Endpoints HTTP Hermès → Brvndlab : auth par `X-Hermes-Token`; pour Convex 1.34.1, ne pas dépendre de `process.env.HERMES_INGEST_TOKEN` dans les runtimes, utiliser le fallback DB privé `appSecrets` + `convex/hermesAuth.ts` internalQuery.

## Références opérationnelles

- `references/hermes-instagram-ingest.md` : pipeline Radar Instagram piloté par Hermès, endpoints, auth, cron et pièges Instaloader/rate-limit.
- `references/ai-cost-governance.md` : audit rentabilité IA Brvndlab, commandes Convex, pièges de tracking incomplet, seuils de coûts et règles quotas/modèles.
- `references/cost-audit-playbook-2026-05.md` : playbook concret issu de l’audit ~10 $/jour : commandes d’agrégation `aiUsage`, scan des routes Anthropic non loggées, crons à vérifier et avant/après à expliquer à Jonathan.
- `references/rms-content-os-positioning-2026-05.md` : cadrage validé Brvndlab/RMS comme infrastructure Content OS livrée, avec règles analytics locales/visibles, responsabilité des quotas tiers et sections à garder/cacher.
- `references/brvndlab-ux-cleanup-and-llm-state-2026-05.md` : état post-nettoyage Brvndlab, sections UI à garder/cacher, décision Brand OS sans vidéos, règles anti-mock IA, vérification Claude Code et procédure Convex deploy depuis le Mac de Jonathan.
- `references/brand-os-as-core-and-brand-dna.md` : décision Brand OS comme cœur/cerveau/âme de Brvndlab, Brand DNA `getBrandDna`, toggle global `brandOsGuided`, dashboard cockpit, séparation Contents/Pipeline.
- `references/contents-creation-architecture.md` : architecture Contents/création validée : deux portes Contents, Brainstormer conversationnel, formats R1, Brand OS + Journal comme mémoire agentique, éviter le brouhaha.
- `references/brainstormer-r1-agentic-conversation-2026-05.md` : flow Brainstormer R1 actuel : chat direct, accroches variables, pas de formulaire/source/format/funnel au départ, diagnostic après compréhension, sauvegarde automatique et choix créer maintenant/plus tard.
- `references/brainstorm-card-title-quality-2026-05.md` : règle UX pour les cartes “Brainstorms sauvegardés” : titres éditoriaux scannables mais substantiels, anti-condensation mécanique, exemples bons/mauvais.
- `references/contents-brainstorming-r1-2026-05.md` : décisions R1 Contents/Brainstorming : 2 portes d’entrée, 5 formats, mémoire agentique toujours active, brainstorming conversationnel sans limite fixe jusqu’à angle solide.
- `references/question-audience-mobile-flow-2026-05.md` : ancien flow R1 mobile Questions/réponses spontanées avec preview/download/confirm; garder seulement comme historique/pitfall, ne plus appliquer comme flow actuel.
- `references/question-audience-native-camera-r1-2026-05.md` : flow R1 actuel Questions/réponses spontanées : pas de capture web, caméra native hors Brvndlab, CTA “Ouvre la caméra et réponds” puis “J’ai filmé”, overlay “Prise ajoutée 🎉”, zéro upload/coût.
- `references/ai-runtime-and-cost-model.md` : règles IA Brvndlab par instance, répartition Sonnet/Haiku/off, garde-fous coût, et Hermes/agent privé comme runtime invisible derrière Brvndlab.
- `references/brainstorm-zero-api-bridge.md` : piste Brainstorming zéro API externe via bridge privé Brvndlab → VPS/Mac/Hermes/Claude Code CLI, avec risques, contraintes et règles d’audit avant code.
- `references/brainstorm-angles-cost-governance-2026-05.md` : décisions R1 Brainstorming Sonnet → Angles, aiGateway, mapping Sonnet/Haiku/OFF, et reporting `/admin/costs`.

## Questions à poser si flou critique

Seulement si l’ambiguïté change vraiment l’action :
- module owner ?
- mockup canonique exact ?
- data réelle ou intention future ?
- validation déjà scellée ou exploration ?
- frontend possible sans Gemini Design MCP ?
