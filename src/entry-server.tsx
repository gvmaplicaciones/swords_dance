import { renderToString } from 'react-dom/server'
import HomeSSRShell from './components/HomeSSRShell'

type Lang = 'es' | 'en' | 'ja'

export async function render(_url: string, lang: string): Promise<string> {
  return renderToString(<HomeSSRShell lang={lang as Lang} />)
}
