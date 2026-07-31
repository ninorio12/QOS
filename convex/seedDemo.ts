import { mutation } from "./_generated/server"

// Seed : insère LE SOP simple d'install Hermes (1 VPS / client, sans Docker) dans le module Process. Idempotent.
export const seedSopHermes = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("processes").collect()
    // Nettoyage des anciennes versions (titres remplacés ; plus de fiche Docker/multi-tenant)
    const obsoletes = [
      "SOP — Déployer Hermes sur un VPS client (neuf, mémoire vierge)",
      "SOP — Hermes UNI-TENANT (1 VPS par client, sur l'hôte, sans Docker)",
      "SOP — Hermes MULTI-TENANT (Docker, N clients sur infra partagée)",
    ]
    for (const p of all) { if (obsoletes.includes(p.title)) await ctx.db.delete(p._id) }

    const title = "Installer Hermes sur le VPS d'un client"
    const sop = [
      "<p><strong>But : installer un assistant IA (Hermes) sur le serveur d'un client, avec une mémoire qui se souvient de tout, et une page web pour lui parler. Tout reste sur SON serveur, et sa mémoire démarre VIDE (aucune de nos données).</strong></p>",
      "<p><br></p>",
      "<p><strong>Avant de commencer, il te faut :</strong></p>",
      "<ul><li>l'adresse (IP) du serveur du client et son mot de passe root</li><li>le compte ChatGPT Pro (Codex) à connecter sur cet agent</li></ul>",
      "<p><br></p>",
      "<p><strong>Étape 1 : se connecter au serveur du client</strong></p>",
      "<p>Tape : <strong>ssh root@IP_DU_CLIENT</strong> (puis le mot de passe).</p>",
      "<p>Ça fait : tu es maintenant DANS le serveur du client.</p>",
      "<p>Vérifie : tu vois une ligne qui ressemble à root@serveur:~#</p>",
      "<p><br></p>",
      "<p><strong>Étape 2 : installer les petits outils de base</strong></p>",
      "<p>Tape : <strong>apt update && apt install -y unzip git curl</strong></p>",
      "<p>Ça fait : installe des outils dont la suite a besoin.</p>",
      "<p>Vérifie : pas de message d'erreur rouge à la fin.</p>",
      "<p><br></p>",
      "<p><strong>Étape 3 : installer Hermes (l'agent qui parle)</strong></p>",
      "<p>Tape : <strong>curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash --skip-setup</strong></p>",
      "<p>Ça fait : installe l'agent Hermes sur le serveur.</p>",
      "<p>Vérifie : tape <strong>hermes --version</strong>, tu dois voir v0.17.</p>",
      "<p><br></p>",
      "<p><strong>Étape 4 : choisir le modèle (Codex via ChatGPT Pro) et se connecter</strong></p>",
      "<p>Tape ces 2 lignes :</p>",
      "<ul><li>hermes config set model.provider openai-codex</li><li>hermes config set display.tool_progress off</li></ul>",
      "<p>Puis connecte le compte ChatGPT Pro : <strong>hermes auth add openai-codex</strong> et suis le lien de connexion qui s'affiche.</p>",
      "<p>Ça fait : l'agent réfléchit avec Codex via l'abonnement ChatGPT Pro (pas de facturation au token).</p>",
      "<p>Vérifie : tape <strong>hermes -z \"dis OK\"</strong>, il doit répondre OK.</p>",
      "<p><br></p>",
      "<p><strong>Étape 5 : installer la mémoire qui se souvient (GBrain)</strong></p>",
      "<p>5a. Le moteur qui range les souvenirs (Ollama) : <strong>curl -fsSL https://ollama.com/install.sh | sh</strong> puis <strong>ollama pull nomic-embed-text</strong></p>",
      "<p>5b. L'outil bun : <strong>curl -fsSL https://bun.sh/install | bash</strong> puis recharge le terminal (ou tape : export PATH=\"$HOME/.bun/bin:$PATH\").</p>",
      "<p>5c. GBrain : <strong>git clone https://github.com/garrytan/gbrain.git ~/gbrain</strong> puis <strong>cd ~/gbrain && bun install && bun link</strong></p>",
      "<p>5d. Créer la mémoire VIDE : <strong>gbrain init --pglite --embedding-model ollama:nomic-embed-text</strong></p>",
      "<p>Ça fait : l'agent a maintenant une mémoire à long terme.</p>",
      "<p>Vérifie : tape <strong>gbrain doctor</strong>, tu dois voir une ligne verte \"embedding_provider ... DB aligned\".</p>",
      "<p>Attention : prends bien <strong>nomic-embed-text</strong> (et pas all-minilm), sinon la mémoire refuse de marcher.</p>",
      "<p><br></p>",
      "<p><strong>Étape 6 : brancher la mémoire à l'agent (pour qu'il s'en serve tout seul)</strong></p>",
      "<p>Mets le petit script <strong>brain-recall</strong> dans le dossier ~/.hermes/agent-hooks/ (il lit la question, cherche dans la mémoire, et renvoie ce qu'il trouve).</p>",
      "<p>Puis ajoute ce bloc tout en bas du fichier ~/.hermes/config.yaml (respecte bien les espaces) :</p>",
      "<p>hooks:<br>&nbsp;&nbsp;pre_llm_call:<br>&nbsp;&nbsp;&nbsp;&nbsp;- command: /root/.hermes/agent-hooks/brain-recall<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;timeout: 30<br>hooks_auto_accept: true</p>",
      "<p>Ça fait : à CHAQUE message, l'agent regarde d'abord dans sa mémoire avant de répondre.</p>",
      "<p>Vérifie : tape <strong>hermes hooks list</strong>, tu vois le hook pre_llm_call.</p>",
      "<p><br></p>",
      "<p><strong>Étape 7 : lui apprendre à retenir tout seul</strong></p>",
      "<p>Mets un fichier ~/.hermes/SOUL.md qui lui dit : \"quand tu apprends un fait important (un client, une décision, un chiffre), écris-le avec gbrain put\".</p>",
      "<p>Ajoute le ménage de nuit : tape <strong>crontab -e</strong> et ajoute la ligne : <strong>0 4 * * * /root/.bun/bin/gbrain dream --json</strong></p>",
      "<p>Ça fait : chaque nuit, l'agent range et consolide sa mémoire, tout seul.</p>",
      "<p>Vérifie : tape <strong>crontab -l</strong>, tu vois la ligne.</p>",
      "<p>Attention : ne lance JAMAIS \"gbrain serve\" ou \"gbrain autopilot\" en continu : ils verrouillent la mémoire (un seul programme à la fois) et le reste arrête de marcher.</p>",
      "<p><br></p>",
      "<p><strong>Étape 8 : ouvrir la page web pour lui parler (Control Room)</strong></p>",
      "<p>D'abord choisis un identifiant et un mot de passe pour la page (sinon elle refuse de s'ouvrir). Ensuite lance : <strong>hermes dashboard --host 0.0.0.0 --port 9119 --no-open</strong></p>",
      "<p>Ça fait : une page web pour discuter avec l'agent et le surveiller.</p>",
      "<p>Vérifie : ouvre <strong>http://IP_DU_CLIENT:9119</strong> dans ton navigateur, ça demande le mot de passe.</p>",
      "<p><br></p>",
      "<p><strong>Étape 9 : vérifier que tout marche, puis vider la mémoire</strong></p>",
      "<p>Mets une fausse info dans la mémoire, pose la question à l'agent, vérifie qu'il répond avec, PUIS efface cette info (la mémoire du client doit repartir VIDE). Vérifie aussi qu'il ne reste aucune de NOS données ou clés.</p>",
      "<p><br></p>",
      "<p><br></p>",
      "<p><strong>Étape 10 (optionnel) : parler à l'agent depuis Telegram</strong></p>",
      "<p>1. Sur Telegram, écris à <strong>@BotFather</strong>, envoie <strong>/newbot</strong>, donne un nom puis un username finissant par bot. Il te renvoie un token (du genre 8123456789:AAH...xyz).</p>",
      "<p>2. Sur le serveur, colle le token : <strong>echo \"TELEGRAM_BOT_TOKEN=LE_TOKEN\" &gt;&gt; ~/.hermes/.env</strong></p>",
      "<p>3. Lance le service qui écoute Telegram : <strong>hermes gateway setup</strong> (choisis Telegram), puis <strong>hermes gateway install && hermes gateway start</strong>.</p>",
      "<p>4. Autorise-toi : envoie un message au bot ; si besoin valide avec le code de pairing (<strong>hermes pairing</strong>).</p>",
      "<p>Ça fait : tu discutes avec ton agent (et toute sa mémoire) directement depuis Telegram, sans ouvrir la page web.</p>",
      "<p>Vérifie : envoie un message au bot sur Telegram, il te répond.</p>",
      "<p><br></p>",
      "<p><strong>Si quelque chose ne marche pas :</strong></p>",
      "<ul><li>La page web refuse de s'ouvrir : tu as oublié de mettre le mot de passe AVANT de la lancer (étape 8).</li><li>Message \"PGLite lock / timeout\" : un \"gbrain serve\" tourne en fond, arrête-le avec <strong>pkill -f \"gbrain serve\"</strong>.</li><li>gbrain doctor parle de \"768 vs 384\" : tu as pris all-minilm au lieu de nomic-embed-text, refais l'étape 5d.</li><li>Ollama doit tourner avant gbrain (normalement il démarre tout seul comme service).</li></ul>",
      "<p><strong>À retenir :</strong> 1 client = 1 serveur, sans Docker. Pour que la page reste ouverte même après un redémarrage du serveur, transforme la commande du dashboard en service systemd.</p>",
    ].join("\n")

    const existing = all.find(p => p.title === title)
    const doc = { title, icon: "gitMerge", category: "Process internes", subfolder: "SOPs", blocks: [{ type: "doc", text: sop }], updatedAt: new Date().toISOString() }
    if (existing) { await ctx.db.patch(existing._id, doc); return { updated: title } }
    await ctx.db.insert("processes", doc); return { created: title }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Seed DÉMO autonome : remplit toute la base d'instance démo avec des fausses
