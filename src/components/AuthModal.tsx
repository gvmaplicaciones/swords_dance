import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'

type Mode = 'login' | 'register'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  const { t } = useTranslation()

  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      setError(t('authModal.emailRequired'))
      return
    }
    setError('')
    setLoading(true)

    const result = mode === 'login'
      ? await signInWithEmail(email.trim(), password)
      : await signUpWithEmail(email.trim(), password)

    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else if (mode === 'register') {
      setDone(true)
    } else {
      onClose()
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div
        className="relative bg-bg-secondary flex flex-col animate-slide-up pb-8"
        style={{ borderTop: '2px solid #ff2244' }}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>

        <div className="px-6 pt-2 pb-2 flex flex-col gap-4">

          {done ? (
            <>
              <p className="font-sans text-text-primary text-[9px] uppercase">
                {t('authModal.accountCreated')}
              </p>
              <p className="font-mono text-text-muted text-[9px] normal-case leading-relaxed">
                {t('authModal.confirmEmail')}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 font-mono text-text-muted text-[9px] normal-case min-h-[44px]"
              >
                {t('authModal.close')}
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-0" style={{ border: '2px solid #242424', borderRadius: '4px' }}>
                {(['login', 'register'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className="flex-1 py-2.5 font-sans text-[8px] uppercase transition-colors"
                    style={{
                      background: mode === m ? '#ff2244' : '#181818',
                      color:      mode === m ? '#ffffff' : '#888888',
                    }}
                  >
                    {m === 'login' ? t('authModal.login') : t('authModal.register')}
                  </button>
                ))}
              </div>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                           placeholder:text-text-muted/50 focus:outline-none"
                style={{ border: '2px solid #242424', borderRadius: '4px' }}
              />

              <input
                type="password"
                placeholder={t('authModal.passwordPlaceholder')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                           placeholder:text-text-muted/50 focus:outline-none"
                style={{ border: '2px solid #242424', borderRadius: '4px' }}
              />

              {error && (
                <p className="font-mono text-debuff text-[9px] normal-case">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded font-sans text-[9px] uppercase min-h-[56px] disabled:opacity-50 transition-colors"
                style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                         boxShadow: '3px 3px 0 #cc1133' }}
              >
                {loading
                  ? '...'
                  : mode === 'login' ? t('authModal.loginBtn') : t('authModal.registerBtn')}
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 font-mono text-text-muted text-[9px] normal-case min-h-[44px]"
              >
                {t('authModal.cancelGuest')}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
