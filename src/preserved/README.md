# Preserved Admin (full feature set)

Snapshot taken before simplifying the live `/admin` page.

| File | Restores to |
|------|-------------|
| `Admin.full.tsx` | `src/pages/Admin.tsx` |
| `AdminGate.full.tsx` | `src/components/AdminGate.tsx` |
| `adminAuth.full.ts` | `src/lib/adminAuth.ts` |
| `roster.full.ts` | `src/lib/roster.ts` |

These files are **not routed**. Do not import them from `App.tsx`.

To restore the full Admin UI: copy a `.full.*` file over its live path (fix imports if needed — same `../lib` / `../data` depth as `pages/` and `components/`).

Included features in `Admin.full.tsx`:
- Replacement alerts + tab title badge
- Per-session capacity pills
- Insurance / CSV / hydrate / paste-import
- Session filters + confirmed lists with remove
- Invite or add + copy link / email
- Removed + restore
- Log out + link to full ops console
