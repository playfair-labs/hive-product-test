import { EVENT } from '../data/sessions'
import { inviteUrl, sessionLabel, type Guest } from './opsStore'

export function emailSubject(): string {
  return `Private invitation — ${EVENT.name}`
}

export function emailBody(guest: Guest): string {
  const link = inviteUrl(guest.sessionId, guest.name)
  const time = sessionLabel(guest.sessionId)
  return [
    `Hi ${guest.name.split(' ')[0]},`,
    ``,
    `You’ve been selected for a private product trial session at ${EVENT.from}.`,
    ``,
    `Open your personal invitation here (please don’t forward this link):`,
    link,
    ``,
    `${EVENT.dateLabel}`,
    `${time} · 2 hours`,
    `${EVENT.venue}`,
    `${EVENT.address}`,
    ``,
    `Please RSVP by ${EVENT.rsvpDeadline}.`,
    ``,
    `Looking forward to seeing you,`,
    `Louise`,
    `${EVENT.from}`,
    EVENT.email,
  ].join('\n')
}

export function mailtoHref(guest: Guest): string {
  const params = new URLSearchParams({
    subject: emailSubject(),
    body: emailBody(guest),
  })
  return `mailto:${encodeURIComponent(guest.email)}?${params.toString()}`
}

/** Gmail / YAMM style CSV */
export function mailMergeCsv(guests: Guest[]): string {
  const header = 'Name,Email,FirstName,Session,SessionTime,InviteLink,Subject'
  const lines = guests.map((g) => {
    const first = g.name.split(/\s+/)[0] || g.name
    const link = inviteUrl(g.sessionId, g.name)
    return [
      csv(g.name),
      csv(g.email),
      csv(first),
      csv(g.sessionId),
      csv(sessionLabel(g.sessionId)),
      csv(link),
      csv(emailSubject()),
    ].join(',')
  })
  return [header, ...lines].join('\n')
}

function csv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
