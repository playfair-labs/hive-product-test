import { Navigate } from 'react-router-dom'

/** Old bookmark — Operator Console lives at /ops */
export function Louise() {
  return <Navigate to="/ops" replace />
}
