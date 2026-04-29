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
    .replace('</body>', `${meta.seoMain}</body>`)
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
    seoMain: `
<main class="sr-only-seo" aria-hidden="true">
  <h1>SwordsDance — Calculadora de daño para Pokémon Champions</h1>
  <p>Herramienta gratuita para calcular daño en Pokémon Champions.
  Compara stats, analiza matchups y usa sets competitivos con
  Megas de Legends Z-A.</p>
  <section>
    <h2>Calculadora de daño Pokémon Champions</h2>
    <p>Calcula el daño mínimo y máximo al instante. Compatible con
    todos los Pokémon de Champions, Mega Evoluciones de Legends Z-A
    y sets Smogon actualizados.</p>
    <h2>Modo Battle — Equipo vs Equipo</h2>
    <p>Analiza el equipo rival completo. Selecciona tu Pokémon,
    elige el movimiento y comprueba si haces KO. Compatible con
    los 6 Pokémon de Pokémon Champions Singles y Dobles.</p>
    <h2>Modo 1 vs 1</h2>
    <p>Enfrenta dos Pokémon directamente. Calcula quién gana con
    tus sets competitivos o los del rival. Ideal para preparar
    torneos de Pokémon Champions.</p>
    <h2>Mis Equipos</h2>
    <p>Configura tus Pokémon con SP, naturaleza, objeto y
    movimientos. Importa equipos via Pokepaste. Guarda presets
    y cárgalos en segundos durante la batalla.</p>
    <h2>Sets competitivos y Mega Evoluciones Legends Z-A</h2>
    <p>Incluye sets competitivos actualizados para Pokémon
    Champions. Mega Evoluciones de Legends Z-A con stats
    verificadas. Habilidades, objetos y movimientos del meta.</p>
  </section>
  <section>
    <h2>Preguntas frecuentes</h2>
    <dl>
      <dt><strong>¿Para qué juego sirve SwordsDance?</strong></dt>
      <dd>Para Pokémon Champions (2025). Incluye datos de Legends
      Z-A, Mega Evoluciones y sets competitivos actualizados.</dd>
      <dt><strong>¿Es gratis?</strong></dt>
      <dd>Sí. Calcula daño, gestiona tu equipo y usa sets
      competitivos sin coste. Sin registro obligatorio.</dd>
      <dt><strong>¿Funciona sin internet?</strong></dt>
      <dd>Sí. Instálala como PWA en tu móvil y úsala offline
      en torneos y competiciones.</dd>
      <dt><strong>¿Incluye Mega Evoluciones?</strong></dt>
      <dd>Sí. Todas las Megas de Legends Z-A con stats,
      habilidades y sets competitivos.</dd>
      <dt><strong>¿Funciona para Singles y Dobles?</strong></dt>
      <dd>Sí. Compatible con ambos formatos de Pokémon
      Champions.</dd>
      <dt><strong>¿Qué Pokémon están disponibles?</strong></dt>
      <dd>Todos los Pokémon del roster de Pokémon Champions,
      incluyendo formas regionales y Mega Evoluciones de
      Legends Z-A.</dd>
    </dl>
  </section>
</main>`,
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
    seoMain: `
<main class="sr-only-seo" aria-hidden="true">
  <h1>SwordsDance — Damage Calculator for Pokémon Champions</h1>
  <p>Free tool to calculate damage in Pokémon Champions. Compare
  stats, analyze matchups and use competitive sets with Legends
  Z-A Mega Evolutions.</p>
  <section>
    <h2>Pokémon Champions damage calculator</h2>
    <p>Calculate minimum and maximum damage instantly. Compatible
    with all Pokémon in Champions, Legends Z-A Mega Evolutions
    and updated Smogon sets.</p>
    <h2>Battle Mode — Team vs Team</h2>
    <p>Analyze the entire opposing team. Select your Pokémon,
    choose a move and check whether you get the KO. Compatible
    with all 6 Pokémon in Pokémon Champions Singles and
    Doubles.</p>
    <h2>1 vs 1 Mode</h2>
    <p>Face two Pokémon directly. Calculate who wins with your
    competitive sets or your opponent's. Ideal for preparing
    Pokémon Champions tournaments.</p>
    <h2>My Teams</h2>
    <p>Set up your Pokémon with EVs, nature, item and moves.
    Import teams via Pokepaste. Save presets and load them
    in seconds during battle.</p>
    <h2>Smogon sets and Legends Z-A Mega Evolutions</h2>
    <p>Includes updated competitive sets for Pokémon Champions.
    Legends Z-A Mega Evolutions with verified stats. Abilities,
    items and moves from the current meta.</p>
  </section>
  <section>
    <h2>Frequently asked questions</h2>
    <dl>
      <dt><strong>What game is SwordsDance for?</strong></dt>
      <dd>Built for Pokémon Champions (2025). Includes Legends
      Z-A data, Mega Evolutions and updated competitive sets
      for the current meta.</dd>
      <dt><strong>Is it free?</strong></dt>
      <dd>Yes. Calculate damage, manage your team and use
      competitive sets at no cost. No registration required.</dd>
      <dt><strong>Does it work offline?</strong></dt>
      <dd>Yes. Install it as a PWA on your phone and use it
      offline during tournaments and competitions.</dd>
      <dt><strong>Does it include Mega Evolutions?</strong></dt>
      <dd>Yes. All Legends Z-A Mega Evolutions with their stats,
      abilities and competitive sets.</dd>
      <dt><strong>Does it work for Singles and Doubles?</strong></dt>
      <dd>Yes. The calculator is compatible with both Pokémon
      Champions formats.</dd>
      <dt><strong>Which Pokémon are available?</strong></dt>
      <dd>All Pokémon in the Pokémon Champions roster, including
      regional forms and Legends Z-A Mega Evolutions.</dd>
    </dl>
  </section>
</main>`,
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
    seoMain: `
<main class="sr-only-seo" aria-hidden="true">
  <h1>SwordsDance — ポケモンチャンピオンズ ダメージ計算機</h1>
  <p>ポケモンチャンピオンズのダメージを計算できる無料ツール。
  実数値比較、相性確認、レジェンズZ-Aメガシンカ対応の育成論で
  対戦準備ができます。</p>
  <section>
    <h2>ポケモンチャンピオンズ ダメージ計算</h2>
    <p>最小・最大ダメージをすぐに計算できます。ポケモン
    チャンピオンズの全ポケモン、レジェンズZ-Aのメガシンカ、
    最新のSmogon育成論に対応。</p>
    <h2>バトルモード — チーム対チーム</h2>
    <p>相手のパーティ全体を分析できます。自分のポケモンと
    技を選ぶだけでKOできるか確認。シングルとダブル両方に
    対応しています。</p>
    <h2>1対1モード</h2>
    <p>2匹のポケモンを直接対戦させて勝敗を計算できます。
    自分の構築や相手の型を使った大会準備に最適です。</p>
    <h2>マイチーム</h2>
    <p>努力値、せいかく、もちもの、技を設定できます。
    Pokepasteからのインポートに対応。プリセット保存で
    対戦中もすぐ呼び出せます。</p>
    <h2>Smogon育成論とレジェンズZ-Aメガシンカ対応</h2>
    <p>ポケモンチャンピオンズ向けの最新競技用セットを収録。
    レジェンズZ-Aのメガシンカは検証済み種族値で対応。
    特性、もちもの、技も現在の環境に対応。</p>
  </section>
  <section>
    <h2>よくある質問</h2>
    <dl>
      <dt><strong>どのゲーム向けですか？</strong></dt>
      <dd>ポケモンチャンピオンズ（2025）向けです。レジェンズ
      Z-Aのデータ、メガシンカ、最新の競技用セットに対応。</dd>
      <dt><strong>無料ですか？</strong></dt>
      <dd>はい。ダメージ計算、チーム管理、競技用セットの利用は
      すべて無料です。登録も必須ではありません。</dd>
      <dt><strong>オフラインでも使えますか？</strong></dt>
      <dd>はい。PWAとしてスマホにインストールすれば大会や
      対戦中でもオフラインで使えます。</dd>
      <dt><strong>メガシンカに対応していますか？</strong></dt>
      <dd>はい。レジェンズZ-Aの全メガシンカの種族値、特性、
      競技用セットを収録しています。</dd>
      <dt><strong>シングルとダブル両方で使えますか？</strong></dt>
      <dd>はい。ポケモンチャンピオンズの両フォーマットに
      対応しています。</dd>
      <dt><strong>どのポケモンが使えますか？</strong></dt>
      <dd>ポケモンチャンピオンズの全ポケモン、地域変種、
      レジェンズZ-Aのメガシンカすべてに対応しています。</dd>
    </dl>
  </section>
</main>`,
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
