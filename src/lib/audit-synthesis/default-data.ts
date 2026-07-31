// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BOLD_SHIFT_DATA: any = {
  client:{ name:"Bold Shift Collective", founder:"Rafaela Francisco",
           sector:"Coaching bien-être, sport & nutrition pour femmes", date:"Juillet 2026" },
  hc:27.71,
  contexte:[
    ["Client / société","Bold Shift Collective"],
    ["Secteur / niche","Coaching bien-être, sport et nutrition pour femmes"],
    ["Offre principale","Programme d'accompagnement pour femmes"],
    ["Dirigeante","Rafaela Francisco"],
    ["Objectif de l'audit","Clarifier les leviers de croissance et les tâches à déléguer ou automatiser pour libérer du temps et structurer l'acquisition"],
    ["Sources de leads","Meta Ads et contenu organique via Instagram"],
    ["Taille d'équipe","Rafaela seule aujourd'hui ; recrutement envisagé (setter pour les DMs Instagram, puis closer)"],
    ["Contrainte forte","Onboarding, plans, check-ins hebdomadaires, visios mensuelles et appels de vente concentrés sur la dirigeante"],
    ["À préserver","La qualité du coaching, le suivi humain mensuel et la relation de confiance"],
    ["Première victoire attendue","Sortir de l'opérationnel et dégager du temps, tout en renforçant sa capacité de pilotage et d'analyse : suivi du MRR et lecture de la performance des contenus"],
    ["Outils (11)","HubFit, BrandLab, Stripe, Instagram, Meta Ads, WhatsApp, Notion, IClosed, tl;dv, GenSpark, Google Meet"]
  ],
  funnel:[
    {t:"Acquisition", tool:"Meta Ads", n:"Publicité payante, contenu organique, recommandation"},
    {t:"Qualification", tool:"DM Instagram · Notion", n:"Échange en DM, fiche lead au CRM"},
    {t:"Prise de RDV", tool:"IClosed", n:"Booking de l'appel de vente"},
    {t:"Vente", tool:"Google Meet · tl;dv", n:"Appel en visio, enregistré"},
    {t:"Closing", tool:"Contrat · Stripe", n:"Contrat, puis paiement"},
    {t:"Onboarding", tool:"HubFit", n:"Accès, appel de cadrage"},
    {t:"Delivery", tool:"HubFit", n:"Plans sport & nutrition, check-ins"},
    {t:"Suivi", tool:"HubFit · WhatsApp", n:"Visio mensuelle, nurturing, KPI"}
  ],
  business:[
    ["Acquisition","Meta Ads, recommandation, et fiche lead dans Notion (CRM)"],
    ["Vente","Appels de vente sur Google Meet enregistrés via tl;dv, paiement Stripe et prise de rendez-vous via IClosed"],
    ["Delivery","Onboarding, puis HubFit : plan entraînement / nutrition, check-ins, visio mensuelle"],
    ["Suivi / support","HubFit, messagerie et check-ins, groupe WhatsApp"],
    ["Finance / admin","Stripe et contrat envoyé manuellement"],
    ["Concentration dirigeante","Vente, onboarding, plans, suivi, contenu, KPI et WhatsApp sont aujourd'hui portés par la dirigeante"]
  ],
  tasks:[
    {t:"Appels de suivi clientes + rédaction des templates", min:600, h:43.3, e:1200, rep:"Oui", gou:"Oui", auto:"À creuser"},
    {t:"Appels de vente", min:240, h:17.3, e:480, rep:"Non", gou:"Oui", auto:"Non"},
    {t:"Setting (DMs Instagram)", min:120, h:8.7, e:240, rep:"Oui", gou:"Oui", auto:"Oui"},
    {t:"Création plan / programme d'accompagnement", min:120, h:8.7, e:240, rep:"Non", gou:"Non", auto:"À creuser"},
    {t:"Suivi des performances / KPI via HubFit", min:100, h:7.2, e:200, rep:"Oui", gou:"Oui", auto:"Oui"},
    {t:"Appel d'onboarding", min:90, h:6.5, e:180, rep:"Non", gou:"Non", auto:"Non"},
    {t:"Organisation du call mensuel (brainstorming d'idées)", min:30, h:2.2, e:60, rep:"Non", gou:"Non", auto:"À creuser"},
    {t:"Rédaction & envoi du contrat", min:20, h:1.4, e:40, rep:"Oui", gou:"Non", auto:"Oui"},
    {t:"Réflexion nouveaux programmes d'entraînement", min:15, h:1.1, e:30, rep:"Non", gou:"Non", auto:"À creuser"},
    {t:"Nurturing groupe WhatsApp", min:10, h:0.7, e:20, rep:"Non", gou:"Non", auto:"Non"},
    {t:"Création des accès HubFit", min:5, h:0.4, e:10, rep:"Oui", gou:"Non", auto:"Oui"}
  ],
  top3leaks:[
    "Données non centralisées : dispersées sur une multitude d'outils",
    "Création et rédaction manuelles : contrats, programmes et supports",
    "Setting et qualification des DMs Instagram"
  ],
  procdata:[
    ["Onboarding client","HubFit + observation cliente","Bonne","HubFit","Personnalisation élevée, risque qualité si trop automatisé","Vérifier accès HubFit, champs client et format des données"],
    ["Création de facture","Stripe / contrat (à confirmer)","À clarifier","Stripe","Données de facturation et contrat non clarifiées","Clarifier workflow contrat, facture, paiement et relance"],
    ["Setting Instagram","DMs Instagram","Moyenne","Instagram","Perte de leads si réponse lente ou non structurée","Connecter Instagram et définir scripts / critères de qualification"],
    ["Appels de vente","Notes d'appels / agenda (à confirmer)","À clarifier","À confirmer","Poste commercial critique ; vente consultative à garder humaine","Lister étapes R1/R2, objections et supports de vente"],
    ["Contrat client","Contrat envoyé manuellement","À clarifier","À confirmer","Erreur ou oubli possible après closing","Récupérer template contrat et règles d'envoi"],
    ["Accès HubFit","HubFit","Bonne","HubFit","Étape répétitive dépendante des accès outil","Tester création d'accès et disponibilité API / export"],
    ["Plans sport / nutrition","HubFit + observation cliente","Moyenne","HubFit","Qualité coaching critique, automatisation totale risquée","Structurer templates et critères de personnalisation"],
    ["Suivi KPI client","HubFit + check-ins hebdomadaires","Moyenne","HubFit","Gros volume récurrent, risque de surcharge","Connecter accès KPI, format check-in et règles d'alerte"],
    ["Reporting marketing","Meta Ads + Instagram + MRR","À clarifier","Meta Ads, Instagram, Stripe","Pas de lecture claire de ce qui performe","Connecter Meta / Instagram / Stripe et définir le dashboard"],
    ["Prise de RDV (IClosed)","IClosed","À clarifier","IClosed","No-show ou perte de RDV si le scheduling est mal suivi","Demander accès IClosed, règles de booking et de relance"],
    ["Enregistrement / transcription appels (tl;dv)","tl;dv","Moyenne","tl;dv","Objections et next steps perdus si non centralisés","Demander accès tl;dv et exemples de transcript"],
    ["CRM leads / contacts (Notion)","Notion","Moyenne","Notion","Doublons ou statuts incomplets si le CRM n'est pas cadré","Demander accès Notion, structure des fiches et du pipeline"],
    ["Appels visio (Google Meet)","Google Meet / agenda","Moyenne","Google Meet","Suivi disparate entre vente, onboarding et visios","Clarifier types d'appels, calendrier et compte utilisé"],
    ["Création decks / contenus (GenSpark)","GenSpark / supports de vente","Moyenne","GenSpark","Supports non versionnés ou non reliés au pipeline","Demander accès GenSpark et exemples de decks"]
  ],
  opps:[
    {p:"DMs Instagram non structurés", ag:"Agent de qualification des DMs Instagram", gain:"Réponses plus rapides, leads mieux qualifiés, moins de temps Rafaela", i:5, f:4, ef:4, score:16, phase:"Ultérieure", dec:"À l'étude"},
    {p:"Relance & synthèse post-appel manuelle", ag:"Agent qui lit le transcript tl;dv : résumé, relance personnalisée et prochaines actions", gain:"Meilleure conversion, zéro engagement oublié, moins de rédaction manuelle", i:5, f:3, ef:4, score:11, phase:"Phase 1", dec:"Retenu"},
    {p:"Suivi KPI HubFit chronophage", ag:"Agent de suivi KPI + alertes", gain:"Détection des clientes à risque et préparation des messages de suivi", i:5, f:4, ef:4, score:15, phase:"Phase 1", dec:"Retenu"},
    {p:"Création d'accès et de contrat manuelle", ag:"Assistant d'onboarding admin", gain:"Moins d'oublis après vente, accès créés plus vite", i:4, f:5, ef:4, score:14, phase:"Quick win", dec:"Retenu"},
    {p:"Reporting MRR / Meta / contenu dispersé", ag:"Dashboard performance + synthèse hebdo", gain:"Vision claire des contenus, ads et revenus qui performent", i:5, f:4, ef:4, score:15, phase:"Phase 1", dec:"Retenu"},
    {p:"Plans sport / nutrition personnalisés", ag:"Copilote de création de plans", gain:"Brouillons de plans plus rapides, validation humaine conservée", i:5, f:3, ef:4, score:13, phase:"Phase 2", dec:"À creuser"}
  ],
  priorities:[
    {t:"Centralisation des données (micro-SaaS)", d:"Consolidation de tous les outils sur une source unique, via le Data OS"},
    {t:"Intégration agentique avec la mémoire métier", d:"Un agent qui comprend et exploite le contexte métier de Bold Shift Collective"},
    {t:"Reporting en continu", d:"Analyse et pilotage en temps réel depuis le Data OS"}
  ],
  synth:{
    p1_prio:["Mise en place de l'agent orchestrateur","Connexion de l'ensemble des outils à la mémoire métier","Rendre l'agent opérationnel : compréhension et intégration de l'environnement de travail"],
    p1_qw:[],
    p2_prio:["Création du Data OS : centralisation des données","Reporting et analyse précis depuis le Data OS","Déploiement des sous-agents spécialisés : Agent Data Analyst, Agent KB, Agent CFO"],
    controle:["Sessions de coaching avec les clientes","Messages envoyés aux clientes","Décisions de coaching, nutrition, sport","Closing des ventes","Changements de programme et contenus sensibles"],
    accompagnement:"Calls de coaching hebdomadaires tout au long des phases 1 et 2 : entraînement de l'agent, connexion progressive des outils et suivi de sa performance.",
    access:"HubFit, Instagram / Meta, Stripe, BrandLab, Notion, IClosed, tl;dv, GenSpark, Google Meet, templates contrat & plans",
    next:"Lancer la phase 1 (mise en place de l'agent orchestrateur et connexion des outils à la mémoire métier), puis, en phase 2, créer le Data OS et déployer les sous-agents spécialisés. Horizon de déploiement cible : sous 30 jours, rythmé par des sessions de coaching hebdomadaires."
  }
};
