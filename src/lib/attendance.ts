import type { SessionId } from '../data/sessions'

const STORAGE_KEY = 'hive-seat-v1'
const BASE = 'https://abacus.jasoncameron.dev'
const NAMESPACE = import.meta.env.DEV ? 'hive-product-test-dev' : 'hive-product-test-19sep2026'
const TIMEOUT_MS = 7000

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

async function abacus<T>(path: string): Promise<T> {
  const ctrl = new AbortController()
  const t = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal })
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    // 404 = no seat yet; 409 = that name already claimed
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

/**
 * Assign this guest a seat in their session (1–8, or above if we over-accept).
 * Same name + session always gets the same number. Safe to call again.
 */
export async function claimSeat(sessionId: SessionId, name: string): Promise<number | null> {
  const local = readLocalRsvp(sessionId, name)
  if (local?.place && local.place > 0) return local.place

  try {
    const mine = personKey(sessionId, name)
    const existing = await abacus<{ value?: number; error?: string }>(
      `/get/${NAMESPACE}/${encodeURIComponent(mine)}`,
    )
    const already = existing.error ? null : readValue(existing)
    if (already) {
      saveLocalRsvp(sessionId, name, already)
      return already
    }

    const hit = await abacus<{ value?: number }>(`/hit/${NAMESPACE}/${encodeURIComponent(sessionId)}`)
    const place = readValue(hit)
    if (!place) return null

    const created = await abacus<{ value?: number; error?: string }>(
      `/create/${NAMESPACE}/${encodeURIComponent(mine)}?initializer=${place}`,
    )
    if (created.error) {
      const again = await abacus<{ value?: number; error?: string }>(
        `/get/${NAMESPACE}/${encodeURIComponent(mine)}`,
      )
      const recovered = again.error ? null : readValue(again)
      if (recovered) {
        saveLocalRsvp(sessionId, name, recovered)
        return recovered
      }
    }

    saveLocalRsvp(sessionId, name, place)
    return place
  } catch {
    return null
  }
}
