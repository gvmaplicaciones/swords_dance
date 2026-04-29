// SSR-only SEO shell — rendered at build time, replaced by React on the client.
// No hooks, no browser APIs, no Supabase. Pure static HTML for crawlers.

const CONTENT = {
  es: {
    h1:      'Calculadora para Pokémon Champions',
    sub:     'Elige tu Pokémon y el movimiento — SwordsDance te muestra el daño mínimo y máximo al instante. Con sets competitivos Smogon y Megas de Legends Z-A incluidos.',
    f1h:     'Modo Battle',
    f1p:     'Analiza el equipo rival completo. Selecciona a tu Pokémon, elige el movimiento y comprueba si haces KO con el rango mínimo-máximo. Compatible con los 6 Pokémon de Pokémon Champions.',
    f2h:     '1 vs 1',
    f2p:     'Enfrenta dos Pokémon directamente. Calcula quién gana con tus sets competitivos o los del rival.',
    f3h:     'Mis Equipos',
    f3p:     'Configura tus Pokémon con EVs, naturaleza, objeto y movimientos. Guarda presets para los rivales más habituales y cárgalos en segundos durante la batalla.',
    faqTitle:'Preguntas frecuentes',
    q1: '¿Para qué juego sirve SwordsDance?',
    a1: 'Para Pokémon Champions (2025). Incluye datos de Legends: Z-A, Mega Evoluciones y sets competitivos actualizados.',
    q2: '¿Es gratis?',
    a2: 'Sí. Calcula daño, gestiona tu equipo y usa sets Smogon sin coste. Sin registro obligatorio.',
    q3: '¿Funciona sin internet?',
    a3: 'Sí. Instálala como app en tu móvil (PWA) y úsala offline en torneos.',
  },
  en: {
    h1:      'Pokémon Champions Damage Calculator',
    sub:     'Select your Pokémon and move — SwordsDance shows you the exact min–max damage range in seconds. Built-in Smogon competitive sets and Legends: Z-A Mega evolutions included.',
    f1h:     'Battle Mode',
    f1p:     'Analyse your opponent\'s full team. Select your Pokémon, pick a move and check whether you KO with the precise min–max range. Works with all 6 Pokémon in a Champions team.',
    f2h:     '1 vs 1',
    f2p:     'Match two Pokémon head-to-head. Calculate who wins with your competitive sets or the opponent\'s.',
    f3h:     'My Teams',
    f3p:     'Set up each Pokémon with EVs, nature, item and moves. Save presets for your usual opponents and load them in seconds mid-battle.',
    faqTitle:'Frequently asked questions',
    q1: 'Which game is SwordsDance for?',
    a1: 'Pokémon Champions (2025). Includes Legends: Z-A data, Mega Evolutions, and updated competitive sets.',
    q2: 'Is it free?',
    a2: 'Yes. Calculate damage, manage your team and use Smogon sets at no cost. No account required.',
    q3: 'Does it work offline?',
    a3: 'Yes. Install it as a PWA on your phone and use it without internet during tournaments.',
  },
  ja: {
    h1:      'ポケモンチャンピオンズ ダメージ計算',
    sub:     'ポケモンとわざを選ぶだけで、相手への最小・最大ダメージをすぐに確認できます。Smogonの育成論とレジェンズ Z-Aのメガ進化を収録。',
    f1h:     'バトルモード',
    f1p:     '相手のチーム6体を分析します。自分のポケモンとわざを選ぶだけで、最小・最大ダメージを即座に表示。ポケモンチャンピオンズのすべてのマッチアップに対応しています。',
    f2h:     '1対1',
    f2p:     '2体のポケモンを直接対決させます。育成論を使ってどちらが勝つかを計算します。',
    f3h:     '自分のチーム',
    f3p:     '各ポケモンのEV・性格・どうぐ・わざを設定できます。よく使う型をプリセットとして保存し、対戦中にすぐ呼び出せます。',
    faqTitle:'よくある質問',
    q1: 'どのゲームに対応していますか？',
    a1: 'ポケモンチャンピオンズ（2025年）に対応。レジェンズ Z-Aのデータ、メガ進化、育成論を収録しています。',
    q2: '無料で使えますか？',
    a2: 'はい。ダメージ計算、チーム管理、育成論の使用はすべて無料です。登録不要で使えます。',
    q3: 'オフラインで使えますか？',
    a3: 'スマートフォンにPWAとしてインストールすれば、インターネット接続なしで使用できます。',
  },
} as const

type Lang = keyof typeof CONTENT

export default function HomeSSRShell({ lang }: { lang: Lang }) {
  const c = CONTENT[lang]
  return (
    <main style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto' }}>
      <h1>{c.h1}</h1>
      <p>{c.sub}</p>
      <section>
        <h2>{c.f1h}</h2><p>{c.f1p}</p>
        <h2>{c.f2h}</h2><p>{c.f2p}</p>
        <h2>{c.f3h}</h2><p>{c.f3p}</p>
      </section>
      <section>
        <h2>{c.faqTitle}</h2>
        <dl>
          <dt><strong>{c.q1}</strong></dt><dd>{c.a1}</dd>
          <dt><strong>{c.q2}</strong></dt><dd>{c.a2}</dd>
          <dt><strong>{c.q3}</strong></dt><dd>{c.a3}</dd>
        </dl>
      </section>
    </main>
  )
}