// données cohérentes (contacts ↔ 3 pipelines ↔ onboarding/paiements + agentique).
// Idempotent : ne fait rien si des contacts existent déjà.
// ─────────────────────────────────────────────────────────────────────────────

const WS = "vividflow"
const ini = (f: string, l: string) => ((f[0] ?? "") + (l[0] ?? "")).toUpperCase() || "?"
const COL_TO_STAGE: Record<string, string> = {
  leads_a_traiter: "nouveau-lead", nrp1: "conversation", nrp2: "conversation",
  nrp3: "conversation", nrp4: "conversation", rdv_booke: "r1",
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const dateAgo = (n: number) => daysAgo(n).split("T")[0]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any

const CLIENTS: C[] = [
  { fn: "Thomas", ln: "Favre", company: "Favre Architecture Sàrl", canton: "GE", metier: "Architecte", niche: "Immobilier & Construction", source: "inbound", stage: "consulting", value: 3500, won: "peur", tags: ["premium", "référence"], notes: "Client fidèle depuis 2023. Projet villa à Genève.", ob: { amounts: [3500], paid: [true], tasks: { contractSent: true, formSent: true, kickoffPlanned: true } } },
  { fn: "Sofia", ln: "Keller", company: "Keller Wellness Studio", canton: "ZH", metier: "Coach bien-être", niche: "Santé & Bien-être", source: "inbound", stage: "setup-cree", value: 2500, won: "argent", tags: ["client", "actif"], notes: "Studio yoga + coaching, excellents résultats.", ob: { amounts: [1250, 1250], paid: [true, false], tasks: { contractSent: true, formSent: true, kickoffPlanned: true } } },
  { fn: "Camille", ln: "Roux", company: "Roux Immobilier", canton: "FR", metier: "Courtière", niche: "Immobilier", source: "recommandation", stage: "nouveau-client", value: 2500, tags: ["nouveau"], notes: "Recommandée par Thomas Favre." },
  { fn: "Nicolas", ln: "Lefebvre", company: "Lefebvre Digital", canton: "VD", metier: "Directeur Marketing", niche: "Marketing", source: "outbound", stage: "kickoff-booke", value: 4000, won: "logistique", tags: ["agence"], notes: "Agence marketing, kickoff planifié.", ob: { amounts: [2000, 2000], paid: [true, false], tasks: { contractSent: true, formSent: true, kickoffPlanned: true } } },
  { fn: "Léa", ln: "Fontaine", company: "Fontaine Santé", canton: "NE", metier: "Praticienne", niche: "Santé", source: "inbound", stage: "onboarding-complet", value: 2500, tags: ["santé"], notes: "Cabinet de santé, onboarding complété.", ob: { amounts: [2500], paid: [false], tasks: { contractSent: true, formSent: true, kickoffPlanned: false } } },
  { fn: "Antoine", ln: "Faure", company: "Faure Construction", canton: "VS", metier: "Entrepreneur", niche: "BTP", source: "outbound", stage: "onboarding-envoye", value: 3500, tags: ["btp"], notes: "Onboarding envoyé, en attente du formulaire.", ob: { amounts: [3500], paid: [false], tasks: { contractSent: false, formSent: false, kickoffPlanned: false } } },
  { fn: "Émilie", ln: "Garnier", company: "Garnier RH", canton: "GE", metier: "Consultante RH", niche: "RH", source: "recommandation", stage: "consulting", value: 5000, won: "partenaire", tags: ["premium"], notes: "Conseil RH, gros compte récurrent.", ob: { amounts: [2500, 2500], paid: [true, true], tasks: { contractSent: true, formSent: true, kickoffPlanned: true } } },
  { fn: "Lucas", ln: "Mercier", company: "Mercier Logistics", canton: "TI", metier: "Directeur Ops", niche: "Logistique", source: "outbound", stage: "nouveau-client", value: 2000, tags: ["logistique"], notes: "Nouvelle signature, à onboarder." },
]

const LEADS_OUT: C[] = [
  { fn: "Yasmine", ln: "Benali", company: "DigitalZen Agency", canton: "VD", metier: "Directrice Marketing", niche: "Marketing", col: "nrp2", temp: "chaud", tags: ["chaud", "relance"], notes: "Contactée LinkedIn, très intéressée." },
  { fn: "Sophie", ln: "Berger", company: "Berger Architecture", canton: "VD", metier: "Architecte", niche: "Architecture", col: "nrp1", temp: "chaud", tags: ["potentiel"], notes: "A répondu, à relancer cette semaine." },
  { fn: "Julien", ln: "Moreau", company: "Moreau Consulting", canton: "VS", metier: "Consultant", niche: "Conseil", col: "rdv_booke", temp: "chaud", tags: ["rdv"], notes: "RDV booké sur iClosed." },
  { fn: "Manon", ln: "Chevalier", company: "Chevalier Coaching", canton: "VD", metier: "Coach", niche: "Coaching", col: "leads_a_traiter", temp: "froid", tags: ["nouveau"], notes: "Lead à traiter, premier appel à faire." },
  { fn: "Romain", ln: "Schneider", company: "Schneider Tech GmbH", canton: "SG", metier: "CEO", niche: "SaaS & Technologie", col: "nrp3", temp: "tiede", tags: ["startup"], notes: "Startup B2B, 3 relances faites." },
  { fn: "Marc", ln: "Dupuis", company: "Dupuis Finance", canton: "GE", metier: "Conseiller", niche: "Finance", col: "nrp4", temp: "tiede", tags: ["finance"], notes: "Difficile à joindre, 4 tentatives." },
  { fn: "Thomas", ln: "Girard", company: "Girard Avocats", canton: "GE", metier: "Avocat", niche: "Juridique", col: "leads_a_traiter", temp: "froid", tags: ["juridique"], notes: "Message laissé, en attente." },
  { fn: "Pauline", ln: "Robert", company: "Robert Immobilier", canton: "VD", metier: "Agente", niche: "Immobilier", col: "rdv_booke", temp: "chaud", tags: ["rdv"], notes: "RDV confirmé pour démo." },
]

const LEADS_IN: C[] = [
  { fn: "Olivier", ln: "Martin", company: "Martin & Co", canton: "GE", metier: "Gérant", niche: "Conseil", leadStage: "nouveau-lead", tags: ["inbound"], notes: "Formulaire site web." },
  { fn: "Nina", ln: "Costa", company: "Costa Studio", canton: "ZH", metier: "Designer", niche: "Design", leadStage: "conversation", tags: ["inbound"], notes: "Demande de devis reçue." },
  { fn: "David", ln: "Perez", company: "Perez Fitness", canton: "VD", metier: "Coach sportif", niche: "Santé & Bien-être", leadStage: "r1", tags: ["inbound", "r1"], notes: "R1 effectué, à requalifier." },
  { fn: "Clara", ln: "Meyer", company: "Meyer Patrimoine", canton: "BE", metier: "Gestionnaire", niche: "Finance & Patrimoine", leadStage: "r2", tags: ["chaud"], notes: "R2 planifié, proche de la signature." },
  { fn: "Hugo", ln: "Blanc", company: "Blanc Studio", canton: "VS", metier: "Photographe", niche: "Création", leadStage: "nouveau-lead", tags: ["inbound"], notes: "Nouveau lead entrant." },
]

const PERDU: C[] = [
  { fn: "Marc-Antoine", ln: "Dupuis", company: "Dupuis & Associés Finance", canton: "BE", metier: "Conseiller financier", niche: "Finance & Patrimoine", lostStage: "r1", lostReason: "non_qualifie", lostObjection: "argent", tags: ["perdu", "budget"], notes: "Budget insuffisant. Recontacter Q3." },
  { fn: "Isabelle", ln: "Roy", company: "Roy Conseil", canton: "GE", metier: "Consultante", niche: "Conseil", lostStage: "nrp3", lostReason: "pas_interesse", tags: ["perdu"], notes: "Pas intéressée après 3 relances." },
  { fn: "Patrick", ln: "Henry", company: "Henry Bâtiment", canton: "VD", metier: "Entrepreneur", niche: "BTP", lostStage: "nrp2", lostReason: "jamais_repondu", tags: ["perdu"], notes: "N'a jamais répondu." },
  { fn: "Valérie", ln: "Simon", company: "Simon Immobilier", canton: "FR", metier: "Courtière", niche: "Immobilier", lostStage: "r2", lostReason: "non_qualifie", lostObjection: "partenaire", tags: ["perdu"], notes: "Doit valider avec son associé, sans suite." },
  { fn: "Bruno", ln: "Lopez", company: "Lopez Services", canton: "TI", metier: "Gérant", niche: "Services", lostStage: "leads_a_traiter", lostReason: "faux_numero", tags: ["perdu"], notes: "Mauvais numéro." },
]

export const seedDemo = mutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("crm_contacts").collect()
    if (existing.length > 0) return { skipped: true, reason: "already seeded", contacts: existing.length }

    // Pipeline Leads
    const cfg = await ctx.db.query("pipeline_config").withIndex("by_type", q => q.eq("type", "leads")).first()
    const leadsCfg = cfg ?? await ctx.db.get(await ctx.db.insert("pipeline_config", {
      name: "Leads", type: "leads",
      stages: [
        { id: "nouveau-lead", name: "Nouveau lead", color: "#6366F1", position: 0 },
        { id: "conversation", name: "En conversation", color: "#F59E0B", position: 1 },
        { id: "r1", name: "R1", color: "#3B82F6", position: 2 },
        { id: "r2", name: "R2", color: "#8B5CF6", position: 3 },
        { id: "nouveau-client", name: "Nouveau client", color: "#84cc16", position: 4 },
      ],
    }))
    const pipelineId = String(leadsCfg!._id)

    let nLeads = 0, nClients = 0, nProsp = 0, nOb = 0
    let i = 0
    const mkContact = async (c: C, statut: string, extra: Record<string, unknown> = {}) => {
      i++
      const created = daysAgo(60 - i)
      const id = await ctx.db.insert("crm_contacts", {
        firstName: c.fn, lastName: c.ln, email: `${c.fn}.${c.ln}@${c.company.toLowerCase().replace(/[^a-z]/g, "")}.ch`.replace("..", "."),
        phone: `+4179${String(1000000 + i * 31).slice(0, 7)}`, companyName: c.company,
        source: c.source ?? (statut === "perdu" ? "outbound" : "inbound"), statut, canton: c.canton,
        metier: c.metier, niche: c.niche, tags: c.tags ?? [], notes: c.notes,
        temperature: c.temp, isDemo: true, createdAt: created, updatedAt: created, ...extra,
      })
      return { id, created }
    }
    const addLead = async (id: string, c: C, stageId: string, status: string, created: string) => {
      const name = `${c.fn} ${c.ln}`
      const lid = await ctx.db.insert("crm_leads", {
        contactId: id as never, name, email: undefined, phone: undefined, company: c.company,
        pipelineId, stageId, value: 0, source: c.source ?? "outbound", status, initials: ini(c.fn, c.ln), isDemo: true, createdAt: created,
      })
      await ctx.db.insert("lead_stage_history", { leadId: lid, stageId, stageName: stageId, enteredAt: created.split("T")[0] })
      nLeads++
      return lid
    }

    // ── Clients ──
    for (const c of CLIENTS) {
      const { id, created } = await mkContact(c, "client", { dealDate: dateAgo(20 - (i % 10)), ...(c.won ? { wonObjection: c.won } : {}) })
      await ctx.db.insert("pipeline_clients", {
        ghl_contact_id: id, contactId: id as never, name: `${c.fn} ${c.ln}`, company: c.company,
        email: undefined, phone: undefined, value: c.value, stageId: c.stage, initials: ini(c.fn, c.ln), createdAt: created.split("T")[0],
      })
      nClients++
      if (c.ob) {
        await ctx.db.insert("onboarding", {
          contactId: id, payment: { installments: c.ob.amounts.length, amounts: c.ob.amounts },
          paidStatus: c.ob.paid, paidDates: c.ob.paid.map((p: boolean, k: number) => p ? dateAgo(15 - k * 3) : ""),
          tasks: c.ob.tasks, formReceivedAt: created, updatedAt: created,
        } as never)
        nOb++
      }
    }

    // ── Leads outbound (prospection + lead miroir) ──
    for (const c of LEADS_OUT) {
      const { id, created } = await mkContact(c, "lead", { source: "outbound", leadStatus: "active" })
      const lid = await addLead(id, c, COL_TO_STAGE[c.col], "open", created)
      await ctx.db.insert("prospection_records", {
        workspaceId: WS, contactId: id, leadId: String(lid), boardColumn: c.col, phase: "phase1",
        phaseStatus: c.col === "leads_a_traiter" ? "a_appeler" : "a_rappeler",
        temperature: c.temp ?? "froid", channel: "appel", lastActionAt: created,
        status: c.col === "rdv_booke" ? "handoff" : "active", isDemo: true, createdAt: created, updatedAt: created,
      } as never)
      nProsp++
    }

    // ── Leads inbound (lead pipeline seulement) ──
    for (const c of LEADS_IN) {
      const { id, created } = await mkContact(c, "lead", { source: "inbound", leadStatus: "active" })
      await addLead(id, c, c.leadStage, "open", created)
    }

    // ── Perdus ──
    for (const c of PERDU) {
      const { id, created } = await mkContact(c, "perdu", {
        source: "outbound", leadStatus: "non_qualifie", lostStage: c.lostStage, lostReason: c.lostReason,
        ...(c.lostObjection ? { lostObjection: c.lostObjection } : {}),
      })
      await addLead(id, c, "conversation", "lost", created)
      await ctx.db.insert("prospection_records", {
        workspaceId: WS, contactId: id, boardColumn: "perdu", phase: "phase2", phaseStatus: "negatif",
        temperature: "froid", channel: "appel", lastActionAt: created, status: "lost",
        lostReason: c.lostReason, lostStage: c.lostStage, isDemo: true, createdAt: created, updatedAt: created,
      } as never)
      nProsp++
    }

    return { ok: true, contacts: i, leads: nLeads, clients: nClients, prospection: nProsp, onboarding: nOb }
  },
})

