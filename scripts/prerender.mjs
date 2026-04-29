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
    lang:               'es',
    title:              'SwordsDance — Calculadora de daño para Pokémon Champions',
    description:        'Calcula el daño exacto en Pokémon Champions. Escanea al rival, compara matchups y usa sets Smogon con Megas de Legends Z-A. Gratis, sin registro.',
    canonical:          'https://swordsdance.app/',
    ogTitle:            'SwordsDance — Calculadora de daño para Pokémon Champions',
    ogDescription:      'Daño exacto, matchups y sets Smogon para Pokémon Champions. Megas de Legends Z-A incluidas. Gratis.',
    twitterTitle:       'SwordsDance — Calculadora Pokémon Champions',
    twitterDescription: 'Daño exacto en segundos. Escanea al rival, usa sets competitivos y gana en Pokémon Champions. Gratis.',
  },
  en: {
    lang:               'en',
    title:              'SwordsDance — Damage Calculator for Pokémon Champions',
    description:        'Calculate exact damage in Pokémon Champions. Pick your Pokémon, choose a move and get the min–max range instantly. Smogon sets and Z-A Mega evolutions included. Free.',
    canonical:          'https://swordsdance.app/en/',
    ogTitle:            'SwordsDance — Damage Calculator for Pokémon Champions',
    ogDescription:      'Pokémon Champions damage calc with Smogon sets and Legends: Z-A Megas. Scan teams, check matchups. Free.',
    twitterTitle:       'SwordsDance — Pokémon Champions Damage Calc',
    twitterDescription: 'Instant damage calc for Pokémon Champions. Built-in Smogon sets, Z-A Megas, and team scanner. Free.',
  },
  ja: {
    lang:               'ja',
    title:              'SwordsDance — ポケモンチャンピオンズ ダメージ計算機',
    description:        'ポケモンチャンピオンズのダメージを瞬時に計算。ポケモンとわざを選ぶだけで最小・最大ダメージを表示。Smogon育成論・レジェンズZ-Aメガ進化対応。無料。',
    canonical:          'https://swordsdance.app/ja/',
    ogTitle:            'SwordsDance — ポケモンチャンピオンズ ダメージ計算機',
    ogDescription:      'ポケモンチャンピオンズ対応のダメージ計算機。育成論・Z-Aメガ進化搭載。無料。',
    twitterTitle:       'SwordsDance — ポケモンチャンピオンズ 計算機',
    twitterDescription: 'ポケモンチャンピオンズのダメージを瞬時に計算。育成論・メガ進化対応。無料。',
  },
}

async function generate(url, lang, outPath) {
  const appHtml = await render(url, lang)
  const html    = patch(template, META[lang], appHtml)
  writeFileSync(outPath, html, 'utf-8')
  console.log(`✓ prerender ${url} → ${outPath.replace(root, '')}`)
}

await generate('/',    'es', resolve(root, 'dist/index.html'))

mkdirSync(resolve(root, 'dist/en'), { recursive: true })
await generate('/en/', 'en', resolve(root, 'dist/en/index.html'))

mkdirSync(resolve(root, 'dist/ja'), { recursive: true })
await generate('/ja/', 'ja', resolve(root, 'dist/ja/index.html'))

console.log('✓ prerender completo')
