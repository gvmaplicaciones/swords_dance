import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n/i18n'
import LandingScreen from './screens/LandingScreen'

export async function render(url: string, lang: string): Promise<string> {
  await i18n.changeLanguage(lang)
  return renderToString(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[url]}>
        <LandingScreen />
      </MemoryRouter>
    </I18nextProvider>
  )
}