// ── Historique clients + CA mensuel depuis septembre 2025 (pour la nav temporelle / calendrier) ──
const H_FN = ["Lucas", "Emma", "Noah", "Mia", "Léo", "Chloé", "Liam", "Jade", "Hugo", "Inès", "Nathan", "Zoé", "Ethan", "Lina", "Tom", "Anna", "Adam", "Eva", "Raphaël", "Sara", "Marius", "Nora", "Théo", "Lucie", "Gabriel", "Manon", "Arthur", "Alice", "Jules", "Camille", "Maxime", "Elsa", "Victor", "Rose", "Paul", "Julia", "Louis", "Maya", "Sacha", "Nina"]
const H_LN = ["Müller", "Rochat", "Meier", "Schmid", "Aebischer", "Roux", "Blanc", "Martin", "Berger", "Fontaine", "Garnier", "Mercier", "Girard", "Robert", "Costa", "Perez", "Meyer", "Lopez", "Henry", "Simon", "Roy", "Dubois", "Moreau", "Brunner", "Steiner", "Favre", "Gerber", "Widmer", "Frei", "Marchand", "Vasseur", "Lemoine", "Rolland", "Charpentier", "Guillet", "Nicolet", "Bovet", "Pittet", "Jaquet", "Délèze"]
const H_COMP = ["Conseil", "Studio", "Group", "Partners", "Solutions", "Digital", "Immobilier", "Santé", "Tech", "Services", "Construction", "Finance", "Coaching", "Agency", "Patrimoine"]
const H_MET = ["Consultant", "Coach", "Architecte", "Courtier", "Directeur", "Gérant", "Praticien", "Avocat", "Photographe", "Designer"]
const H_NICHE = ["Immobilier", "Santé & Bien-être", "Marketing", "Finance & Patrimoine", "Conseil", "SaaS & Technologie", "BTP", "RH", "Logistique", "Design"]
const H_CANTON = ["GE", "VD", "ZH", "BE", "FR", "VS", "NE", "SG", "TI", "JU"]
const H_STAGES = ["consulting", "setup-cree", "kickoff-booke", "onboarding-complet", "consulting", "consulting"]
const pad = (n: number) => String(n).padStart(2, "0")

