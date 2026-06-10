export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled'
export type EventType = 'r1' | 'r2' | 'follow_up' | 'interne' | 'client' | 'autre'

export type Appointment = {
  id: string
  calendarId: string
  title: string
  contactName: string
  startTime: string // ISO
  endTime: string   // ISO
  status: AppointmentStatus
  type?: EventType
  calendarName: string
  notes: string | null
  color: string
  source?: 'ghl' | 'google'
  meetLink?: string | null
}

export const TYPE_META: Record<EventType, { label: string; color: string }> = {
  r1:        { label: 'R1',        color: '#16A34A' },
  r2:        { label: 'R2',        color: '#3462EE' },
  follow_up: { label: 'Follow-up', color: '#D97706' },
  interne:   { label: 'Interne',   color: '#8B5CF6' },
  client:    { label: 'Client',    color: '#FF4D00' },
  autre:     { label: 'Autre',     color: '#6B7280' },
}

export const STATUS_META: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmé',  color: '#FF4D00', bg: '#FF4D00' + '18' },
  pending:   { label: 'En attente', color: '#D97706', bg: '#D97706' + '18' },
  cancelled: { label: 'Annulé',    color: '#EF4444', bg: '#EF444418' },
}

// Fallback shown when GHL returns no appointments
export function getMockAppointments(): Appointment[] {
  const now = new Date()
  const day = (offset: number, h: number, m = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  return [
    {
      id: 'mock-1',
      calendarId: '',
      title: 'Appel découverte — Inès Duprez',
      contactName: 'Inès Duprez',
      startTime: day(0, 10, 0),
      endTime:   day(0, 10, 30),
      status: 'confirmed',
      calendarName: 'ACQUISITION',
      notes: 'Premier contact — opportunité CHF20k',
      color: '#3462EE',
    },
    {
      id: 'mock-2',
      calendarId: '',
      title: 'Suivi conversion — Didier Dubois',
      contactName: 'Didier Dubois',
      startTime: day(0, 14, 0),
      endTime:   day(0, 14, 30),
      status: 'pending',
      calendarName: 'ACQUISITION',
      notes: 'En conversation — relance pipeline',
      color: '#D97706',
    },
    {
      id: 'mock-3',
      calendarId: '',
      title: 'RDV qualification — Xavier Alvarez',
      contactName: 'Xavier Alvarez',
      startTime: day(1, 11, 0),
      endTime:   day(1, 11, 30),
      status: 'confirmed',
      calendarName: 'ACQUISITION',
      notes: 'Qualifié — opportunité CHF80k',
      color: '#FF4D00',
    },
    {
      id: 'mock-4',
      calendarId: '',
      title: 'Revue pipeline hebdomadaire',
      contactName: '—',
      startTime: day(2, 9, 0),
      endTime:   day(2, 10, 0),
      status: 'confirmed',
      calendarName: 'Interne',
      notes: null,
      color: '#4A91A8',
    },
    {
      id: 'mock-5',
      calendarId: '',
      title: 'Appel closing — Inès Duprez',
      contactName: 'Inès Duprez',
      startTime: day(3, 15, 0),
      endTime:   day(3, 15, 30),
      status: 'pending',
      calendarName: 'ACQUISITION',
      notes: null,
      color: '#3462EE',
    },
  ]
}
