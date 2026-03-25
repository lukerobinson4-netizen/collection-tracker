import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Lock, Settings, LogOut, Link, ChevronDown, ChevronUp } from 'lucide-react'
import { getSupabase, getStoredConfig, saveConfig, resetClient, clearConfig } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import Button from '../components/shared/Button'

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e1e1e]">
        <span className="text-[#555]">{icon}</span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, setUser } = useAppStore()

  // ── Profile fields ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name ?? '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // ── Password fields ─────────────────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // ── Supabase config ─────────────────────────────────────────────────────────
  const [showConfig, setShowConfig] = useState(false)
  const [sbUrl, setSbUrl] = useState('')
  const [sbKey, setSbKey] = useState('')
  const [configSaved, setConfigSaved] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    const cfg = getStoredConfig()
    if (cfg) { setSbUrl(cfg.url); setSbKey(cfg.anonKey) }
  }, [])

  // ── Profile save ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMsg('')
    try {
      const sb = getSupabase()
      const { data, error } = await sb.auth.updateUser({ data: { full_name: displayName.trim() } })
      if (error) throw error
      setUser(data.user)
      setProfileMsg('Saved!')
      setTimeout(() => setProfileMsg(''), 2500)
    } catch (e: unknown) {
      setProfileMsg(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setProfileSaving(false)
    }
  }

  // ── Password save ───────────────────────────────────────────────────────────
  const handleSavePassword = async () => {
    setPasswordError('')
    setPasswordMsg('')
    if (newPassword.length < 6) { setPasswordError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      const sb = getSupabase()
      const { error } = await sb.auth.updateUser({ password: newPassword })
      if (error) throw error
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMsg('Password updated!')
      setTimeout(() => setPasswordMsg(''), 3000)
    } catch (e: unknown) {
      setPasswordError(e instanceof Error ? e.message : 'Failed to update password')
    } finally {
      setPasswordSaving(false)
    }
  }

  // ── Supabase config ─────────────────────────────────────────────────────────
  const handleSaveConfig = () => {
    if (!sbUrl.trim() || !sbKey.trim()) return
    saveConfig(sbUrl.trim(), sbKey.trim())
    resetClient()
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2000)
  }

  const handleCopySetupLink = () => {
    const encoded = btoa(JSON.stringify({ url: sbUrl.trim(), key: sbKey.trim() }))
    const link = `${window.location.origin}/auth?setup=${encoded}`
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    })
  }

  // ── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      const sb = getSupabase()
      await sb.auth.signOut()
    } catch { /* ignore */ }
    clearConfig()
    resetClient()
    setUser(null)
    navigate('/auth', { replace: true })
  }

  const email = user?.email ?? ''
  const initials = (displayName || email).charAt(0).toUpperCase()

  return (
    <div className="min-h-dvh bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1a1a1a] px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-lg text-[#666] hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-xl tracking-widest">ACCOUNT</h1>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-lg mx-auto space-y-4">

        {/* Avatar + email */}
        <div className="flex items-center gap-4 bg-[#141414] border border-[#2a2a2a] rounded-2xl px-5 py-4">
          <div className="w-14 h-14 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-xl font-semibold text-[#888] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{displayName || 'No display name'}</p>
            <p className="text-sm text-[#555] truncate">{email}</p>
          </div>
        </div>

        {/* Profile */}
        <Section title="Profile" icon={<User size={15} />}>
          <div>
            <label>Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <label>Email</label>
            <input type="email" value={email} disabled className="opacity-50 cursor-not-allowed" />
            <p className="text-xs text-[#555] mt-1">Email cannot be changed here.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={handleSaveProfile} loading={profileSaving}
              style={{ '--accent': '#d97706' } as React.CSSProperties}>
              Save changes
            </Button>
            {profileMsg && <span className="text-sm text-[#888]">{profileMsg}</span>}
          </div>
        </Section>

        {/* Password */}
        <Section title="Change Password" icon={<Lock size={15} />}>
          <div>
            <label>New password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label>Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-400">{passwordError}</p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleSavePassword} loading={passwordSaving}
              disabled={!newPassword || !confirmPassword}>
              Update password
            </Button>
            {passwordMsg && <span className="text-sm text-green-400">{passwordMsg}</span>}
          </div>
        </Section>

        {/* Supabase config */}
        <Section title="Database connection" icon={<Settings size={15} />}>
          <button
            onClick={() => setShowConfig(v => !v)}
            className="w-full flex items-center justify-between text-sm text-[#666] hover:text-[#aaa] transition-colors"
          >
            <span>Supabase configuration</span>
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showConfig && (
            <div className="space-y-3 pt-1">
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
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveConfig} variant="secondary" size="sm">
                  {configSaved ? '✓ Saved' : 'Save credentials'}
                </Button>
                {sbUrl.trim() && sbKey.trim() && (
                  <Button onClick={handleCopySetupLink} variant="ghost" size="sm"
                    title="Copy a link to transfer credentials to your iPhone PWA">
                    <Link size={13} />
                    {linkCopied ? 'Copied!' : 'Copy setup link'}
                  </Button>
                )}
              </div>
              {linkCopied && (
                <p className="text-xs text-[#555]">Open that link inside the installed PWA on your iPhone — credentials load automatically.</p>
              )}
            </div>
          )}
        </Section>

        {/* Sign out */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl px-5 py-4">
          <Button variant="danger" fullWidth onClick={handleSignOut}>
            <LogOut size={15} />
            Sign out
          </Button>
        </div>

      </main>
    </div>
  )
}
