"use client"
// Loop Engineering — DOSSIERS de loops déterministes (data-driven os_kb_docs, docId « loop:… »).
// Chaque loop = un moteur documenté. On peut en créer plusieurs, les ouvrir, les éditer.
import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Workflow, Folder, ArrowLeft, Plus, Pencil, Save, X } from "lucide-react"
import MarkdownView from "@/components/agentic/MarkdownView"

const slugify = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "loop"

const TEMPLATE = (t: string) =>
  `# ${t}\n\n## Objectif\nCe que ce loop fait tourner, de bout en bout.\n\n## La chaîne (étapes + qui fait quoi)\n1. …\n2. …\n\n## Garde-fous\n- …\n\n## Lancement\n- …\n\n## Statut\n- En construction.\n`

function StatusBadge({ status }: { status?: string }) {
  const m: Record<string, { c: string; t: string }> = {
    active: { c: "#16a34a", t: "Actif" },
    review: { c: "#d97706", t: "En revue" },
    draft:  { c: "#9aa0a6", t: "Brouillon" },
  }
  const s = m[status || "draft"] || m.draft
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-auto w-fit" style={{ background: s.c + "16", color: s.c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} /> {s.t}
    </span>
  )
}

export default function LoopEngineeringSection() {
  const docs = useQuery(api.osKbDocs.list)
  const upsert = useMutation(api.osKbDocs.upsert)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  if (docs === undefined) return <p className="text-[12px] text-soren-subtle py-10 text-center">Chargement des loops…</p>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const loops = (docs as any[]).filter(d => String(d.docId || "").startsWith("loop:"))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)))
  const open = loops.find(l => l.docId === openId)

  async function createLoop() {
    const title = window.prompt("Nom du nouveau loop (ex. Onboarding, Closing, Relances…)")?.trim()
    if (!title) return
    const docId = "loop:" + slugify(title)
    await upsert({ docId, title, body: TEMPLATE(title), status: "draft" })
    setOpenId(docId); setDraft(TEMPLATE(title)); setEditing(true)
  }
  async function save() {
    if (!open) return
    await upsert({ docId: open.docId, title: open.title, body: draft, status: open.status || "active" })
    setEditing(false)
  }

  // ── Vue d'un loop ouvert ──
  if (open) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button onClick={() => { setOpenId(null); setEditing(false) }} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-soren-muted hover:text-soren-text"><ArrowLeft size={14} /> Loops</button>
          {!editing
            ? <button onClick={() => { setDraft(open.body); setEditing(true) }} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#FF4D00]"><Pencil size={12} /> Éditer</button>
            : <div className="flex items-center gap-2">
                <button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 text-[11px] text-soren-muted"><X size={12} /> Annuler</button>
                <button onClick={save} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white bg-soren-sidebar px-3 py-1.5 rounded-full"><Save size={12} /> Enregistrer</button>
              </div>}
        </div>
        <div className="flex items-center gap-2"><Workflow size={18} style={{ color: "#FF4D00" }} /><h3 className="text-[15px] font-bold text-soren-text">{open.title}</h3></div>
        {editing
          ? <textarea value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false}
              className="w-full h-[60vh] bg-soren-card border border-soren-border rounded-2xl p-4 text-[12px] font-mono text-soren-text leading-relaxed focus:outline-none focus:border-[#C8CBD0]" />
          : <div className="bg-soren-card border border-soren-border rounded-2xl p-5"><MarkdownView markdown={open.body} /></div>}
      </div>
    )
  }

  // ── Liste des dossiers (loops) ──
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12px] text-soren-muted">Chaque loop est un <b>moteur déterministe documenté</b> (sa chaîne, ses rôles, ses garde-fous). Ouvre un dossier, ou crée-en un nouveau.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {loops.map(l => (
          <button key={l.docId} onClick={() => setOpenId(l.docId)} className="text-left bg-soren-card border border-soren-border rounded-2xl p-4 hover:border-[#C8CBD0] transition-all flex flex-col gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#FF4D0018" }}><Folder size={18} style={{ color: "#FF4D00" }} /></div>
            <span className="text-[12px] font-semibold text-soren-text">{l.title}</span>
            <StatusBadge status={l.status} />
          </button>
        ))}
        <button onClick={createLoop} className="text-left border border-dashed border-soren-border rounded-2xl p-4 hover:border-[#FF4D00] transition-all flex flex-col gap-2 text-soren-muted">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-soren-bg"><Plus size={18} /></div>
          <span className="text-[12px] font-semibold">Nouveau loop</span>
          <span className="text-[10px] text-soren-subtle">Créer un dossier de loop</span>
        </button>
      </div>
    </div>
  )
}
