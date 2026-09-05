export type SessionId = 'sat-7am' | 'sat-6pm' | 'sun-7am'

export type SessionLevel = 'beginner' | 'intermediate' | 'advanced'

export type Session = {
  id: SessionId
  /** Guest-facing — never show levels or other sessions */
  dateLabel: string
  dateShort: string
  isoDate: string
  timeLabel: string
  timeEndLabel: string
  timeShort: string
  duration: string
  /** Staff only — never shown on guest invite */
  level: SessionLevel
  staffLabel: string
}

/** Edit times here — guests never see other sessions */
export const SESSIONS: Record<SessionId, Session> = {
  'sat-7am': {
    id: 'sat-7am',
    dateLabel: 'Saturday 19 September 2026',
    dateShort: 'Sat 19 Sep',
    isoDate: '2026-09-19',
    timeLabel: '7:00 am',
    timeEndLabel: '9:00 am',
    timeShort: '7am',
    duration: '2 hours',
    level: 'beginner',
    staffLabel: 'Sat 7–9am · Beginners',
  },
  'sat-6pm': {
    id: 'sat-6pm',
    dateLabel: 'Saturday 19 September 2026',
    dateShort: 'Sat 19 Sep',
    isoDate: '2026-09-19',
    timeLabel: '6:00 pm',
    timeEndLabel: '8:00 pm',
    timeShort: '6pm',
    duration: '2 hours',
    level: 'intermediate',
    staffLabel: 'Sat 6–8pm · Intermediate',
  },
  'sun-7am': {
    id: 'sun-7am',
    dateLabel: 'Sunday 20 September 2026',
    dateShort: 'Sun 20 Sep',
    isoDate: '2026-09-20',
    timeLabel: '7:00 am',
    timeEndLabel: '9:00 am',
    timeShort: '7am',
    duration: '2 hours',
    level: 'advanced',
    staffLabel: 'Sun 7–9am · Advanced',
  },
}

/** Old invite paths → current session ids */
export const SESSION_REDIRECTS: Record<string, SessionId> = {
  '9am': 'sat-7am',
  'sat-9am': 'sat-7am',
  '10am': 'sat-6pm',
  '11am': 'sun-7am',
}

/** Each session is capped at 8 testers */
export const SESSION_CAPACITY = 8

export const EVENT = {
  name: 'The Hive Product Test',
  from: 'The Pickleball Hive',
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

export function resolveSessionId(id: string | undefined): SessionId | null {
  if (!id) return null
  if (id in SESSIONS) return id as SessionId
  if (id in SESSION_REDIRECTS) return SESSION_REDIRECTS[id]!
  return null
}

export function isSessionId(value: string): value is SessionId {
  return value in SESSIONS
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

/** Open the full day page now (Lloyd sample). Set false to lock until the session date. */
export const DAY_PAGE_OPEN_NOW = true

/** Day page opens on the session date, with ?preview=1, or when DAY_PAGE_OPEN_NOW */
export function isDayPageOpen(
  params: URLSearchParams,
  session: Session,
  now = new Date(),
): boolean {
  if (DAY_PAGE_OPEN_NOW) return true
  if (params.get('preview') === '1') return true
  return brisbaneDate(now) >= session.isoDate
}
