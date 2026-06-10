'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Phone, MessageSquare, Clock, CalendarCheck, XCircle, Percent, BarChart3, Target, Plus, Check, Trash2, X, Pencil, CalendarDays, Banknote, type LucideIcon } from 'lucide-react'
import { DateRangePicker } from '@/components/shared/DateRangePicker'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const today = () => localDate(new Date())
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function addDays(base: string, n: number) { const d = new Date(base); d.setDate(d.getDate() + n); return iso(d) }
function setterKey(name: string) { return 'human:' + (name.trim().split(/\s+/)[0] || 'setter').toLowerCase() }

const APPEL_PRESETS = [50, 100, 120, 150].map(n => ({ title: `Appeler ${n} leads`, target: n, metric: 'appels' }))
const R1_PRESETS = [2, 5, 10, 15].map(n => ({ title: `Booker ${n} R1`, target: n, metric: 'r1' }))

function TaskRow({ t, onToggle, onEdit, onDelete }: {
  t: { id: string; title: string; targetNumber: number; progress: number; status: string; metric?: string }
  onToggle: () => void; onEdit: (p: { title?: string }) => void; onDelete: () => void
}) {
  const [title, setTitle] = useState(t.title)
  useEffect(() => setTitle(t.title), [t.title])
  const auto = !!t.metric
  const done = t.status === 'done'
  const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.targetNumber)) * 100))
  const Checkbox = (
    <button onClick={onToggle} disabled={auto} title={done ? 'Terminé' : auto ? 'Automatique' : 'À faire'}
      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors border disabled:cursor-default"
      style={done ? { background: '#16A34A', borderColor: '#16A34A' } : { borderColor: '#D1D5DB' }}>
      {done && <Check size={12} className="text-white" />}
    </button>
  )

  if (!auto) {
    return (
      <div className="bg-soren-elevated/50 rounded-lg px-3 py-2 flex items-center gap-2.5 group">
        {Checkbox}
        <div className="flex-1 min-w-0 relative">
          <input value={title} autoFocus={!t.title} placeholder="Nom de l'objectif…"
            onChange={e => setTitle(e.target.value)} onBlur={() => { if (title.trim() && title !== t.title) onEdit({ title: title.trim() }) }}
            className={`w-full text-[11px] font-normal bg-transparent outline-none rounded px-1 py-0.5 hover:bg-soren-card focus:bg-soren-card transition-colors ${done ? 'text-soren-subtle line-through' : 'text-soren-text'}`} />
          <Pencil size={10} className="absolute right-1 top-1/2 -translate-y-1/2 text-[#C4C4C0] opacity-0 group-hover:opacity-100 pointer-events-none" />
        </div>
        <button onClick={onDelete} className="w-6 h-6 rounded-full text-soren-subtle hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
      </div>
    )
  }

  return (
    <div className="bg-soren-elevated/50 rounded-lg px-3 py-2 flex items-center gap-2.5 group">
      {Checkbox}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={`flex-1 min-w-0 truncate text-[11px] font-normal flex items-center gap-1 ${done ? 'text-soren-subtle line-through' : 'text-soren-text'}`}>
            {t.title}<span className="text-[8px] font-bold text-[#3462EE] bg-[#3462EE]/10 px-1 rounded-full">auto</span>
          </span>
          <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: done ? '#16A34A' : '#111' }}>{t.progress}/{t.targetNumber}</span>
        </div>
        <div className="h-1.5 rounded-full bg-soren-card overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? '#16A34A' : '#FF4D00' }} />
        </div>
      </div>
      <button onClick={onDelete} className="w-6 h-6 rounded-full text-soren-subtle hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
    </div>
  )
}

function KpiMini({ label, value, suffix, formula, Icon, color }: { label: string; value: number; suffix?: string; formula?: string; Icon: LucideIcon; color: string }) {
  return (
    <div className="bg-soren-card rounded-2xl p-3 md:p-4 flex flex-col gap-1.5 shadow-sm border border-soren-border/60">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-soren-muted leading-none">{label}</span>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: color + '18', color }}><Icon size={15} /></span>
      </div>
      <span className="text-[20px] md:text-[22px] font-bold text-soren-text leading-none tabular-nums">{value}{suffix}</span>
      <span className="text-[10px] font-semibold text-[#FF4D00]/70">{formula ?? 'durant la période'}</span>
    </div>
  )
}

