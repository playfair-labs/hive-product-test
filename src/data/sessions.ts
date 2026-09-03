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

/** Each session is capped at 8 testers */
export const SESSION_CAPACITY = 8

export const EVENT = {
  name: 'The Hive Product Test',
  from: 'The Pickleball Hive',
  dateLabel: 'Saturday 19 September 2026',
  dateShort: 'Sat 19 Sep',
  isoDate: '2026-09-19',
  timeZone: 'Australia/Brisbane',
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

/** Calendar date in Buderim, YYYY-MM-DD */
export function brisbaneDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Open the full day page now (Lloyd sample). Set false to lock until 19 Sep. */
export const DAY_PAGE_OPEN_NOW = true

/** Day page opens on the event date, with ?preview=1, or when DAY_PAGE_OPEN_NOW */
export function isDayPageOpen(params: URLSearchParams, now = new Date()): boolean {
  if (DAY_PAGE_OPEN_NOW) return true
  if (params.get('preview') === '1') return true
  return brisbaneDate(now) >= EVENT.isoDate
}
