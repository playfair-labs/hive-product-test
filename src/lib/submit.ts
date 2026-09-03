import { EVENT } from '../data/sessions'

export type FormKind = 'rsvp' | 'waitlist' | 'consent'

type Payload = Record<string, string>

/** Posts to FormSubmit (email to Hive). First real submit triggers their confirm email once. */
export async function submitForm(kind: FormKind, payload: Payload): Promise<void> {
  const endpoint = `https://formsubmit.co/ajax/${EVENT.email}`
  const body = {
    _subject: `[Hive Product Test] ${kind.toUpperCase()} · ${payload.session || 'session'}`,
    _template: 'table',
    _captcha: 'false',
    type: kind,
    ...payload,
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || 'Could not send — please try again')
  }
}
