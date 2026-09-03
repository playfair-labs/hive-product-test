import { EVENT } from '../data/sessions'
import type { FormKind } from './submit'

type Payload = Record<string, string>

const RSVP_LOG_KEY = 'hive-rsvp-log-v1'

export type RsvpLogEntry = {
  at: string
  type: FormKind
  name: string
  session: string
  email?: string
  payload: Payload
}

export function readRsvpLog(): RsvpLogEntry[] {
  try {
    const raw = localStorage.getItem(RSVP_LOG_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RsvpLogEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function appendRsvpLog(entry: RsvpLogEntry): void {
  const log = readRsvpLog()
  log.unshift(entry)
  localStorage.setItem(RSVP_LOG_KEY, JSON.stringify(log.slice(0, 500)))
}

/**
 * Notify ops board: local log (same browser) + optional webhook (Sheet / Make / Apps Script).
 * Webhook URL is set in the Operator Console.
 */
export async function notifyOpsBoard(
  kind: FormKind,
  payload: Payload,
  webhookUrl?: string,
): Promise<void> {
  const entry: RsvpLogEntry = {
    at: new Date().toISOString(),
    type: kind,
    name: payload.name || '',
    session: payload.session || '',
    email: payload.email,
    payload,
  }
  try {
    appendRsvpLog(entry)
  } catch {
    /* private browsing etc. */
  }

  const url = (webhookUrl || localStorage.getItem('hive-ops-webhook') || '').trim()
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        event: EVENT.name,
        source: 'hive-product-test',
      }),
      mode: 'cors',
    })
  } catch {
    /* webhook optional — FormSubmit email still works */
  }
}

export function setOpsWebhook(url: string): void {
  localStorage.setItem('hive-ops-webhook', url.trim())
}

export function getOpsWebhook(): string {
  return localStorage.getItem('hive-ops-webhook') || ''
}
