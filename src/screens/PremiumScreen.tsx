import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { analytics } from '../lib/analytics'

export default function PremiumScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [selected, setSelected] = useState<'yearly' | 'monthly'>('yearly')
  const [loading,  setLoading]  = useState(false)

  const FEATURES = [
    { icon: '⚔️', title: t('premium.f1Title'), desc: t('premium.f1Desc') },
    { icon: '📊', title: t('premium.f2Title'), desc: t('premium.f2Desc') },
    { icon: '🔍', title: t('premium.f3Title'), desc: t('premium.f3Desc') },
    { icon: '📱', title: t('premium.f4Title'), desc: t('premium.f4Desc') },
    { icon: '🔔', title: t('premium.f5Title'), desc: t('premium.f5Desc') },
  ]

  function handleSubscribe() {
    setLoading(true)
    analytics.premiumPurchased(selected)
    setTimeout(() => setLoading(false), 1200)
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">

      <header className="flex items-center justify-between px-4 py-3 border-b border-bg-elevated shrink-0">
        <button onClick={() => navigate(-1)} className="text-text-muted text-xl p-1 min-w-[44px]">←</button>
        <span className="text-text-primary font-bold">Premium</span>
        <div className="w-[44px]" />
      </header>

      <div className="flex-1 overflow-y-auto">

        <div className="px-6 py-8 text-center">
          <div className="text-5xl mb-3">⚡</div>
          <h1 className="text-text-primary text-2xl font-black mb-2">SwordsDance Premium</h1>
          <p className="text-text-muted text-sm leading-relaxed">
            {t('premium.tagline')}
          </p>
        </div>

        <div className="px-4 mb-6 space-y-2">
          {FEATURES.map(f => (
            <div key={f.title} className="flex items-start gap-3 bg-bg-secondary rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">{f.icon}</span>
              <div>
                <p className="text-text-primary text-sm font-semibold">{f.title}</p>
                <p className="text-text-muted text-xs mt-0.5">{f.desc}</p>
              </div>
              <span className="ml-auto text-boost text-lg shrink-0">✓</span>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 space-y-3">

          <button
            onClick={() => setSelected('yearly')}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all relative
              ${selected === 'yearly' ? 'border-cyan-bright bg-cyan-dark/20' : 'border-bg-elevated bg-bg-secondary'}`}
          >
            <span className="absolute -top-3 right-4 bg-cyan-bright text-bg-primary text-[10px]
                             font-black px-2.5 py-1 rounded-full shadow-cyan-glow">
              {t('premium.popular')}
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-black text-base ${selected === 'yearly' ? 'text-cyan-bright' : 'text-text-primary'}`}>
                  {t('premium.yearly')}
                </p>
                <p className="text-text-muted text-xs mt-0.5">{t('premium.yearlyBilling')}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-xl ${selected === 'yearly' ? 'text-cyan-bright' : 'text-text-primary'}`}>
                  {t('premium.yearlyPrice')}
                </p>
                <p className="text-text-muted text-xs">{t('premium.yearlyPerMonth')}</p>
                <p className="text-boost text-[10px] font-bold mt-0.5">{t('premium.savePercent')}</p>
              </div>
            </div>
            {selected === 'yearly' && (
              <span className="absolute top-4 left-4 w-4 h-4 rounded-full bg-cyan-bright flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-bg-primary" />
              </span>
            )}
          </button>

          <button
            onClick={() => setSelected('monthly')}
            className={`w-full rounded-2xl border-2 p-4 text-left transition-all
              ${selected === 'monthly' ? 'border-cyan-bright bg-cyan-dark/20' : 'border-bg-elevated bg-bg-secondary'}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-black text-base ${selected === 'monthly' ? 'text-cyan-bright' : 'text-text-primary'}`}>
                  {t('premium.monthly')}
                </p>
                <p className="text-text-muted text-xs mt-0.5">{t('premium.monthlyBilling')}</p>
              </div>
              <div className="text-right">
                <p className={`font-black text-xl ${selected === 'monthly' ? 'text-cyan-bright' : 'text-text-primary'}`}>
                  {t('premium.monthlyPrice')}
                </p>
                <p className="text-text-muted text-xs">{t('premium.monthlyPerMonth')}</p>
              </div>
            </div>
            {selected === 'monthly' && (
              <span className="absolute top-4 left-4 w-4 h-4 rounded-full bg-cyan-bright flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-bg-primary" />
              </span>
            )}
          </button>

        </div>

        <p className="text-text-muted text-[10px] text-center px-8 pb-4 leading-relaxed">
          {t('premium.legal')}
        </p>
      </div>

      <div className="px-4 py-4 border-t border-bg-elevated bg-bg-secondary shrink-0">
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 bg-cyan-dark border-2 border-cyan-bright text-cyan-bright font-black
                     rounded-2xl shadow-cyan-glow active:bg-cyan-bright active:text-bg-primary
                     transition-all disabled:opacity-60 text-base"
        >
          {loading ? '…' : selected === 'yearly' ? t('premium.subscribeYearly') : t('premium.subscribeMonthly')}
        </button>
      </div>

    </div>
  )
}
