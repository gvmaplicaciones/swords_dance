// scripts/downloadPokemon.js
// Descarga datos de los 229 Pokémon de Champions + formas regionales + Megas
// Genera src/data/pokemon.json
// Uso: node scripts/downloadPokemon.js

const fs = require('fs')
const path = require('path')

// ── IDs principales ────────────────────────────────────────────────────────────
const CHAMPIONS_IDS = [
  3,6,9,15,18,24,25,26,36,38,59,65,68,71,80,94,115,121,127,128,130,132,
  134,135,136,142,143,149,154,157,160,168,181,184,186,196,197,199,205,208,
  212,214,227,229,248,279,282,302,306,308,310,319,323,324,334,350,351,354,
  358,359,362,389,392,395,405,407,409,411,428,442,445,448,450,454,460,461,
  464,470,471,472,473,475,478,479,497,500,503,505,510,512,514,516,530,531,
  534,547,553,563,569,571,579,584,587,609,614,618,623,635,637,652,655,658,
  660,663,666,670,671,675,676,678,681,683,685,693,695,697,699,700,701,702,
  706,707,709,711,713,715,724,727,730,733,740,745,748,750,752,758,763,765,
  766,778,780,784,823,841,842,844,855,858,866,867,869,877,887,899,900,902,
  903,908,911,914,925,934,936,937,939,952,956,959,964,968,970,981,983,
  1013,1018,1019,
]

// ── Formas regionales (por nombre en PokeAPI) ──────────────────────────────────
const REGIONAL_FORMS = [
  'raichu-alola','ninetales-alola','arcanine-hisui','slowbro-galar',
  'slowking-galar','typhlosion-hisui','tauros-paldea-combat',
  'tauros-paldea-blaze','tauros-paldea-aqua','samurott-hisui',
  'zoroark-hisui','stunfisk-galar','goodra-hisui','avalugg-hisui',
  'decidueye-hisui','lycanroc-midnight','lycanroc-dusk',
  'rotom-heat','rotom-wash','rotom-frost','rotom-mow','rotom-fan',
  'basculegion-f','meowstic-f',
]

// ── Megas disponibles en Champions ────────────────────────────────────────────
// Mapeo base → megas (nombre en PokeAPI)
const MEGA_FORMS = [
  'venusaur-mega',
  'charizard-mega-x','charizard-mega-y',
  'blastoise-mega',
  'beedrill-mega',
  'pidgeot-mega',
  'alakazam-mega',
  'slowbro-mega',
  'gengar-mega',
  'kangaskhan-mega',
  'pinsir-mega',
  'gyarados-mega',
  'aerodactyl-mega',
  'ampharos-mega',
  'scizor-mega',
  'heracross-mega',
  'houndoom-mega',
  'tyranitar-mega',
  'gardevoir-mega',
  'sableye-mega',
  'aggron-mega',
  'medicham-mega',
  'manectric-mega',
  'sharpedo-mega',
  'camerupt-mega',
  'altaria-mega',
  'banette-mega',
  'absol-mega',
  'glalie-mega',
  'lopunny-mega',
  'garchomp-mega',
  'lucario-mega',
  'abomasnow-mega',
  'gallade-mega',
  'audino-mega',
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function safeFetch(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function fetchPokemon(idOrName) {
  const [data, speciesData] = await Promise.all([
    safeFetch(`https://pokeapi.co/api/v2/pokemon/${idOrName}`),
    safeFetch(`https://pokeapi.co/api/v2/pokemon-species/${idOrName}`)
      .catch(() => null),
  ])
  if (!data) {
    console.warn(`  ✗ No encontrado: ${idOrName}`)
    return null
  }

  const getName = (lang) =>
    speciesData?.names?.find(n => n.language.name === lang)?.name || data.name

  const statMap = {
    'hp': 'hp', 'attack': 'atk', 'defense': 'def',
    'special-attack': 'spAtk', 'special-defense': 'spDef', 'speed': 'spe',
  }
  const baseStats = {}
  for (const s of data.stats) {
    const key = statMap[s.stat.name]
    if (key) baseStats[key] = s.base_stat
  }

  const name = data.name
  const isMega = name.includes('-mega')
  const isRegional = REGIONAL_FORMS.includes(name)

  // Detectar megaOf: buscar el Pokémon base
  let megaOf = null
  if (isMega && data.species?.url) {
    const speciesId = parseInt(data.species.url.split('/').filter(Boolean).pop())
    megaOf = speciesId
  }

  return {
    id: data.id,
    name: {
      en: getName('en'),
      es: getName('es'),
      ja: getName('ja'),
    },
    types: data.types.map(t => t.type.name),
    baseStats,
    sprites: {
      normal:      data.sprites.other?.home?.front_default || data.sprites.front_default || null,
      female:      data.sprites.other?.home?.front_female || null,
      shiny:       data.sprites.other?.home?.front_shiny || null,
      shinyFemale: data.sprites.other?.home?.front_shiny_female || null,
    },
    abilities: data.abilities.map(a => ({ name: a.ability.name, hidden: a.is_hidden })),
    isMega: isMega || undefined,
    isRegional: isRegional || undefined,
    megaOf: megaOf || undefined,
    megaEvolutions: [],   // se rellena en el paso de post-procesado
    baseForm: megaOf || undefined,
    competitiveSets: [],
  }
}

// ── Post-procesado: enlazar Megas ↔ base ──────────────────────────────────────
function linkMegas(pokemon) {
  const byId = {}
  for (const p of pokemon) byId[p.id] = p

  for (const p of pokemon) {
    if (p.isMega && p.megaOf) {
      const base = byId[p.megaOf]
      if (base) {
        if (!base.megaEvolutions) base.megaEvolutions = []
        if (!base.megaEvolutions.includes(p.id)) {
          base.megaEvolutions.push(p.id)
        }
      }
    }
  }
  return pokemon
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const results = []
  const allTargets = [
    ...CHAMPIONS_IDS.map(id => ({ key: id, label: `ID ${id}` })),
    ...REGIONAL_FORMS.map(n => ({ key: n, label: n })),
    ...MEGA_FORMS.map(n => ({ key: n, label: n })),
  ]

  console.log(`\n🎮 Descargando ${allTargets.length} entradas de PokeAPI...\n`)

  for (let i = 0; i < allTargets.length; i++) {
    const { key, label } = allTargets[i]
    process.stdout.write(`[${i + 1}/${allTargets.length}] ${label}... `)
    const data = await fetchPokemon(key)
    if (data) {
      results.push(data)
      console.log(`✓ ${data.name.en || data.name} (#${data.id})`)
    }
    await sleep(200) // respetar rate limit de PokeAPI
  }

  // Eliminar duplicados (algunos regionales pueden solapar con IDs)
  const seen = new Set()
  const unique = results.filter(p => {
    if (seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  const linked = linkMegas(unique)
  linked.sort((a, b) => a.id - b.id)

  const outPath = path.join(__dirname, '../src/data/pokemon.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(linked, null, 2))

  const megas = linked.filter(p => p.isMega).length
  const regionals = linked.filter(p => p.isRegional).length
  console.log(`\n✅ pokemon.json generado: ${linked.length} entradas`)
  console.log(`   ${linked.length - megas - regionals} base · ${regionals} regionales · ${megas} megas`)
  console.log(`   → ${outPath}`)
}

main().catch(err => { console.error(err); process.exit(1) })
