// Generates pre-rendered HTML for /, /en/, /ja/ using the SSR bundle.
// Run after: vite build && vite build --ssr src/entry-server.tsx
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root      = resolve(__dirname, '..')

const { render } = await import(pathToFileURL(resolve(root, 'dist/entry-server.js')).href)
const template   = readFileSync(resolve(root, 'dist/index.html'), 'utf-8')

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function patch(html, meta, appHtml) {
  return html
    .replace(/(<html\b[^>]*\blang=")[^"]*(")/,
      `$1${meta.lang}$2`)
    .replace(/(<title>)[^<]*(<\/title>)/,
      `$1${esc(meta.title)}$2`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${esc(meta.description)}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/,
      `$1${esc(meta.canonical)}$2`)
    .replace(/(<meta\s+property="og:title"\s[^>]*content=")[^"]*(")/,
      `$1${esc(meta.ogTitle)}$2`)
    .replace(/(<meta\s+property="og:description"\s[^>]*content=")[^"]*(")/,
      `$1${esc(meta.ogDescription)}$2`)
    .replace(/(<meta\s+property="og:url"\s[^>]*content=")[^"]*(")/,
      `$1${esc(meta.canonical)}$2`)
    .replace(/(<meta\s+name="twitter:title"\s[^>]*content=")[^"]*(")/,
      `$1${esc(meta.twitterTitle)}$2`)
    .replace(/(<meta\s+name="twitter:description"\s[^>]*content=")[^"]*(")/,
      `$1${esc(meta.twitterDescription)}$2`)
    .replace('<div id="root"></div>',
      `<div id="root">${appHtml}</div>`)
}

const META = {
  es: {
    lang: 'es',
    title: 'SwordsDance — Asistente de Batalla Pokémon Champions',
    description: 'Escanea el equipo rival, calcula el daño y gana en Pokémon Champions. Sets competitivos integrados, Megas Z-A y calculadora con rango mínimo-máximo.',
    canonical: 'https://swordsdance.app/',
    ogTitle: 'SwordsDance — Asistente de Batalla Pokémon',
    ogDescription: 'Escanea el equipo rival y calcula el daño al instante. PWA gratuita para Pokémon Champions.',
    twitterTitle: 'SwordsDance — Asistente de Batalla Pokémon',
    twitterDescription: 'Escanea el equipo rival y calcula el daño al instante. PWA gratuita para Pokémon Champions.',
  },
  en: {
    lang: 'en',
    title: 'SwordsDance — Pokémon Champions Battle Assistant',
    description: 'Scan your rival\'s team, calculate damage and win in Pokémon Champions. Competitive sets, Z-A Megas and min–max damage calculator.',
    canonical: 'https://swordsdance.app/en/',
    ogTitle: 'SwordsDance — Pokémon Champions Battle Assistant',
    ogDescription: 'Scan your rival\'s team and calculate damage instantly. Free PWA for Pokémon Champions.',
    twitterTitle: 'SwordsDance — Pokémon Champions Battle Assistant',
    twitterDescription: 'Scan your rival\'s team and calculate damage instantly. Free PWA for Pokémon Champions.',
  },
  ja: {
    lang: 'ja',
    title: 'SwordsDance — ポケモンチャンピオンズ バトルアシスタント',
    description: 'ライバルのチームをスキャンし、ダメージを計算してポケモンチャンピオンズで勝利しよう。競技セット搭載、Z-Aメガ進化、最小最大ダメージ計算機。',
    canonical: 'https://swordsdance.app/ja/',
    ogTitle: 'SwordsDance — ポケモンチャンピオンズ バトルアシスタント',
    ogDescription: 'ライバルのチームをスキャンして、ダメージを瞬時に計算。ポケモンチャンピオンズ向け無料PWA。',
    twitterTitle: 'SwordsDance — ポケモンチャンピオンズ バトルアシスタント',
    twitterDescription: 'ライバルのチームをスキャンして、ダメージを瞬時に計算。ポケモンチャンピオンズ向け無料PWA。',
  },
}

async function generate(url, lang, outPath) {
  const appHtml = await render(url, lang)
  const html    = patch(template, META[lang], appHtml)
  writeFileSync(outPath, html, 'utf-8')
  console.log(`✓ prerender ${url} → ${outPath.replace(root, '')}`)
}

await generate('/',     'es', resolve(root, 'dist/index.html'))

mkdirSync(resolve(root, 'dist/en'), { recursive: true })
await generate('/en/',  'en', resolve(root, 'dist/en/index.html'))

mkdirSync(resolve(root, 'dist/ja'), { recursive: true })
await generate('/ja/',  'ja', resolve(root, 'dist/ja/index.html'))

console.log('✓ prerender completo')