function AddModal({ has, onClose, onPersonal, onAuto }: { has: (t: string) => boolean; onClose: () => void; onPersonal: (title: string) => void; onAuto: (p: { title: string; target: number; metric: string }) => void }) {
  const [title, setTitle] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-soren-card rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4" style={{ animation: 'fadeSlideUp 200ms ease-out both' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black text-soren-text">Ajouter un objectif</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-soren-elevated flex items-center justify-center hover:bg-[#E5E7EB]"><X size={13} className="text-soren-muted" /></button>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Objectif personnel</p>
          <div className="flex items-center gap-2">
            <input value={title} autoFocus onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && title.trim()) { onPersonal(title.trim()); onClose() } }}
              placeholder="Ex : Préparer mes scripts d'appel"
              className="flex-1 bg-soren-elevated rounded-xl px-3 py-2 text-[12px] text-soren-text placeholder-[#9CA3AF] outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
            <button onClick={() => { if (title.trim()) { onPersonal(title.trim()); onClose() } }} disabled={!title.trim()}
              className="bg-[#FF4D00] text-white text-[12px] font-semibold px-3.5 py-2 rounded-xl hover:brightness-110 disabled:opacity-40 transition-all">Créer</button>
          </div>
        </div>
        <div className="h-px bg-soren-border" />
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-soren-subtle">Objectifs automatiques</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold text-soren-subtle">Appels</span>
            {APPEL_PRESETS.map(p => (
              <button key={p.title} disabled={has(p.title)} onClick={() => onAuto(p)}
                className="text-[11px] font-semibold border border-dashed border-soren-border rounded-full px-2.5 py-1 transition-colors disabled:opacity-30 disabled:line-through text-soren-muted hover:border-[#3462EE] hover:text-[#3462EE]">{p.title}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold text-soren-subtle">R1</span>
            {R1_PRESETS.map(p => (
              <button key={p.title} disabled={has(p.title)} onClick={() => onAuto(p)}
                className="text-[11px] font-semibold border border-dashed border-soren-border rounded-full px-2.5 py-1 transition-colors disabled:opacity-30 disabled:line-through text-soren-muted hover:border-[#16A34A] hover:text-[#16A34A]">{p.title}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PerformanceView() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (useQuery(api.users.list, {}) ?? []) as any[]
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [custom, setCustom] = useState<{ from: string; to: string; label: string } | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const now = new Date()
  const tzOffset = new Date().getTimezoneOffset()

  const taskSetter = users[0] ? setterKey(users[0].name) : 'human:thomas'

  const { from, to } = useMemo(() => {
    const t = today()
    if (preset === 'custom' && custom) return { from: custom.from, to: custom.to }
    if (preset === 'week') return { from: addDays(t, -6), to: t }
    if (preset === 'month') return { from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: t }
    return { from: t, to: t }
  }, [preset, custom]) // eslint-disable-line react-hooks/exhaustive-deps

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (useQuery(api.performance.summary, { from, to, tzOffset }) ?? {}) as any
  // Objectifs sur la plage sélectionnée (manuels indépendants, auto agrégés)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const objectives = (useQuery(api.performance.objectivesForRange, { from, to, tzOffset }) ?? []) as any[]

  const createTask = useMutation(api.performance.dailyTasksCreate)
  const updateTask = useMutation(api.performance.dailyTasksUpdate)
  const removeTask = useMutation(api.performance.dailyTasksRemove)

  const globalPct = objectives.length
    ? Math.round(objectives.reduce((sum, t) => sum + (t.status === 'done' ? 1 : Math.min(t.progress / Math.max(1, t.targetNumber), 1)), 0) / objectives.length * 100)
    : 0
  const gaugeDone = globalPct >= 100
  const gaugeColor = gaugeDone ? '#16A34A' : '#FF4D00'
  const gaugeTitle = preset === 'today' ? 'Objectif du jour' : 'Objectifs de la période'

  return (
    <div className="h-full overflow-y-auto bg-soren-app">
      <div className="p-5 flex flex-col gap-5 max-w-[1400px] mx-auto">

        {/* ── KPI (au-dessus, sans titre) ── */}
        <section className="flex flex-col gap-2.5">
          <div className="flex justify-end items-center gap-2">
            <div className="flex items-center gap-1 bg-soren-card border border-soren-border rounded-full p-0.5">
              {(['today', 'week', 'month'] as const).map(r => (
                <button key={r} onClick={() => setPreset(r)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${preset === r ? 'bg-soren-sidebar text-white' : 'text-soren-muted hover:text-soren-text'}`}>
                  {r === 'today' ? "Aujourd'hui" : r === 'week' ? 'Semaine' : 'Mois'}
                </button>
              ))}
            </div>
            <div className="relative">
              <button onClick={() => setCalOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all ${preset === 'custom' ? 'bg-soren-sidebar text-white border-soren-sidebar' : 'bg-soren-card border-soren-border text-soren-muted hover:text-soren-text'}`}>
                <CalendarDays size={13} /> {preset === 'custom' && custom ? custom.label : 'Période'}
              </button>
              {calOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCalOpen(false)} />
                  {/* Ancrage 640px à droite → le picker (self left-0) s'ouvre vers la gauche, visible */}
                  <div className="absolute right-0 top-full z-50" style={{ width: 640, height: 0 }}>
                    <DateRangePicker
                      onClose={() => setCalOpen(false)}
                      onApply={(start, end, label) => { setCustom({ from: localDate(start), to: localDate(end), label }); setPreset('custom'); setCalOpen(false) }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <KpiMini label="Leads contactés" value={s.contactes ?? 0} Icon={Phone} color="#3462EE" />
            <KpiMini label="Réponses" value={s.reponses ?? 0} Icon={MessageSquare} color="#0EA5E9" />
            <KpiMini label="Taux réponse" value={s.tauxReponse ?? 0} suffix="%" formula="Réponses ÷ contactés" Icon={Percent} color="#0EA5E9" />
            <KpiMini label="À rappeler" value={s.aRappeler ?? 0} Icon={Clock} color="#D97706" />
            <KpiMini label="R1 bookés" value={s.r1Booked ?? 0} Icon={CalendarCheck} color="#16A34A" />
            <KpiMini label="Perdus" value={s.perdus ?? 0} Icon={XCircle} color="#9CA3AF" />
            <KpiMini label="Taux de conversion R1" value={s.conversionR1 ?? 0} suffix="%" formula="R1 ÷ contactés" Icon={BarChart3} color="#FF4D00" />
            <KpiMini label="CA généré" value={s.caGenere ?? 0} suffix=" CHF" formula="Via appels" Icon={Banknote} color="#16A34A" />
          </div>
        </section>

        {/* ── Objectif du jour (jauge + objectifs dans la même carte) ── */}
        <section>
          <div className="bg-soren-card border border-soren-border rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-2 text-[13px] font-bold text-soren-text">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: gaugeColor + '18', color: gaugeColor }}><Target size={15} /></span>
                  {gaugeTitle}
                </span>
                <span className="text-[15px] font-black tabular-nums" style={{ color: gaugeColor }}>{globalPct}%{gaugeDone && ' ✓'}</span>
              </div>
              <div className="h-2 rounded-full bg-soren-elevated overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${globalPct}%`, background: gaugeColor }} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {objectives.map(t => (
                <TaskRow key={t.id} t={t}
                  onToggle={() => updateTask({ id: t.id as never, status: t.status === 'done' ? (t.progress > 0 ? 'in_progress' : 'todo') : 'done' })}
                  onEdit={p => updateTask({ id: t.id as never, ...p })}
                  onDelete={() => (t.ids ?? [t.id]).forEach((id: string) => removeTask({ id: id as never }))} />
              ))}
            </div>
            {objectives.length === 0 && <p className="text-[11px] text-soren-subtle text-center py-2">Aucun objectif sur cette période.</p>}

            <button onClick={() => setShowAdd(true)} className="self-start flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF4D00] rounded-full px-3 py-1.5 hover:brightness-110 transition-all">
              <Plus size={12} /> Ajouter un objectif
            </button>
          </div>
        </section>
      </div>

      {showAdd && (
        <AddModal
          has={t => objectives.some(x => x.title === t)}
          onClose={() => setShowAdd(false)}
          onPersonal={title => createTask({ setter: taskSetter, date: today(), title, targetNumber: 1 })}
          onAuto={p => createTask({ setter: taskSetter, date: today(), title: p.title, targetNumber: p.target, metric: p.metric })}
        />
      )}
    </div>
  )
}
