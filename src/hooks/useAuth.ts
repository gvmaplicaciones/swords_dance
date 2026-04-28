// src/hooks/useAuth.ts
// session/loading provienen de AuthContext (fuente única).
// Este hook solo añade las funciones de acción sobre Supabase Auth.

import { supabase } from '../lib/supabase'
import { useAuthContext } from '../store/AuthContext'

export function useAuth() {
  const { session, loading } = useAuthContext()

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUpWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { session, loading, signInWithGoogle, signOut, signInWithEmail, signUpWithEmail }
}
