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
  source?: 'ghl' | 'google' | 'iclosed'
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

