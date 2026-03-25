import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const LS_KEY = 'ct_supabase_config'
const COOKIE_NAME = 'ct_sb_cfg'
const COOKIE_DAYS = 365

// ─── Cookie helpers ───────────────────────────────────────────────────────────
// Cookies survive iOS PWA storage eviction (7-day inactivity purge on localStorage).

function writeCookie(value: string) {
  const exp = new Date()
  exp.setDate(exp.getDate() + COOKIE_DAYS)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; expires=${exp.toUTCString()}; path=/; SameSite=Strict`
}

function readCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function eraseCookie() {
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getStoredConfig(): { url: string; anonKey: string } | null {
  try {
    // Try localStorage first, fall back to cookie (iOS PWA evicts localStorage)
    const raw = localStorage.getItem(LS_KEY) ?? readCookie()
    if (!raw) return null
    const cfg = JSON.parse(raw)
    // If we got it from the cookie but localStorage was empty, re-sync localStorage
    if (!localStorage.getItem(LS_KEY)) localStorage.setItem(LS_KEY, raw)
    return cfg
  } catch {
    return null
  }
}

export function saveConfig(url: string, anonKey: string) {
  const raw = JSON.stringify({ url, anonKey })
  localStorage.setItem(LS_KEY, raw)
  writeCookie(raw)   // belt-and-suspenders: also persist in cookie
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
  eraseCookie()
}

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (_client) return _client
  const config = getStoredConfig()
  if (!config) throw new Error('No Supabase credentials configured')
  _client = createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return _client
}

export function resetClient() {
  _client = null
}

export function isConfigured(): boolean {
  return !!getStoredConfig()
}
