import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle } from '../store/BattleContext'
import AdBanner from '../components/AdBanner'
import PixelNav from '../components/PixelNav'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { smogonReady, smogonError } = useBattle()
  const { t, i18n } = useTranslation()

  return (
    <div className="flex flex-col h-full bg-bg-primary">

      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '2px solid #ff2244' }}
      >
        <div className="flex items-center gap-3">
          <img src="/swordsdance-logo.png" alt="SD" className="w-7 h-7 object-contain" />
          <span className="font-sans text-red text-xs uppercase tracking-wider"
            style={{ textShadow: '0 0 8px rgba(255,34,68,0.5)' }}>
            SwordsDance
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[9px] px-2 py-1 border uppercase
            ${smogonError
              ? 'border-debuff text-debuff bg-debuff/10'
              : smogonReady
              ? 'border-boost text-boost bg-boost/10'
              : 'border-text-muted text-text-muted animate-pulse'}`}>
            {smogonError ? t('home.setsErr') : smogonReady ? t('home.setsOk') : t('home.loading')}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">

        <AdBanner className="w-full" />

        <h1 className="font-sans text-text-primary text-xs uppercase tracking-widest">
          {t('home.title')}
        </h1>

        <div className="space-y-3">

          <button
            onClick={() => navigate('/battle')}
            className="flex items-center gap-4 w-full bg-bg-secondary px-5 py-5
                       rounded active:scale-[0.98] transition-all text-left"
            style={{ border: '2px solid #ff2244', boxShadow: '3px 3px 0 #cc1133' }}
          >
            <span className="text-3xl">⚔️</span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-text-primary text-[10px] uppercase">{t('home.modeBattle')}</p>
              <p className="font-mono text-text-muted text-[9px] mt-1 normal-case">{t('home.modeBattleDesc')}</p>
            </div>
            <span className="font-sans text-red text-xs">▶</span>
          </button>

          <button
            onClick={() => navigate('/1v1')}
            className="flex items-center gap-4 w-full bg-bg-secondary px-5 py-5
                       rounded active:scale-[0.98] transition-all text-left"
            style={{ border: '2px solid #ff2244', boxShadow: '3px 3px 0 #cc1133' }}
          >
            <span className="text-3xl">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-text-primary text-[10px] uppercase">{t('home.mode1v1')}</p>
              <p className="font-mono text-text-muted text-[9px] mt-1 normal-case">{t('home.mode1v1Desc')}</p>
            </div>
            <span className="font-sans text-red text-xs">▶</span>
          </button>

          <button
            onClick={() => navigate('/teams')}
            className="flex items-center gap-4 w-full bg-bg-secondary px-5 py-5
                       rounded active:scale-[0.98] transition-all text-left"
            style={{ border: '2px solid #242424', boxShadow: '3px 3px 0 #181818' }}
          >
            <span className="text-3xl">🛡</span>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-text-primary text-[10px] uppercase">{t('home.modeTeams')}</p>
              <p className="font-mono text-text-muted text-[9px] mt-1 normal-case">{t('home.modeTeamsDesc')}</p>
            </div>
            <span className="font-sans text-text-muted text-xs">▶</span>
          </button>
        </div>

        {/* Language selector */}
        <div>
          <p style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: '8px',
            color: '#999',
            textAlign: 'center',
            marginBottom: '8px',
            letterSpacing: '2px',
          }}>
            {t('home.language')}
          </p>
          <div className="flex gap-2">
            {([
              { code: 'es', flag: '🇪🇸', path: '/' },
              { code: 'en', flag: '🇬🇧', path: '/en/' },
              { code: 'ja', flag: '🇯🇵', path: '/ja/' },
            ] as const).map(({ code, flag, path }) => {
              const active = i18n.language === code
              return (
                <button
                  key={code}
                  onClick={() => {
                    i18n.changeLanguage(code)
                    localStorage.setItem('sd_lang', code)
                    navigate(path)
                  }}
                  className="flex-1 flex flex-col items-center justify-center py-2 rounded active:scale-[0.97] transition-all"
                  style={{
                    minHeight: '56px',
                    border: active ? '2px solid #ff2244' : '2px solid #242424',
                    boxShadow: active ? '3px 3px 0 #cc1133' : 'none',
                    color: active ? '#ff2244' : '#999999',
                  }}
                >
                  <span style={{ fontFamily: 'sans-serif', fontSize: '28px', lineHeight: 1 }}>{flag}</span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px', marginTop: '4px' }}>
                    {code.toUpperCase()}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {smogonError && (
          <div className="border border-debuff/60 bg-debuff/10 rounded p-3">
            <p className="font-mono text-debuff text-[9px] normal-case">
              ⚠ {t('home.setsError')}
            </p>
          </div>
        )}

      </div>

      <PixelNav />
    </div>
  )
}
