import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
] as const

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGS.find(l => l.code === i18n.language) ?? LANGS[0]

  function pick(code: string) {
    i18n.changeLanguage(code)
    try { localStorage.setItem('sd_lang', code) } catch { /* ignore */ }
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-col items-center justify-center py-3 gap-0.5 transition-all flex-1"
        style={{ color: open ? '#ff2244' : '#999999' }}
      >
        <span className="font-sans text-[7px] uppercase leading-none">
          {current.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <div
            className="relative bg-bg-secondary flex flex-col animate-slide-up"
            style={{ borderTop: '2px solid #ff2244' }}
          >
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 bg-bg-highlight" />
            </div>
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => pick(l.code)}
                className="flex items-center gap-4 px-6 py-4 text-left min-h-[56px] transition-colors active:opacity-70"
                style={{
                  borderBottom: '1px solid #181818',
                  color:        i18n.language === l.code ? '#ff2244' : '#cccccc',
                  background:   i18n.language === l.code ? 'rgba(255,34,68,0.06)' : 'transparent',
                }}
              >
                <span className="font-sans text-[9px] uppercase w-7 shrink-0">
                  {l.code.toUpperCase()}
                </span>
                <span className="font-mono text-sm">{l.label}</span>
                {i18n.language === l.code && (
                  <span className="ml-auto text-[#ff2244] font-mono text-sm">●</span>
                )}
              </button>
            ))}
            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  )
}