export const seedDemoHistory = mutation({
  handler: async (ctx) => {
    const all = await ctx.db.query("pipeline_clients").collect()
    if (all.some(c => c.createdAt < "2026-01-01")) return { skipped: true, reason: "history already seeded" }

    // Septembre 2025 → juin 2026
    const MONTHS: [number, number][] = [[2025, 8], [2025, 9], [2025, 10], [2025, 11], [2026, 0], [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5]]
    let g = 0, nClients = 0, totalCA = 0
    for (let mi = 0; mi < MONTHS.length; mi++) {
      const [y, m] = MONTHS[mi]
      const perMonth = 3 + (mi % 3) // 3 à 5 clients / mois
      for (let ci = 0; ci < perMonth; ci++) {
        const day = 3 + ci * 6
        const dateISO = new Date(Date.UTC(y, m, day, 10, 0, 0)).toISOString()
        const dateStr = `${y}-${pad(m + 1)}-${pad(day)}`
        const fn = H_FN[g % H_FN.length]
        const ln = H_LN[(g * 7 + 3) % H_LN.length]
        const company = `${ln} ${H_COMP[g % H_COMP.length]}`
        const value = 1500 + ((g * 500) % 5000) // 1500 → 6000
        const won = g % 3 === 0 ? ["argent", "logistique", "peur", "partenaire"][g % 4] : undefined
        const cid = await ctx.db.insert("crm_contacts", {
          firstName: fn, lastName: ln, email: `${fn}.${ln}${g}@${ln.toLowerCase().replace(/[^a-z]/g, "")}.ch`,
          phone: `+4179${String(2000000 + g * 137).slice(0, 7)}`, companyName: company,
          source: ["inbound", "outbound", "recommandation"][g % 3], statut: "client",
          canton: H_CANTON[g % H_CANTON.length], metier: H_MET[g % H_MET.length], niche: H_NICHE[g % H_NICHE.length],
          tags: ["client"], dealDate: dateStr, ...(won ? { wonObjection: won } : {}),
          isDemo: true, createdAt: dateISO, updatedAt: dateISO,
        })
        await ctx.db.insert("pipeline_clients", {
          ghl_contact_id: cid, contactId: cid, name: `${fn} ${ln}`, company,
          value, stageId: H_STAGES[g % H_STAGES.length], initials: ini(fn, ln), createdAt: dateStr,
        })
        // Paiement encaissé dans le mois → CA encaissé réparti par mois
        await ctx.db.insert("onboarding", {
          contactId: cid, payment: { installments: 1, amounts: [value] },
          paidStatus: [true], paidDates: [dateStr],
          tasks: { contractSent: true, formSent: true, kickoffPlanned: true },
          formReceivedAt: dateISO, updatedAt: dateISO,
        } as never)
        g++; nClients++; totalCA += value
      }
    }
    return { ok: true, clients: nClients, totalCA, months: MONTHS.length }
  },
})

