'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Database,
  FileText,
  Gauge,
  GitBranch,
  Play,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  TimerReset,
  Wrench,
} from 'lucide-react'

type RuntimeSection = 'runs' | 'logs' | 'cron' | 'approvals' | 'skills' | 'backend' | 'usage'

type RuntimeRun = {
  id: string
  agent: string
  trigger: string
  status: 'running' | 'queued' | 'requires_approval' | 'completed' | 'failed'
  workspace: string
  duration: string
  cost: string
  lastStep: string
}

const sections: { id: RuntimeSection; label: string; count: string; icon: React.ElementType }[] = [
  { id: 'runs', label: 'Sessions / Runs', count: '18', icon: Activity },
  { id: 'logs', label: 'Logs runtime', count: '247', icon: Terminal },
  { id: 'cron', label: 'Cron jobs', count: '6', icon: Clock3 },
  { id: 'approvals', label: 'Approvals', count: '4', icon: ShieldCheck },
  { id: 'skills', label: 'Skills / Tools', count: '32', icon: Wrench },
  { id: 'backend', label: 'Backend status', count: 'OK', icon: Server },
  { id: 'usage', label: 'Usage / coûts', count: 'CHF', icon: Coins },
]

const runs: RuntimeRun[] = [
  {
    id: 'run_8A42',
    agent: 'Sales Qualifier',
    trigger: 'Nouveau message WhatsApp',
    status: 'requires_approval',
    workspace: 'Agence Alpine Homes',
    duration: '01m 42s',
    cost: '0.18 CHF',
    lastStep: 'Réponse prête, en attente validation humaine',
  },
  {
    id: 'run_8A41',
    agent: 'Pipeline Operator',
    trigger: 'Conversation qualifiée',
    status: 'running',
    workspace: 'VividFlow Demo',
    duration: '00m 27s',
    cost: '0.04 CHF',
    lastStep: 'Création opportunité + task follow-up',
  },
  {
    id: 'run_8A40',
    agent: 'Knowledge Curator',
    trigger: 'Upload PDF mandat',
    status: 'completed',
    workspace: 'Léman Invest',
    duration: '02m 11s',
    cost: '0.23 CHF',
    lastStep: 'Mémoire workspace mise à jour avec 9 faits durables',
  },
  {
    id: 'run_8A39',
    agent: 'Ops Watcher',
    trigger: 'Cron 30 min',
    status: 'queued',
    workspace: 'Global Runtime',
    duration: '—',
    cost: '—',
    lastStep: 'Queue Convex scheduler',
  },
]

const logs = [
  { level: 'info', time: '14:22:18', source: 'router', message: 'workspace resolved from Clerk org: org_vividflow_demo' },
  { level: 'tool', time: '14:22:21', source: 'convex', message: 'agentActions.propose created action draft_reply' },
  { level: 'warn', time: '14:22:24', source: 'policy', message: 'external_send blocked: approval required' },
  { level: 'info', time: '14:22:29', source: 'audit', message: 'auditLogs.insert run_8A42 policy_decision=requires_approval' },
]

const cronJobs = [
  { name: 'Inbox triage', cadence: '*/10 * * * *', next: 'dans 6 min', status: 'active' },
  { name: 'Pipeline health', cadence: '0 */2 * * *', next: 'dans 48 min', status: 'active' },
  { name: 'Cost watchdog', cadence: '*/30 * * * *', next: 'dans 17 min', status: 'active' },
]

const approvals = [
  { title: 'Envoyer réponse WhatsApp à Marc D.', risk: 'outbound_message', agent: 'Sales Qualifier', status: 'À valider' },
  { title: 'Déplacer opportunité en Négociation', risk: 'crm_stage_change', agent: 'Pipeline Operator', status: 'À valider' },
  { title: 'Créer tâche relance J+2', risk: 'safe_write', agent: 'Ops Watcher', status: 'Auto-safe' },
]

const statusClasses: Record<RuntimeRun['status'], string> = {
  running: 'border-[#FA5001]/40 bg-[#FA5001]/12 text-[#FFB088]',
  queued: 'border-white/10 bg-white/[0.04] text-white/50',
  requires_approval: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  completed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  failed: 'border-red-400/40 bg-red-400/10 text-red-200',
}

const statusLabels: Record<RuntimeRun['status'], string> = {
  running: 'running',
  queued: 'queued',
  requires_approval: 'approval',
  completed: 'completed',
  failed: 'failed',
}

