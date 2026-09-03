import type { SessionId } from '../data/sessions'
import { SESSIONS } from '../data/sessions'

export type Level = 'beginner' | 'intermediate' | 'advanced'
export type GuestStatus = 'draft' | 'sent' | 'confirmed' | 'declined'
export type GuestKind = 'wave1' | 'bench'

export type Guest = {
  id: string
  name: string
  email: string
  level: Level
  sessionId: SessionId
  kind: GuestKind
  status: GuestStatus
  sentAt?: string
  confirmedAt?: string
}

export type OpsState = {
  guests: Guest[]
  /** Optional Google Apps Script / Make.com webhook for live RSVP sync */
  rsvpWebhook: string
  updatedAt: string
}

export const LEVEL_TO_SESSION: Record<Level, SessionId> = {
  beginner: '9am',
  intermediate: '10am',
  advanced: '11am',
}

export const SESSION_CAPACITY = 8

export const PUBLIC_BASE = 'https://playfair-labs.github.io/hive-product-test'

const STORAGE_KEY = 'hive-ops-v1'

export function inviteUrl(sessionId: SessionId, name: string): string {
  return `${PUBLIC_BASE}/${sessionId}?name=${encodeURIComponent(name)}`
}

export function sessionLabel(sessionId: SessionId): string {
  return SESSIONS[sessionId].timeLabel
}

export function parseLevel(raw: string): Level | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if (s.startsWith('beg') || s === 'b' || s === '9' || s === '9am') return 'beginner'
  if (s.startsWith('int') || s === 'i' || s === '10' || s === '10am') return 'intermediate'
  if (s.startsWith('adv') || s === 'a' || s === '11' || s === '11am') return 'advanced'
  return null
}

/** Paste lines: Name, Email, Level  (comma / tab / |) */
export function parseGuestLines(raw: string, kind: GuestKind): Guest[] {
  const out: Guest[] = []
  const seen = new Set<string>()

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || /^name\b/i.test(trimmed)) continue

    const parts = trimmed.split(/[,\t|]/).map((p) => p.trim()).filter(Boolean)
    if (parts.length < 3) continue

    const level = parseLevel(parts[parts.length - 1]!)
    if (!level) continue

    const emailIdx = parts.findIndex((p) => p.includes('@'))
    if (emailIdx < 0) continue

    const email = parts[emailIdx]!.toLowerCase()
    const name = parts.slice(0, emailIdx).join(' ').trim()
    if (!name) continue

    const key = email
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      id: crypto.randomUUID(),
      name,
      email,
      level,
      sessionId: LEVEL_TO_SESSION[level],
      kind,
      status: 'draft',
    })
  }

  return out
}

export function loadOps(): OpsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyOps()
    const parsed = JSON.parse(raw) as OpsState
    if (!Array.isArray(parsed.guests)) return emptyOps()
    return {
      guests: parsed.guests,
      rsvpWebhook: parsed.rsvpWebhook || '',
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return emptyOps()
  }
}

export function saveOps(state: OpsState): void {
  const next = { ...state, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function emptyOps(): OpsState {
  return { guests: [], rsvpWebhook: '', updatedAt: new Date().toISOString() }
}

export function countBySession(
  guests: Guest[],
  status: GuestStatus | GuestStatus[] = ['confirmed'],
): Record<SessionId, number> {
  const want = new Set(Array.isArray(status) ? status : [status])
  const counts: Record<SessionId, number> = { '9am': 0, '10am': 0, '11am': 0 }
  for (const g of guests) {
    if (want.has(g.status)) counts[g.sessionId] += 1
  }
  return counts
}

export function wave2Needs(guests: Guest[]): { sessionId: SessionId; confirmed: number; need: number }[] {
  const confirmed = countBySession(guests, 'confirmed')
  return (Object.keys(SESSIONS) as SessionId[])
    .map((sessionId) => {
      const c = confirmed[sessionId]
      return { sessionId, confirmed: c, need: Math.max(0, SESSION_CAPACITY - c) }
    })
    .filter((row) => row.need > 0)
}

/** Merge imported guests; same email updates name/level if still draft/sent */
export function mergeGuests(existing: Guest[], incoming: Guest[]): Guest[] {
  const byEmail = new Map(existing.map((g) => [g.email.toLowerCase(), g]))
  for (const g of incoming) {
    const prev = byEmail.get(g.email.toLowerCase())
    if (!prev) {
      byEmail.set(g.email.toLowerCase(), g)
      continue
    }
    if (prev.status === 'confirmed' || prev.status === 'declined') continue
    byEmail.set(g.email.toLowerCase(), {
      ...prev,
      name: g.name,
      level: g.level,
      sessionId: g.sessionId,
      kind: g.kind,
    })
  }
  return [...byEmail.values()]
}

export function markConfirmedByName(guests: Guest[], name: string, sessionId?: SessionId): Guest[] {
  const n = name.trim().toLowerCase()
  return guests.map((g) => {
    if (g.name.toLowerCase() !== n) return g
    if (sessionId && g.sessionId !== sessionId) return g
    return { ...g, status: 'confirmed' as const, confirmedAt: new Date().toISOString() }
  })
}
