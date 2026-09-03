import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { getSession } from './data/sessions'
import { Invite } from './pages/Invite'
import { Consent } from './pages/Consent'
import { Louise } from './pages/Louise'

function SessionInvite() {
  const { sessionId } = useParams()
  const session = getSession(sessionId)
  if (!session) {
    return (
      <div className="missing">
        <p>This invitation link isn’t valid.</p>
        <p>Please use the link you were sent.</p>
      </div>
    )
  }
  return <Invite session={session} />
}

function SessionConsent() {
  const { sessionId } = useParams()
  const session = getSession(sessionId)
  if (!session) return <Navigate to="/" replace />
  return <Consent session={session} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/louise" element={<Louise />} />
      <Route path="/" element={<Navigate to="/9am" replace />} />
      <Route path="/:sessionId" element={<SessionInvite />} />
      <Route path="/:sessionId/consent" element={<SessionConsent />} />
      <Route path="*" element={<Navigate to="/9am" replace />} />
    </Routes>
  )
}