function MetricCard({ label, value, trend, icon: Icon }: { label: string; value: string; trend: string; icon: React.ElementType }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl vf-hover">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#FA5001]/25 bg-[#FA5001]/10 text-[#FA5001]">
          <Icon size={17} />
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">{trend}</span>
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

function SectionButton({ section, active, onClick }: { section: typeof sections[number]; active: boolean; onClick: () => void }) {
  const Icon = section.icon
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
        active
          ? 'border-[#FA5001]/35 bg-[#FA5001]/14 text-white shadow-[0_12px_36px_rgba(250,80,1,0.12)]'
          : 'border-transparent text-white/48 hover:border-white/10 hover:bg-white/[0.045] hover:text-white/80'
      }`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-[#FA5001] text-white' : 'bg-white/[0.06] text-white/45 group-hover:text-[#FA5001]'}`}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold">{section.label}</span>
        <span className="block text-[10px] text-white/28">workspace scoped</span>
      </span>
      <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold text-white/55">{section.count}</span>
    </button>
  )
}

function RunsPanel({ query }: { query: string }) {
  const filtered = runs.filter(run => `${run.agent} ${run.trigger} ${run.workspace} ${run.id}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="grid min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="min-h-0 rounded-3xl border border-white/10 bg-[#0D0D0F]/78 shadow-2xl backdrop-blur-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0D0D0F]/90 px-4 py-3 backdrop-blur-xl">
          <div>
            <h2 className="text-sm font-bold text-white">Runs actifs</h2>
            <p className="text-[11px] text-white/35">UX héritée Hermes : lignes denses, statuts, trace opérateur.</p>
          </div>
          <button className="flex items-center gap-2 rounded-full bg-[#FA5001] px-3 py-2 text-[11px] font-bold text-white shadow-[0_12px_30px_rgba(250,80,1,0.28)] transition-transform duration-200 hover:scale-[1.02] active:scale-95">
            <Play size={13} /> Nouveau run
          </button>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {filtered.map(run => (
            <button key={run.id} className="grid w-full grid-cols-[110px_1fr_120px_90px] items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.035]">
              <div>
                <p className="font-mono text-[12px] font-bold text-white">{run.id}</p>
                <p className="mt-0.5 text-[10px] text-white/30">{run.duration}</p>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{run.agent}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClasses[run.status]}`}>{statusLabels[run.status]}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-white/42">{run.trigger} · {run.workspace}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-white/70">{run.cost}</p>
                <p className="mt-0.5 text-[10px] text-white/30">coût estimé</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-white/24" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Run details</h2>
            <p className="text-[11px] text-white/35">run_8A42 · approval boundary</p>
          </div>
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">Human-in-the-loop</span>
        </div>

        <div className="mt-5 space-y-3">
          {[
            ['01', 'Message ingéré', 'Conversation liée au contact Marc D.'],
            ['02', 'Contexte chargé', 'CRM + mémoire workspace + politique outil'],
            ['03', 'Action proposée', 'Draft WhatsApp + follow-up task'],
            ['04', 'Blocage sécurité', 'Envoi externe nécessite validation'],
          ].map(([step, title, desc]) => (
            <div key={step} className="flex gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#FA5001]/12 font-mono text-[11px] font-bold text-[#FA5001]">{step}</div>
              <div>
                <p className="text-[12px] font-bold text-white">{title}</p>
                <p className="mt-0.5 text-[11px] text-white/38">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#FA5001]/20 bg-[#FA5001]/8 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#FA5001]">Proposed action</p>
          <p className="mt-2 text-sm font-semibold text-white">Envoyer une réponse de qualification à Marc D.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/45">Le message est préparé mais pas envoyé. La frontière d’approbation est respectée avant tout contact externe.</p>
          <div className="mt-4 flex gap-2">
            <button className="rounded-full bg-[#FA5001] px-4 py-2 text-[12px] font-bold text-white transition-transform duration-200 hover:scale-[1.02] active:scale-95">Approuver</button>
            <button className="rounded-full border border-white/12 px-4 py-2 text-[12px] font-bold text-white/65 transition-colors hover:bg-white/[0.06]">Modifier</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LogsPanel() {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#08090B] p-4 font-mono shadow-2xl">
      <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">
        <Terminal size={14} /> Live runtime logs
      </div>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={`${log.time}-${log.message}`} className="grid grid-cols-[76px_72px_1fr] gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[11px]">
            <span className="text-white/35">{log.time}</span>
            <span className={log.level === 'warn' ? 'text-amber-200' : log.level === 'tool' ? 'text-[#FA5001]' : 'text-emerald-200'}>{log.source}</span>
            <span className="text-white/58">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GenericPanel({ active }: { active: RuntimeSection }) {
  if (active === 'logs') return <LogsPanel />
  if (active === 'cron') {
    return (
      <div className="grid gap-3">
        {cronJobs.map(job => (
          <div key={job.name} className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FA5001]/12 text-[#FA5001]"><TimerReset size={18} /></div>
              <div>
                <p className="text-sm font-bold text-white">{job.name}</p>
                <p className="font-mono text-[11px] text-white/35">{job.cadence} · prochaine exécution {job.next}</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold text-emerald-200">{job.status}</span>
          </div>
        ))}
      </div>
    )
  }
  if (active === 'approvals') {
    return (
      <div className="grid gap-3">
        {approvals.map(item => (
          <div key={item.title} className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200"><ShieldCheck size={18} /></div>
              <div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-[11px] text-white/35">{item.agent} · policy: {item.risk}</p>
              </div>
            </div>
            <button className="rounded-full border border-[#FA5001]/30 bg-[#FA5001]/10 px-3 py-1.5 text-[11px] font-bold text-[#FFB088]">{item.status}</button>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        ['skills', '32 skills activés', 'Procédures métier, outils MCP et playbooks agents'],
        ['backend', 'Convex / Clerk ready', 'Workspace scope, audit logs, policy boundary'],
        ['usage', 'CHF 42.18 estimés', 'Budget guardrail + cost events par workspace'],
      ].map(([key, title, desc]) => (
        <div key={key} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur-xl vf-hover">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FA5001]/25 bg-[#FA5001]/10 text-[#FA5001]">
            {key === 'skills' ? <Wrench size={18} /> : key === 'backend' ? <Database size={18} /> : <Coins size={18} />}
          </div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-2 text-[12px] leading-relaxed text-white/42">{desc}</p>
        </div>
      ))}
    </div>
  )
}

export default function CockpitPage() {
  const [active, setActive] = useState<RuntimeSection>('runs')
  const [query, setQuery] = useState('')
  const activeSection = useMemo(() => sections.find(section => section.id === active)!, [active])

  return (
    <div className="vf-page-enter h-full overflow-hidden bg-[#070708] text-white">
      <div className="relative h-full overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-[#FA5001]/18 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-[-220px] left-24 h-[420px] w-[420px] rounded-full bg-white/[0.045] blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.09]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative flex h-full min-h-0 gap-4 p-4">
          <aside className="hidden w-72 flex-shrink-0 flex-col rounded-[28px] border border-white/10 bg-white/[0.035] p-3 shadow-2xl backdrop-blur-2xl xl:flex">
            <div className="mb-4 rounded-3xl border border-[#FA5001]/20 bg-[#FA5001]/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FA5001] shadow-[0_18px_42px_rgba(250,80,1,.3)]">
                  <Bot size={19} />
                </div>
                <div>
                  <p className="text-sm font-extrabold tracking-tight">VividFlow Cockpit</p>
                  <p className="text-[11px] text-white/45">Hermes-grade runtime</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 overflow-y-auto pr-1 vf-scroll-momentum">
              {sections.map(section => (
                <SectionButton key={section.id} section={section} active={active === section.id} onClick={() => setActive(section.id)} />
              ))}
            </div>

            <div className="mt-auto rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                <Sparkles size={13} /> Doctrine
              </div>
              <p className="text-[12px] leading-relaxed text-white/52">Aucun agent ne modifie le CRM ou n’envoie de message externe sans politique, log et validation quand le risque l’exige.</p>
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="mb-4 rounded-[28px] border border-white/10 bg-white/[0.045] p-4 shadow-2xl backdrop-blur-2xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-[#FA5001]/30 bg-[#FA5001]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFB088]">Agentic OS</span>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200">runtime live</span>
                  </div>
                  <h1 className="text-2xl font-black tracking-[-0.04em] text-white md:text-3xl">Cockpit Hermes pour VividFlow</h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/42">Sessions, runs, logs, cron, approvals, skills et coûts — la couche opérateur qui transforme VividFlow en AGaaS auditable.</p>
                </div>

                <div className="relative w-full lg:w-80">
                  <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search runs, agents, workspaces…"
                    className="h-11 w-full rounded-2xl border border-white/10 bg-black/25 pl-10 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-white/28 focus:border-[#FA5001]/45 focus:ring-4 focus:ring-[#FA5001]/10"
                  />
                </div>
              </div>
            </header>

            <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Runs 24h" value="184" trend="+12%" icon={Gauge} />
              <MetricCard label="Approvals" value="4" trend="safe" icon={ShieldCheck} />
              <MetricCard label="Uptime" value="99.98%" trend="OK" icon={CheckCircle2} />
              <MetricCard label="Alerts" value="1" trend="watch" icon={AlertTriangle} />
            </section>

            <div className="mb-3 flex items-center gap-2 xl:hidden">
              {sections.slice(0, 5).map(section => {
                const Icon = section.icon
                return (
                  <button key={section.id} onClick={() => setActive(section.id)} className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold ${active === section.id ? 'border-[#FA5001]/40 bg-[#FA5001]/14 text-white' : 'border-white/10 bg-white/[0.04] text-white/45'}`}>
                    <Icon size={13} /> {section.label.split(' ')[0]}
                  </button>
                )
              })}
            </div>

            <section className="min-h-0 flex-1 overflow-y-auto vf-scroll-momentum">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/32">
                <GitBranch size={13} /> {activeSection.label}
              </div>
              {active === 'runs' ? <RunsPanel query={query} /> : <GenericPanel active={active} />}
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
