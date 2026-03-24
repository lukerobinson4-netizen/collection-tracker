import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { getSupabase, isConfigured } from './lib/supabase'
import { useAppStore } from './stores/appStore'
import AuthPage from './pages/AuthPage'
import SetupPage from './pages/SetupPage'
import DashboardPage from './pages/DashboardPage'
import CollectionPage from './pages/CollectionPage'
import StatsPage from './pages/StatsPage'
import SharePage from './pages/SharePage'
import ToastContainer from './components/shared/Toast'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAppStore()
  if (!user) return <Navigate to="/auth" replace />
  return <>{children}</>
}

export default function App() {
  const { user, setUser } = useAppStore()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return }

    const sb = getSupabase()
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [setUser])

  // After login, check if user has any collections — redirect to setup if not
  useEffect(() => {
    if (!user || !isConfigured()) return
    const sb = getSupabase()
    sb.from('collections').select('id').eq('user_id', user.id).limit(1).then(({ data }) => {
      if (data && data.length === 0) {
        navigate('/setup', { replace: true })
      } else if (data && data.length > 0) {
        // Stay on current route or go to dashboard
        if (window.location.pathname === '/auth' || window.location.pathname === '/') {
          navigate('/', { replace: true })
        }
      }
    })
  }, [user, navigate])

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-3xl tracking-widest text-[#333] mb-2">COLLECTION TRACKER</div>
          <div className="text-[#333] text-xs">Loading…</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route path="/setup" element={
          <AuthGuard><SetupPage /></AuthGuard>
        } />
        <Route path="/" element={
          <AuthGuard><DashboardPage /></AuthGuard>
        } />
        <Route path="/collection/:id" element={
          <AuthGuard><CollectionPage /></AuthGuard>
        } />
        <Route path="/stats" element={
          <AuthGuard><StatsPage /></AuthGuard>
        } />
        <Route path="/share/:slug" element={<SharePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  )
}
