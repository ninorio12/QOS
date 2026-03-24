import {
  Mail, Phone, Plus, Calendar, Clock,
  Edit3, Video, TrendingUp, ArrowUpRight,
  ChevronRight, MoreHorizontal,
} from 'lucide-react'

// ─── Data mock ────────────────────────────────────────────────
const metrics = [
  { label: 'Won this month', value: '€124,500', sub: '12 deals', trend: '+18%' },
  { label: 'New customers', value: '34', sub: 'this month', trend: '+7' },
  { label: 'New tasks', value: '18', sub: '5 overdue', trend: null },
]

const interactionCards = [
  {
    color: '#3462EE',
    textColor: 'white',
    date: '12 Mar 2025',
    tag: 'Proposal',
    title: 'Résidence Les Chênes — Lot gros œuvre',
    amount: '€87,000',
    initials: ['TM', 'JL'],
  },
  {
    color: '#EFE347',
    textColor: '#121721',
    date: '08 Mar 2025',
    tag: 'Qualified',
    title: 'Immeuble Haussmann — Rénovation façade',
    amount: '€234,000',
    initials: ['AB'],
  },
  {
    color: '#4A91A8',
    textColor: 'white',
    date: '05 Mar 2025',
    tag: 'Negotiation',
    title: 'Centre commercial Vinci — Lots technique',
    amount: '€512,000',
    initials: ['MR', 'SC', 'TM'],
  },
  {
    color: '#1A2235',
    textColor: 'white',
    date: '01 Mar 2025',
    tag: 'New',
    title: 'Entrepôt logistique — Zone industrielle Est',
    amount: '€68,500',
    initials: ['JL'],
  },
]

const funnelStages = [
  { label: 'New', count: 8, amount: '€340,000', color: '#3D4F6B', pct: 100 },
  { label: 'Contacted', count: 14, amount: '€980,000', color: '#4A91A8', pct: 85 },
  { label: 'Qualified', count: 9, amount: '€1,240,000', color: '#3462EE', pct: 65 },
  { label: 'Proposal sent', count: 6, amount: '€870,000', color: '#C8F135', pct: 42 },
  { label: 'Negotiation', count: 3, amount: '€512,000', color: '#EFE347', pct: 24 },
  { label: 'Won', count: 12, amount: '€124,500', color: '#22c55e', pct: 12 },
]

const tasks = [
  { time: '09:00', title: 'Appel Durand BTP', tag: 'Call', urgent: false },
  { time: '11:30', title: 'Envoi devis Résidence Chênes', tag: 'Email', urgent: true },
  { time: '14:00', title: 'Réunion chantier Haussmann', tag: 'Meeting', urgent: false },
  { time: '16:30', title: 'Relance lot technique Vinci', tag: 'Task', urgent: false },
]

const tagColors: Record<string, string> = {
  Call: '#4A91A8',
  Email: '#3462EE',
  Meeting: '#EFE347',
  Task: '#3D4F6B',
}

const contact = {
  name: 'Thomas Mercier',
  title: 'Directeur Technique',
  company: 'Groupe Bouygues Immobilier',
  email: 'thomas.mercier@bouygues.com',
  phone: '+33 6 12 34 56 78',
  sources: ['WhatsApp', 'LinkedIn', 'Email'],
  deals: 3,
  value: '€319,000',
  lastContact: 'Il y a 2 jours',
}

// ─── Sub-components ───────────────────────────────────────────
function Avatar({ initials, size = 'sm' }: { initials: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-10 h-10 text-sm'
  const colors = ['#3462EE', '#4A91A8', '#C8F135', '#EFE347', '#8896AB']
  const bg = colors[initials.charCodeAt(0) % colors.length]
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold flex-shrink-0 border-2 border-[#121721]`}
      style={{ background: bg, color: bg === '#C8F135' || bg === '#EFE347' ? '#121721' : 'white' }}>
      {initials}
    </div>
  )
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: color + '25', color }}>
      {label}
    </span>
  )
}

