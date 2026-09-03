import type { SessionId } from '../data/sessions'
import { SESSION_CAPACITY } from '../data/sessions'
import { readRsvpLog } from './opsNotify'

const KEY = 'hive-roster-v1'

export type RosterStatus = 'confirmed' | 'invited' | 'removed'

export type RosterGuest = {
  id: string
  name: string
  email: string
  sessionId: SessionId
  place: number | null
  status: RosterStatus
  at: string
}

function slug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function loadRoster(): RosterGuest[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RosterGuest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRoster(guests: RosterGuest[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(guests))
  } catch {
    /* private browsing */
  }
}

function samePerson(a: RosterGuest, name: string, sessionId: SessionId): boolean {
  return slug(a.name) === slug(name) && a.sessionId === sessionId
}

export function nextPlace(guests: RosterGuest[], sessionId: SessionId): number {
  const used = new Set(
    guests
      .filter((g) => g.sessionId === sessionId && g.status === 'confirmed' && g.place)
      .map((g) => g.place as number),
  )
  for (let i = 1; i <= SESSION_CAPACITY; i += 1) {
    if (!used.has(i)) return i
  }
  return used.size + 1
}

export function upsertConfirmed(
  name: string,
  sessionId: SessionId,
  place: number | null,
  email = '',
): RosterGuest {
  const guests = loadRoster()
  const at = new Date().toISOString()
  const existing = guests.find((g) => samePerson(g, name, sessionId) && g.status !== 'removed')
  const seat = place && place > 0 ? place : nextPlace(guests, sessionId)
  if (existing) {
    const next = guests.map((g) =>
      g.id === existing.id
        ? {
            ...g,
            name: name.trim(),
            email: email || g.email,
            place: seat,
            status: 'confirmed' as const,
            at,
          }
        : g,
    )
    saveRoster(next)
    return next.find((g) => g.id === existing.id)!
  }
  const row: RosterGuest = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email,
    sessionId,
    place: seat,
    status: 'confirmed',
    at,
  }
  saveRoster([row, ...guests])
  return row
}

export function addInvited(name: string, email: string, sessionId: SessionId): RosterGuest {
  const guests = loadRoster()
  const at = new Date().toISOString()
  const existing = guests.find((g) => samePerson(g, name, sessionId) && g.status !== 'removed')
  if (existing) {
    const status: RosterStatus = existing.status === 'confirmed' ? 'confirmed' : 'invited'
    const next = guests.map((g) =>
      g.id === existing.id ? { ...g, email: email || g.email, status, at } : g,
    )
    saveRoster(next)
    return next.find((g) => g.id === existing.id)!
  }
  const row: RosterGuest = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim(),
    sessionId,
    place: null,
    status: 'invited',
    at,
  }
  saveRoster([row, ...guests])
  return row
}

export function removeGuest(id: string): void {
  const guests = loadRoster().map((g) =>
    g.id === id ? { ...g, status: 'removed' as const, place: null, at: new Date().toISOString() } : g,
  )
  saveRoster(guests)
}

export function restoreGuest(id: string): void {
  const guests = loadRoster()
  const target = guests.find((g) => g.id === id)
  if (!target) return
  const place = nextPlace(guests, target.sessionId)
  saveRoster(
    guests.map((g) =>
      g.id === id
        ? { ...g, status: 'confirmed' as const, place, at: new Date().toISOString() }
        : g,
    ),
  )
}

/** Pull same-browser RSVP log into the roster (does not revive removed people). */
export function hydrateFromRsvpLog(): number {
  const guests = loadRoster()
  const removed = new Set(
    guests.filter((g) => g.status === 'removed').map((g) => `${g.sessionId}:${slug(g.name)}`),
  )
  let added = 0
  let next = [...guests]
  for (const entry of readRsvpLog()) {
    if (entry.type !== 'rsvp') continue
    const name = entry.name.trim()
    const sessionId = entry.session as SessionId
    if (!name || (sessionId !== '9am' && sessionId !== '10am' && sessionId !== '11am')) continue
    if (removed.has(`${sessionId}:${slug(name)}`)) continue
    if (next.some((g) => samePerson(g, name, sessionId) && g.status !== 'removed')) continue
    const placeRaw = Number(entry.payload.place)
    const place = Number.isFinite(placeRaw) && placeRaw > 0 ? placeRaw : nextPlace(next, sessionId)
    next = [
      {
        id: crypto.randomUUID(),
        name,
        email: entry.email || '',
        sessionId,
        place,
        status: 'confirmed',
        at: entry.at,
      },
      ...next,
    ]
    added += 1
  }
  if (added) saveRoster(next)
  return added
}

export function exportRosterText(guests: RosterGuest[]): string {
  return guests
    .filter((g) => g.status !== 'removed')
    .map((g) => [g.name, g.email, g.sessionId, g.status, g.place ?? ''].join(', '))
    .join('\n')
}

export function importRosterLines(raw: string): number {
  let n = 0
  for (const line of raw.split(/\r?\n/)) {
    const parts = line.split(',').map((p) => p.trim())
    if (parts.length < 3) continue
    const [name, emailOrSession, sessionOrStatus] = parts
    if (!name) continue
    let email = ''
    let sessionId: SessionId | null = null
    if (emailOrSession === '9am' || emailOrSession === '10am' || emailOrSession === '11am') {
      sessionId = emailOrSession
    } else {
      email = emailOrSession || ''
      if (sessionOrStatus === '9am' || sessionOrStatus === '10am' || sessionOrStatus === '11am') {
        sessionId = sessionOrStatus
      }
    }
    if (!sessionId) continue
    const status = parts.find((p) => p === 'invited' || p === 'confirmed')
    if (status === 'invited') addInvited(name, email, sessionId)
    else {
      const place = Number(parts.find((p) => /^\d+$/.test(p)))
      upsertConfirmed(name, sessionId, Number.isFinite(place) ? place : null, email)
    }
    n += 1
  }
  return n
}

export function activeConfirmed(guests: RosterGuest[], sessionId: SessionId): number {
  return guests.filter((g) => g.sessionId === sessionId && g.status === 'confirmed').length
}
