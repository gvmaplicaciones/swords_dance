import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSelector from './LanguageSelector'

export default function PixelNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { label: t('nav.home'),   to: '/'      },
    { label: t('nav.battle'), to: '/battle'},
    { label: t('nav.teams'),  to: '/team'  },
  ] as const

  return (
    <nav
      className="flex shrink-0 bg-bg-secondary relative"
      style={{ borderTop: '2px solid #ff2244' }}
    >
      {NAV_ITEMS.map(({ label, to }) => {
        const isActive = pathname === to || (to !== '/' && pathname.startsWith(to))
        return (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-all"
            style={
              isActive
                ? { color: '#ff2244', textShadow: '0 0 8px rgba(255,34,68,0.7)', boxShadow: 'inset 0 2px 0 #ff2244' }
                : { color: '#999999' }
            }
          >
            <span className="font-sans text-[7px] uppercase leading-none">{label}</span>
          </button>
        )
      })}
      <LanguageSelector />
    </nav>
  )
}