// ─── Page ────────────────────────────────────────────────────
export default function DashboardPage() {
  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px]">

      {/* ── Metrics ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Vue d'ensemble</h1>
          <p className="text-sm text-[#8896AB] mt-0.5">Mars 2025</p>
        </div>
        <div className="flex gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-[#1A2235] border border-[#232D3F] rounded-xl px-5 py-3 flex items-center gap-4">
              <div>
                <p className="text-xs text-[#8896AB] mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-white leading-none">{m.value}</p>
                <p className="text-xs text-[#8896AB] mt-1">{m.sub}</p>
              </div>
              {m.trend && (
                <div className="flex items-center gap-1 text-xs font-semibold text-[#C8F135] bg-[#C8F135]/10 px-2 py-1 rounded-lg">
                  <ArrowUpRight size={11} />
                  {m.trend}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-[1fr_1fr_300px] gap-5">

        {/* ── Left: Interaction History ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Interaction History</h2>
            <button className="text-xs text-[#8896AB] hover:text-white flex items-center gap-1 transition-colors">
              Voir tout <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {interactionCards.map((card, i) => (
              <div key={i} className="rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:brightness-110 transition-all"
                style={{ background: card.color }}>
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-medium opacity-70" style={{ color: card.textColor }}>
                    {card.date}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: card.textColor === 'white' ? 'rgba(255,255,255,0.15)' : 'rgba(18,23,33,0.15)',
                      color: card.textColor
                    }}>
                    {card.tag}
                  </span>
                </div>
                <p className="text-sm font-semibold leading-snug" style={{ color: card.textColor }}>
                  {card.title}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-base font-bold" style={{ color: card.textColor }}>
                    {card.amount}
                  </span>
                  <div className="flex -space-x-1.5">
                    {card.initials.map((ini, j) => (
                      <Avatar key={j} initials={ini} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Middle: Funnel + Tasks ── */}
        <div className="flex flex-col gap-5">

          {/* Stage Funnel */}
          <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Stage Funnel</h2>
              <button className="text-[#3D4F6B] hover:text-white transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              {funnelStages.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-medium text-[#8896AB]">{stage.label}</span>
                      <span className="text-[10px] text-[#3D4F6B]">{stage.count}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{stage.amount}</span>
                  </div>
                  <div className="h-1.5 bg-[#232D3F] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${stage.pct}%`, background: stage.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks Today */}
          <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Tâches du jour</h2>
                <p className="text-xs text-[#8896AB] mt-0.5">Mardi 24 Mars</p>
              </div>
              <button className="w-7 h-7 bg-[#3462EE] rounded-lg flex items-center justify-center hover:bg-[#2a50d4] transition-colors">
                <Plus size={13} className="text-white" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {tasks.map((task, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${task.urgent ? 'bg-[#EFE347]/8 border border-[#EFE347]/20' : 'hover:bg-[#232D3F]'}`}>
                  <div className="text-center flex-shrink-0 w-10">
                    <p className="text-[10px] font-bold" style={{ color: tagColors[task.tag] }}>{task.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{task.title}</p>
                  </div>
                  <Tag label={task.tag} color={tagColors[task.tag]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Contact Panel ── */}
        <div className="bg-[#1A2235] border border-[#232D3F] rounded-2xl p-5 flex flex-col gap-5">

          {/* Profile */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3462EE] to-[#4A91A8] flex items-center justify-center text-xl font-bold text-white">
                TM
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#22c55e] border-2 border-[#1A2235] rounded-full" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{contact.name}</h3>
              <p className="text-xs text-[#8896AB] mt-0.5">{contact.title}</p>
              <p className="text-xs text-[#3462EE] mt-0.5">{contact.company}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Edit3, label: 'Éditer', color: '#3462EE' },
              { icon: Mail, label: 'Email', color: '#4A91A8' },
              { icon: Phone, label: 'Appel', color: '#C8F135' },
              { icon: Plus, label: 'Ajouter', color: '#3D4F6B' },
              { icon: Calendar, label: 'Agenda', color: '#EFE347' },
              { icon: Video, label: 'Réunion', color: '#8896AB' },
            ].map(({ icon: Icon, label, color }) => (
              <button key={label}
                className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl hover:bg-[#232D3F] transition-colors group">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: color + '20' }}>
                  <Icon size={15} style={{ color }} />
                </div>
                <span className="text-[10px] text-[#8896AB] group-hover:text-white transition-colors">{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-[#232D3F]" />

          {/* Contact info */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-[#8896AB] uppercase tracking-wider">Informations</h4>
            {[
              { label: 'Email', value: contact.email },
              { label: 'Téléphone', value: contact.phone },
              { label: 'Deals actifs', value: `${contact.deals} deals · ${contact.value}` },
              { label: 'Dernier contact', value: contact.lastContact },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[10px] text-[#3D4F6B] font-medium">{label}</p>
                <p className="text-xs text-white font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-[#232D3F]" />

          {/* Sources */}
          <div>
            <h4 className="text-xs font-semibold text-[#8896AB] uppercase tracking-wider mb-3">Sources</h4>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'WhatsApp', color: '#22c55e' },
                { label: 'LinkedIn', color: '#3462EE' },
                { label: 'Email', color: '#4A91A8' },
                { label: 'Discord', color: '#8B5CF6' },
              ].map(({ label, color }) => (
                <span key={label}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                  style={{ color, borderColor: color + '40', background: color + '10' }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mt-auto">
            <div className="bg-[#232D3F] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-white">{contact.deals}</p>
              <p className="text-[10px] text-[#8896AB]">Deals</p>
            </div>
            <div className="bg-[#232D3F] rounded-xl p-3 text-center">
              <p className="text-base font-bold" style={{ color: '#C8F135' }}>{contact.value}</p>
              <p className="text-[10px] text-[#8896AB]">Pipeline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
