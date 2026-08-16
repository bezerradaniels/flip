import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(
  url
  && key
  && /^https?:\/\//.test(url)
  && !url.includes('SEU-PROJETO')
  && !key.includes('sua_publishable_key'),
)

// A publishable key is safe in the browser. RLS remains responsible for data access.
export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null
