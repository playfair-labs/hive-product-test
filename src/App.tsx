import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { AdminGate } from './components/AdminGate'
import { getSession } from './data/sessions'
import { Invite } from './pages/Invite'
import { Day } from './pages/Day'
import { Louise } from './pages/Louise'
import { Ops } from './pages/Ops'
import { Admin } from './pages/Admin'

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

function SessionDay() {
  const { sessionId } = useParams()
  const session = getSession(sessionId)
  if (!session) return <Navigate to="/" replace />
  return <Day session={session} />
}

function ConsentToDay() {
  const { sessionId } = useParams()
  const [params] = useSearchParams()
  const q = params.toString()
  return <Navigate to={q ? `/${sessionId}/day?${q}` : `/${sessionId}/day`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/ops"
        element={
          <AdminGate>
            <Ops />
          </AdminGate>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminGate>
            <Admin />
          </AdminGate>
        }
      />
      <Route path="/louise" element={<Louise />} />
      <Route path="/" element={<Navigate to="/9am" replace />} />
      <Route path="/:sessionId" element={<SessionInvite />} />
      <Route path="/:sessionId/day" element={<SessionDay />} />
      <Route path="/:sessionId/consent" element={<ConsentToDay />} />
      <Route path="*" element={<Navigate to="/9am" replace />} />
    </Routes>
  )
}
