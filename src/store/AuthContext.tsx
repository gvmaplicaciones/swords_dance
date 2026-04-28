// src/store/AuthContext.tsx
// Fuente única de verdad para la sesión de Supabase Auth.
// Se inicializa una sola vez en el árbol y escucha onAuthStateChange una sola vez.

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthCtx {
  session: Session | null
  loading: boolean
}

const Ctx = createContext<AuthCtx | null>(null)

export function useAuthContext(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuthContext must be inside AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    )

    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>
}
