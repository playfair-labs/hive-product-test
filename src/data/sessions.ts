export type SessionId = '9am' | '10am' | '11am'

export type Session = {
  id: SessionId
  /** Guest-facing time only — never show levels or other sessions */
  timeLabel: string
  timeShort: string
  duration: string
}

/** Edit times here — guests never see other sessions */
export const SESSIONS: Record<SessionId, Session> = {
  '9am': {
    id: '9am',
    timeLabel: '9:00 am',
    timeShort: '9am',
    duration: '2 hours',
  },
  '10am': {
    id: '10am',
    timeLabel: '10:00 am',
    timeShort: '10am',
    duration: '2 hours',
  },
  '11am': {
    id: '11am',
    timeLabel: '11:00 am',
    timeShort: '11am',
    duration: '2 hours',
  },
}

export const EVENT = {
  name: 'The Hive Product Test',
  from: 'The Pickleball Hive',
  dateLabel: 'Saturday 19 September 2026',
  dateShort: 'Sat 19 Sep',
  rsvpDeadline: 'Saturday 12 September 2026',
  venue: 'The Pickleball Hive',
  address: '1/47 Stringybark Rd, Buderim QLD 4556',
  email: 'play@thepickleballhive.au',
} as const

export function getSession(id: string | undefined): Session | null {
  if (!id) return null
  if (id in SESSIONS) return SESSIONS[id as SessionId]
  return null
}
