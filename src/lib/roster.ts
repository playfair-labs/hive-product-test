import type { SessionId } from '../data/sessions'
import { SESSION_CAPACITY, SESSIONS, isSessionId, resolveSessionId } from '../data/sessions'
import { readRsvpLog } from './opsNotify'

const KEY = 'hive-roster-v1'

export type RosterStatus = 'confirmed' | 'invited' | 'cancelled' | 'removed'

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

/** Guest said they can’t come — frees the spot for a replacement invite. */
export function cancelGuest(name: string, sessionId: SessionId): RosterGuest | null {
  const guests = loadRoster()
  const at = new Date().toISOString()
  const existing = guests.find((g) => samePerson(g, name, sessionId) && g.status !== 'removed')
  if (existing) {
    const next = guests.map((g) =>
      g.id === existing.id
        ? { ...g, status: 'cancelled' as const, place: null, at }
        : g,
    )
    saveRoster(next)
    return next.find((g) => g.id === existing.id)!
  }
  const row: RosterGuest = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: '',
    sessionId,
    place: null,
    status: 'cancelled',
    at,
  }
  saveRoster([row, ...guests])
  return row
}

export function markReplacementSent(id: string): void {
  const guests = loadRoster().map((g) =>
    g.id === id && g.status === 'cancelled'
      ? { ...g, status: 'removed' as const, at: new Date().toISOString() }
      : g,
  )
  saveRoster(guests)
}

export function needsReplacement(guests: RosterGuest[]): RosterGuest[] {
  return guests.filter((g) => g.status === 'cancelled')
}

/** Plain names list for insurance / clipboard — confirmed only. */
export function exportInsuranceList(guests: RosterGuest[]): string {
  const lines: string[] = []
  for (const id of Object.keys(SESSIONS) as SessionId[]) {
    const rows = guests
      .filter((g) => g.sessionId === id && g.status === 'confirmed')
      .sort((a, b) => (a.place ?? 99) - (b.place ?? 99))
    if (!rows.length) continue
    lines.push(SESSIONS[id].staffLabel)
    for (const g of rows) {
      lines.push(
        `${g.place ? `${g.place}. ` : ''}${g.name}${g.email ? ` <${g.email}>` : ''}`,
      )
    }
    lines.push('')
  }
  return lines.join('\n').trim()
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
    const name = entry.name.trim()
    const sessionId = resolveSessionId(entry.session)
    if (!name || !sessionId) continue
    if (removed.has(`${sessionId}:${slug(name)}`)) continue

    if (entry.type === 'cancel') {
      const idx = next.findIndex((g) => samePerson(g, name, sessionId) && g.status !== 'removed')
      if (idx >= 0) {
        if (next[idx]!.status === 'cancelled') continue
        next[idx] = {
          ...next[idx]!,
          status: 'cancelled',
          place: null,
          at: entry.at,
        }
      } else {
        next.unshift({
          id: crypto.randomUUID(),
          name,
          email: entry.email || '',
          sessionId,
          place: null,
          status: 'cancelled',
          at: entry.at,
        })
      }
      added += 1
      continue
    }

    if (entry.type !== 'rsvp') continue
    if (next.some((g) => samePerson(g, name, sessionId) && g.status === 'confirmed')) continue

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
      ...next.filter((g) => !(samePerson(g, name, sessionId) && g.status !== 'removed')),
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
    const asSession = resolveSessionId(emailOrSession || '')
    if (asSession) {
      sessionId = asSession
    } else {
      email = emailOrSession || ''
      sessionId = resolveSessionId(sessionOrStatus || '')
    }
    if (!sessionId || !isSessionId(sessionId)) continue
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
