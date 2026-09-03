const PIN = '6497'
const KEY = 'hive-admin-ok'

export function isAdminUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function unlockAdmin(pin: string): boolean {
  if (pin.trim() !== PIN) return false
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* private browsing */
  }
  return true
}

export function lockAdmin(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
