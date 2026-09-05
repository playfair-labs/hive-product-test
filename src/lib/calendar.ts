import type { Session } from '../data/sessions'
import { EVENT } from '../data/sessions'

/** Parse guest-facing times like "9:00 am" / "6:00 pm" into 24h parts. */
function parseClock(label: string): { h: number; m: number } {
  const m = label.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i)
  if (!m) return { h: 9, m: 0 }
  let h = Number(m[1])
  const min = Number(m[2])
  const ap = m[3]!.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  return { h, m: min }
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function icsStamp(isoDate: string, clock: string): string {
  const { h, m } = parseClock(clock)
  const [y, mo, d] = isoDate.split('-')
  return `${y}${mo}${d}T${pad(h)}${pad(m)}00`
}

function fold(line: string): string {
  return line.replace(/\n/g, '\\n').replace(/,/g, '\\,')
}

/** Download a Brisbane-local .ics for this session. */
export function downloadSessionCalendar(session: Session): void {
  const start = icsStamp(session.isoDate, session.timeLabel)
  const end = icsStamp(session.isoDate, session.timeEndLabel)
  const uid = `hive-${session.id}-${session.isoDate}@thepickleballhive.au`
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Pickleball Hive//Product Test//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART;TZID=Australia/Brisbane:${start}`,
    `DTEND;TZID=Australia/Brisbane:${end}`,
    `SUMMARY:${fold(`${EVENT.name} · ${session.timeLabel}`)}`,
    `LOCATION:${fold(`${EVENT.venue}, ${EVENT.address}`)}`,
    `DESCRIPTION:${fold(`Private product test at ${EVENT.venue}. Keep this invite for the day.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hive-${session.id}.ics`
  a.click()
  URL.revokeObjectURL(url)
}