// ── Funnel réaliste : leads ouverts + perdus historiques (pour une conversion crédible ~30%) ──
const F_SRC = ["inbound", "outbound", "recommandation"]
const F_COLS = ["leads_a_traiter", "nrp1", "nrp2", "nrp3", "nrp4", "rdv_booke"]
const F_LOSTR = ["pas_interesse", "jamais_repondu", "faux_numero", "non_qualifie", "reponse_negative"]
const F_LOSTS = ["leads_a_traiter", "nrp2", "nrp3", "rdv_booke", "r1", "conversation"]
const F_TEMP = ["froid", "tiede", "chaud"]

export const seedDemoFunnel = mutation({
  handler: async (ctx) => {
    const contacts = await ctx.db.query("crm_contacts").collect()
    if (contacts.filter(c => c.statut === "perdu").length > 20) return { skipped: true, reason: "funnel already seeded" }
    const cfg = await ctx.db.query("pipeline_config").withIndex("by_type", q => q.eq("type", "leads")).first()
    const pipelineId = String(cfg!._id)
    const MONTHS: [number, number][] = [[2025, 8], [2025, 9], [2025, 10], [2025, 11], [2026, 0], [2026, 1], [2026, 2], [2026, 3], [2026, 4], [2026, 5]]
    let g = 500, nPerdu = 0, nLead = 0

    // Perdus répartis sur tous les mois
    for (let mi = 0; mi < MONTHS.length; mi++) {
      const [y, m] = MONTHS[mi]
      for (let k = 0; k < 5 + (mi % 2); k++) {
        const day = 2 + k * 4
        const dISO = new Date(Date.UTC(y, m, day, 11, 0, 0)).toISOString()
        const fn = H_FN[(g * 3 + 1) % H_FN.length], ln = H_LN[(g * 5 + 4) % H_LN.length]
        const company = `${ln} & Cie`
        const src = g % 2 === 0 ? "outbound" : "inbound"
        const cid = await ctx.db.insert("crm_contacts", {
          firstName: fn, lastName: ln, email: `${fn}.${ln}.p${g}@exemple.ch`, phone: `+4178${String(3000000 + g * 91).slice(0, 7)}`,
          companyName: company, source: src, statut: "perdu", canton: H_CANTON[g % H_CANTON.length],
          metier: H_MET[g % H_MET.length], niche: H_NICHE[g % H_NICHE.length], tags: ["perdu"], leadStatus: "non_qualifie",
          lostStage: F_LOSTS[g % F_LOSTS.length], lostReason: F_LOSTR[g % F_LOSTR.length], isDemo: true, createdAt: dISO, updatedAt: dISO,
        })
        const lid = await ctx.db.insert("crm_leads", { contactId: cid, name: `${fn} ${ln}`, company, pipelineId, stageId: "conversation", value: 0, source: src, status: "lost", initials: ini(fn, ln), isDemo: true, createdAt: dISO })
        await ctx.db.insert("prospection_records", { workspaceId: WS, contactId: cid, leadId: String(lid), boardColumn: "perdu", phase: "phase2", phaseStatus: "negatif", temperature: "froid", channel: "appel", lastActionAt: dISO, status: "lost", lostReason: F_LOSTR[g % F_LOSTR.length], lostStage: F_LOSTS[g % F_LOSTS.length], isDemo: true, createdAt: dISO, updatedAt: dISO } as never)
        g++; nPerdu++
      }
    }

    // Leads ouverts récents (4 derniers mois)
    for (const [y, m] of [[2026, 2], [2026, 3], [2026, 4], [2026, 5]] as [number, number][]) {
      for (let k = 0; k < 7; k++) {
        const day = 2 + k * 4
        const dISO = new Date(Date.UTC(y, m, day, 11, 0, 0)).toISOString()
        const fn = H_FN[(g * 3 + 2) % H_FN.length], ln = H_LN[(g * 7 + 1) % H_LN.length]
        const company = `${ln} ${H_COMP[g % H_COMP.length]}`
        const outbound = g % 2 === 0
        const src = outbound ? "outbound" : F_SRC[g % 3]
        const cid = await ctx.db.insert("crm_contacts", {
          firstName: fn, lastName: ln, email: `${fn}.${ln}.l${g}@exemple.ch`, phone: `+4179${String(4000000 + g * 53).slice(0, 7)}`,
          companyName: company, source: src, statut: "lead", leadStatus: "active", canton: H_CANTON[g % H_CANTON.length],
          metier: H_MET[g % H_MET.length], niche: H_NICHE[g % H_NICHE.length], tags: ["lead"], temperature: F_TEMP[g % 3], isDemo: true, createdAt: dISO, updatedAt: dISO,
        })
        if (outbound) {
          const col = F_COLS[g % F_COLS.length]
          const lid = await ctx.db.insert("crm_leads", { contactId: cid, name: `${fn} ${ln}`, company, pipelineId, stageId: COL_TO_STAGE[col], value: 0, source: src, status: "open", initials: ini(fn, ln), isDemo: true, createdAt: dISO })
          await ctx.db.insert("lead_stage_history", { leadId: lid, stageId: COL_TO_STAGE[col], stageName: COL_TO_STAGE[col], enteredAt: dISO.split("T")[0] })
          await ctx.db.insert("prospection_records", { workspaceId: WS, contactId: cid, leadId: String(lid), boardColumn: col, phase: "phase1", phaseStatus: "a_rappeler", temperature: F_TEMP[g % 3], channel: "appel", lastActionAt: dISO, status: col === "rdv_booke" ? "handoff" : "active", isDemo: true, createdAt: dISO, updatedAt: dISO } as never)
        } else {
          const stage = ["nouveau-lead", "conversation", "r1", "r2"][g % 4]
          const lid = await ctx.db.insert("crm_leads", { contactId: cid, name: `${fn} ${ln}`, company, pipelineId, stageId: stage, value: 0, source: src, status: "open", initials: ini(fn, ln), isDemo: true, createdAt: dISO })
          await ctx.db.insert("lead_stage_history", { leadId: lid, stageId: stage, stageName: stage, enteredAt: dISO.split("T")[0] })
        }
        g++; nLead++
      }
    }
    return { ok: true, perdus: nPerdu, leads: nLead }
  },
})

