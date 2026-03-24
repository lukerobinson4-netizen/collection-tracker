import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Settings } from 'lucide-react'
import { getSupabase, saveConfig, isConfigured, getStoredConfig, resetClient } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import Button from '../components/shared/Button'

export default function AuthPage() {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [sbUrl, setSbUrl] = useState('')
  const [sbKey, setSbKey] = useState('')
  const [configSaved, setConfigSaved] = useState(false)
  const setUser = useAppStore(s => s.setUser)

  useEffect(() => {
    const cfg = getStoredConfig()
    if (cfg) { setSbUrl(cfg.url); setSbKey(cfg.anonKey) }
    else setShowConfig(true)
  }, [])

  const handleSaveConfig = () => {
    if (!sbUrl.trim() || !sbKey.trim()) return
    saveConfig(sbUrl.trim(), sbKey.trim())
    resetClient()
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfigured()) { setError('Please configure Supabase credentials first.'); setShowConfig(true); return }
    setLoading(true); setError('')
    try {
      const sb = getSupabase()
      if (tab === 'signin') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        setUser(data.user)
      } else {
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        if (data.user && !data.user.email_confirmed_at) {
          setError('Check your email to confirm your account, then sign in.')
          setTab('signin')
        } else {
          setUser(data.user)
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center px-4 py-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="font-display text-5xl tracking-widest text-white mb-1">COLLECTION TRACKER</h1>
        <p className="text-[#555] text-sm tracking-widest uppercase">YOUR SHELF. YOUR STORY.</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Tabs */}
        <div className="flex bg-[#141414] border border-[#2a2a2a] rounded-xl p-1 mb-4">
          {(['signin', 'signup'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white/10 text-white' : 'text-[#666] hover:text-[#aaa]'}`}
            >
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'Min. 6 characters' : '••••••••'}
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'} required />
          </div>
          <Button type="submit" variant="primary" fullWidth loading={loading} size="lg"
            style={{ '--accent': '#d97706' } as React.CSSProperties}>
            {tab === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Supabase config */}
        <div className="mt-3 bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowConfig(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#666] hover:text-[#aaa] transition-colors"
          >
            <span className="flex items-center gap-2"><Settings size={14} /> Supabase configuration</span>
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showConfig && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#1e1e1e] pt-3">
              <div>
                <label>Project URL</label>
                <input type="text" value={sbUrl} onChange={e => setSbUrl(e.target.value)}
                  placeholder="https://xxxx.supabase.co" />
              </div>
              <div>
                <label>Anon / Public Key</label>
                <input type="text" value={sbKey} onChange={e => setSbKey(e.target.value)}
                  placeholder="eyJ..." />
              </div>
              <Button onClick={handleSaveConfig} variant="secondary" size="sm">
                {configSaved ? '✓ Saved' : 'Save credentials'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
