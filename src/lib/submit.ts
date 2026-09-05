import { EVENT } from '../data/sessions'
import { notifyOpsBoard } from './opsNotify'

export type FormKind = 'rsvp' | 'waitlist' | 'consent' | 'cancel'

type Payload = Record<string, string>

function mailtoFallback(kind: FormKind, payload: Payload): void {
  const lines = Object.entries(payload)
    .filter(([k]) => !k.startsWith('_'))
    .map(([k, v]) => `${k}: ${v}`)
  const subject = `[Hive Product Test] ${kind.toUpperCase()} · ${payload.session || 'session'}`
  const body = [`${EVENT.name} — ${kind}`, '', ...lines, '', `Sent from invitation (mailto fallback)`].join(
    '\n',
  )
  const href = `mailto:${encodeURIComponent(EVENT.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = href
}

/**
 * Prefer FormSubmit (email to Hive). If blocked/offline, fall back to mailto
 * so ad blockers can’t kill the RSVP entirely.
 */
export async function submitForm(kind: FormKind, payload: Payload): Promise<void> {
  const endpoint = `https://formsubmit.co/ajax/${EVENT.email}`
  const body = {
    _subject: `[Hive Product Test] ${kind.toUpperCase()} · ${payload.session || 'session'}`,
    _template: 'table',
    _captcha: 'false',
    type: kind,
    ...payload,
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`FormSubmit ${res.status}`)
    }

    await notifyOpsBoard(kind, payload)
    return
  } catch {
    mailtoFallback(kind, payload)
    try {
      await notifyOpsBoard(kind, payload)
    } catch {
      /* ignore */
    }
  }
}
