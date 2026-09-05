import { SESSION_CAPACITY, type SessionId } from '../data/sessions'

const STORAGE_KEY = 'hive-seat-v1'
const CANCELLED_KEY = 'hive-seat-cancelled-v1'
const BASE = 'https://abacus.jasoncameron.dev'
const NAMESPACE = import.meta.env.DEV ? 'hive-product-test-dev' : 'hive-product-test-19sep2026'
const TIMEOUT_MS = 7000

export class SessionFullError extends Error {
  constructor() {
    super('This session is full.')
    this.name = 'SessionFullError'
  }
}

type StoredSeat = {
  place: number | null
  at: string
}

function nameSlug(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return slug || 'guest'
}

function storageId(sessionId: SessionId, name: string): string {
  return `${sessionId}:${nameSlug(name)}`
}

function personKey(sessionId: SessionId, name: string): string {
  return `${sessionId}--${nameSlug(name)}`
}

function releasedKey(sessionId: SessionId): string {
  return `${sessionId}--released`
}

function readStore(): Record<string, StoredSeat> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, StoredSeat>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function readCancelled(): Set<string> {
  try {
    const raw = localStorage.getItem(CANCELLED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function writeCancelled(set: Set<string>): void {
  try {
    localStorage.setItem(CANCELLED_KEY, JSON.stringify([...set]))
  } catch {
    /* private browsing */
  }
}

export function readLocalRsvp(sessionId: SessionId, name: string): StoredSeat | null {
  const row = readStore()[storageId(sessionId, name)]
  if (!row || typeof row.at !== 'string') return null
  return row
}

export function saveLocalRsvp(sessionId: SessionId, name: string, place: number | null): void {
  try {
    const all = readStore()
    all[storageId(sessionId, name)] = { place, at: new Date().toISOString() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* private browsing */
  }
}

export function clearLocalRsvp(sessionId: SessionId, name: string): void {
  try {
    const all = readStore()
    delete all[storageId(sessionId, name)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* private browsing */
  }
}

async function abacus<T>(path: string): Promise<T> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal })
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    if (res.ok || res.status === 404 || res.status === 409) return data
    throw new Error(data.error || `Abacus ${res.status}`)
  } finally {
    window.clearTimeout(t)
  }
}

function readValue(data: { value?: unknown; error?: string }): number | null {
  const n = Number(data.value)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function getCounter(key: string): Promise<number> {
  try {
    const data = await abacus<{ value?: number; error?: string }>(
      `/get/${NAMESPACE}/${encodeURIComponent(key)}`,
    )
    if (data.error) return 0
    const n = Number(data.value)
    if (!Number.isFinite(n) || n < 0) return 0
    return Math.floor(n)
  } catch {
    return 0
  }
}

/** Live taken count for a session (hits minus released cancellations). */
export async function getSessionTaken(sessionId: SessionId): Promise<number> {
  const [hits, released] = await Promise.all([
    getCounter(sessionId),
    getCounter(releasedKey(sessionId)),
  ])
  return Math.max(0, hits - released)
}

/**
 * Assign this guest a seat in their session (1–8).
 * Same name + session always gets the same number unless they cancelled.
 */
export async function claimSeat(sessionId: SessionId, name: string): Promise<number | null> {
  const local = readLocalRsvp(sessionId, name)
  if (local?.place && local.place > 0) return local.place

  const mine = personKey(sessionId, name)
  const cancelled = readCancelled()

  try {
    if (!cancelled.has(mine)) {
      const existing = await abacus<{ value?: number; error?: string }>(
        `/get/${NAMESPACE}/${encodeURIComponent(mine)}`,
      )
      const already = existing.error ? null : readValue(existing)
      if (already) {
        saveLocalRsvp(sessionId, name, already)
        return already
      }
    }

    const taken = await getSessionTaken(sessionId)
    if (taken >= SESSION_CAPACITY) {
      throw new SessionFullError()
    }

    const hit = await abacus<{ value?: number }>(`/hit/${NAMESPACE}/${encodeURIComponent(sessionId)}`)
    const hits = readValue(hit)
    if (!hits) return null

    const released = await getCounter(releasedKey(sessionId))
    const place = hits - released
    if (place < 1 || place > SESSION_CAPACITY) {
      throw new SessionFullError()
    }

    await abacus<{ value?: number; error?: string }>(
      `/create/${NAMESPACE}/${encodeURIComponent(mine)}?initializer=${place}`,
    )

    if (cancelled.has(mine)) {
      cancelled.delete(mine)
      writeCancelled(cancelled)
    }

    saveLocalRsvp(sessionId, name, place)
    return place
  } catch (err) {
    if (err instanceof SessionFullError) throw err
    return null
  }
}

/** Free a spot after “I can’t come” — increments released so FOMO count drops. */
export async function releaseSeat(sessionId: SessionId, name: string): Promise<void> {
  clearLocalRsvp(sessionId, name)
  const mine = personKey(sessionId, name)
  const cancelled = readCancelled()
  cancelled.add(mine)
  writeCancelled(cancelled)
  try {
    await abacus(`/hit/${NAMESPACE}/${encodeURIComponent(releasedKey(sessionId))}`)
  } catch {
    /* email still notifies Louise */
  }
}
