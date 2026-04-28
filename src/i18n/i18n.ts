import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'
import ja from './ja.json'

function detectLang(): string {
  try {
    const saved = localStorage.getItem('sd_lang')
    if (saved) return saved
  } catch { /* ignore */ }

  if (typeof navigator !== 'undefined') {
    const nav = navigator.language ?? ''
    if (nav.startsWith('ja')) return 'ja'
    if (nav.startsWith('en')) return 'en'
    if (nav.startsWith('es')) return 'es'
  }
  return 'es'
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    ja: { translation: ja },
  },
  lng: detectLang(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
