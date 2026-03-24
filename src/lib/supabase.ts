import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'ct_supabase_config'

export function getStoredConfig(): { url: string; anonKey: string } | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveConfig(url: string, anonKey: string) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, anonKey }))
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY)
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
