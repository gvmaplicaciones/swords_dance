import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSelector from '../components/LanguageSelector'

export default function LandingScreen() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  function goToApp() {
    try { localStorage.setItem('sd_onboarded', '1') } catch { /* ignore */ }
    navigate('/')
  }

  const FEATURES = [
    { icon: t('landing.f1Icon'), title: t('landing.f1Title'), desc: t('landing.f1Desc') },
    { icon: t('landing.f2Icon'), title: t('landing.f2Title'), desc: t('landing.f2Desc') },
    { icon: t('landing.f3Icon'), title: t('landing.f3Title'), desc: t('landing.f3Desc') },
  ]

  const FAQS = [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
  ]

  return (
    <div className="flex flex-col min-h-full bg-bg-primary overflow-y-auto">

      {/* Header with language selector */}
      <div className="flex justify-end px-4 pt-3 shrink-0">
        <div className="relative flex" style={{ border: '1px solid #242424', borderRadius: '4px' }}>
          <LanguageSelector />
        </div>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-8 pb-10 text-center">
        <img src="/swordsdance-logo.png" alt="SwordsDance" className="w-20 h-20 object-contain mb-4" />
        <h1 className="text-cyan-bright font-black text-3xl leading-tight mb-3">
          SwordsDance
        </h1>
        <p className="text-text-secondary text-base leading-relaxed max-w-xs mb-2">
          {t('landing.tagline')}
        </p>
        <p className="text-text-muted text-sm leading-relaxed max-w-xs">
          {t('landing.sub')}
        </p>
        <button
          onClick={goToApp}
          className="mt-8 px-10 py-4 bg-cyan-dark border-2 border-cyan-bright text-cyan-bright
                     font-black rounded-full shadow-cyan-glow active:bg-cyan-bright active:text-bg-primary
                     transition-all text-base"
        >
          {t('landing.startFree')}
        </button>
      </section>

      {/* Features */}
      <section className="px-4 pb-10">
        <h2 className="text-text-primary font-bold text-lg text-center mb-5">
          {t('landing.featuresTitle')}
        </h2>
        <div className="space-y-3">
          {FEATURES.map(f => (
            <div key={f.title}
                 className="flex items-start gap-4 bg-bg-secondary border border-bg-elevated rounded-2xl px-5 py-4">
              <span className="text-3xl shrink-0">{f.icon}</span>
              <div>
                <h3 className="text-text-primary font-bold text-sm">{f.title}</h3>
                <p className="text-text-muted text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 pb-10">
        <h2 className="text-text-primary font-bold text-lg text-center mb-5">
          {t('landing.faqTitle')}
        </h2>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="bg-bg-secondary border border-bg-elevated rounded-xl px-4 py-3">
              <p className="text-text-primary text-sm font-semibold mb-1">{q}</p>
              <p className="text-text-muted text-xs leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="px-6 pb-14 text-center">
        <button
          onClick={goToApp}
          className="w-full py-4 bg-cyan-dark border-2 border-cyan-bright text-cyan-bright
                     font-black rounded-2xl shadow-cyan-glow active:bg-cyan-bright active:text-bg-primary
                     transition-all text-base"
        >
          {t('landing.openApp')}
        </button>
        <p className="text-text-muted text-xs mt-4">
          {t('landing.footer')}
        </p>
      </section>

    </div>
  )
}