// Démo : pose des objections « perdantes » (rouge) sur les perdus en stade avancé
// (r1/r2/conversation), là où une objection a du sens — pour un mix vert/rouge réaliste.
export const seedDemoLostObjections = mutation({
  handler: async (ctx) => {
    const OBJ = ["argent", "logistique", "partenaire", "peur", "ecran_fumee"]
    const ADV = ["r1", "r2", "conversation"]
    const perdus = (await ctx.db.query("crm_contacts").collect())
      .filter(c => c.statut === "perdu" && ADV.includes((c as { lostStage?: string }).lostStage ?? "") && !(c as { lostObjection?: string }).lostObjection)
    let n = 0
    for (const c of perdus) {
      await ctx.db.patch(c._id, { lostObjection: OBJ[n % OBJ.length] })
      n++
    }
    return { ok: true, set: n }
  },
})

// ── Agentique : tâches, activités, base de connaissance ──
export const seedDemoAgentic = mutation({
  handler: async (ctx) => {
    const has = await ctx.db.query("os_tasks").withIndex("by_workspace", q => q.eq("workspaceId", WS)).first()
    if (has) return { skipped: true }
    const now = new Date().toISOString()
    const TASKS = [
      { title: "Relancer Yasmine Benali (NRP 2)", status: "todo", priority: "high", aType: "agent", aId: "agent-support-client" },
      { title: "Préparer la démo pour Romain Schneider", status: "in_progress", priority: "high", aType: "human", aId: "thomas" },
      { title: "Envoyer le contrat à Antoine Faure", status: "todo", priority: "urgent", aType: "agent", aId: "agent-operations" },
      { title: "Planifier le kickoff de Nicolas Lefebvre", status: "in_progress", priority: "normal", aType: "agent", aId: "coo" },
      { title: "Encaisser la 2ᵉ échéance — Keller Wellness", status: "todo", priority: "normal", aType: "human", aId: "thomas" },
      { title: "Qualifier les 3 nouveaux leads entrants", status: "todo", priority: "normal", aType: "agent", aId: "agent-analyse" },
      { title: "Mettre à jour la base de connaissance produit", status: "blocked", priority: "low", aType: "agent", aId: "agent-kb", blocker: "En attente des specs finales" },
      { title: "Bilan hebdo acquisition", status: "done", priority: "normal", aType: "agent", aId: "coo" },
      { title: "Onboarding Léa Fontaine — relancer formulaire", status: "todo", priority: "high", aType: "agent", aId: "agent-operations" },
      { title: "Analyser le taux de conversion R1→client", status: "done", priority: "normal", aType: "agent", aId: "agent-analyse" },
    ]
    let order = TASKS.length
    for (const t of TASKS) {
      await ctx.db.insert("os_tasks", {
        workspaceId: WS, title: t.title, status: t.status, priority: t.priority,
        assigneeType: t.aType, assigneeId: t.aId, source: "dataos", blockerReason: t.blocker,
        order: order--, createdBy: "human:thomas", createdAt: now, updatedAt: now,
      } as never)
    }
    const ACTS = [
      { t: "agent", a: "coo", ev: "agent.executed", s: "COO a généré le bilan hebdo acquisition" },
      { t: "agent", a: "agent-analyse", ev: "agent.executed", s: "Analyse : conversion globale 38% (+5pts)" },
      { t: "human", a: "thomas", ev: "task.created", s: "Nouvelle tâche : préparer la démo Schneider" },
      { t: "agent", a: "agent-support-client", ev: "agent.proposed", s: "Proposition : relancer Yasmine par email" },
      { t: "agent", a: "agent-operations", ev: "agent.executed", s: "Contrat envoyé à Émilie Garnier" },
      { t: "system", a: "system", ev: "external", s: "Paiement reçu : Favre Architecture (3 500 CHF)" },
      { t: "agent", a: "coo", ev: "approval", s: "Kickoff Lefebvre approuvé" },
      { t: "agent", a: "agent-kb", ev: "memory.update", s: "Base de connaissance : ajout playbook onboarding" },
      { t: "agent", a: "agent-analyse", ev: "agent.executed", s: "12 leads scorés, 4 prioritaires identifiés" },
      { t: "human", a: "thomas", ev: "task.updated", s: "Tâche déplacée : kickoff Lefebvre → en cours" },
      { t: "system", a: "system", ev: "external", s: "Nouveau lead entrant : Olivier Martin" },
      { t: "agent", a: "agent-operations", ev: "agent.executed", s: "Onboarding Keller : 2ᵉ échéance programmée" },
    ]
    let k = 0
    for (const a of ACTS) {
      await ctx.db.insert("os_activities", {
        workspaceId: WS, actorType: a.t, actorId: a.a, eventType: a.ev, summary: a.s,
        source: "demo", createdAt: new Date(Date.now() - (k++) * 3600000).toISOString(),
      } as never)
    }
    const KN = [
      { kind: "rule", title: "Toujours confirmer le RDV via le lien iClosed", body: "Un RDV n'est compté que si le prospect a cliqué le lien de réservation.", tags: ["prospection", "process"] },
      { kind: "decision", title: "Offre premium plafonnée à 5 000 CHF", body: "Au-delà, passer en devis sur-mesure validé par le COO.", tags: ["pricing"] },
      { kind: "pattern", title: "Objection 'argent' → étaler en 2 échéances", body: "Convertit ~40% des hésitants sur le budget.", tags: ["closing"] },
      { kind: "client_project", title: "Favre Architecture — projet villa", body: "Consulting récurrent, satisfaction élevée, source de références.", tags: ["client", "référence"] },
      { kind: "risk", title: "Dépendance LinkedIn pour l'outbound", body: "70% des leads outbound viennent de LinkedIn — diversifier les canaux.", tags: ["acquisition"] },
      { kind: "memory", title: "Cantons les plus convertis : GE, VD, ZH", body: "Concentrer la prospection sur l'arc lémanique et Zurich.", tags: ["data"] },
      { kind: "rule", title: "Onboarding = 3 tâches obligatoires", body: "Contrat signé, formulaire reçu, kickoff planifié avant 'Setup créé'.", tags: ["onboarding"] },
      { kind: "candidate", title: "Tester un canal email outbound", body: "Hypothèse : compléter LinkedIn par des séquences email ciblées.", tags: ["growth", "à valider"], status: "to_validate" },
    ]
    const now2 = new Date().toISOString()
    for (const d of KN) {
      await ctx.db.insert("os_knowledge", {
        workspaceId: WS, kind: d.kind, title: d.title, body: d.body, status: (d as { status?: string }).status ?? "active",
        tags: d.tags, source: "demo", createdBy: "human:thomas", createdAt: now2, updatedAt: now2,
      } as never)
    }
    return { ok: true, tasks: TASKS.length, activities: ACTS.length, knowledge: KN.length }
  },
})
