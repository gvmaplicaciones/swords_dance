// scripts/downloadSets.js
// Descarga sets competitivos de Pikalytics (Champions VGC 2026),
// los sube a la tabla "sets" de Supabase y genera src/data/smogon_sets.json
// Uso: node scripts/downloadSets.js
//
// Fuente: https://www.pikalytics.com/pokedex/champions/{PokemonName}
// Nota: Pikalytics puede requerir User-Agent o cookie — si bloquea, usar --force-fetch=false
//       y mantener el smogon_sets.json existente.

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Leer .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
  return Object.fromEntries(
    raw.split('\n').filter(l => l.includes('=')).map(l => {
      const [k, ...v] = l.split('=')
      return [k.trim(), v.join('=').trim()]
    })
  )
}

const ENV = loadEnv()
const SUPABASE_URL  = ENV.VITE_SUPABASE_URL
const SUPABASE_KEY  = ENV.VITE_SUPABASE_ANON_KEY

// ── Pokémon de Champions (top usage, ampliar según sea necesario) ──────────────
// Añadir o quitar según el meta actual
const CHAMPIONS_POKEMON = [
  'Greninja','Dragapult','Glimmora','Primarina','Corviknight','Mimikyu',
  'Garchomp','Iron Hands','Flutter Mane','Urshifu','Calyrex-Shadow','Tornadus',
  'Rillaboom','Incineroar','Landorus-Therian','Amoonguss','Farigiraf','Dragonite',
  'Meowscarada','Skeledirge','Quaquaval','Armarouge','Ceruledge','Garganacl',
  'Great Tusk','Iron Bundle','Roaring Moon','Iron Valiant','Chi-Yu','Chien-Pao',
  'Walking Wake','Iron Leaves','Gouging Fire','Raging Bolt','Iron Boulder',
  'Mewtwo','Rayquaza','Kyogre','Groudon','Zacian','Zamazenta',
  'Delphox','Chesnaught','Feraligatr','Meganium','Hawlucha','Excadrill',
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function toSlug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function topEntry(obj) {
  if (!obj || typeof obj !== 'object') return null
  const entries = Object.entries(obj).filter(([k]) => k && k !== 'nothing' && k !== 'No Item')
  if (!entries.length) return null
  return entries.sort((a, b) => b[1] - a[1])[0]
}

function evToSp(ev) {
  return Math.min(32, Math.round((ev || 0) / 8))
}

// ── Fetch Pikalytics ───────────────────────────────────────────────────────────

async function fetchPikalytics(name) {
  const urlName = encodeURIComponent(name.replace(/\s/g, '-'))
  const url = `https://www.pikalytics.com/pokedex/champions/${urlName}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SwordsDanceBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      }
    })
    if (!res.ok) return null
    const html = await res.text()

    // Buscar JSON embebido en el HTML (patrón común de Pikalytics)
    const jsonMatch = html.match(/window\.__PIKALYTICS_DATA__\s*=\s*(\{.+?\});/s)
      ?? html.match(/id="__NEXT_DATA__"[^>]*>(\{.+?\})<\/script>/s)
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[1]) } catch { /* continuar */ }
    }

    // Fallback: extraer datos con regex del HTML renderizado
    return parsePikalyticsHTML(html)
  } catch (e) {
    console.warn(`  ✗ ${name}: ${e.message}`)
    return null
  }
}

function parsePikalyticsHTML(html) {
  // Intenta extraer moves, item, ability, nature del HTML de Pikalytics
  // Buscar patrones como "Move Name" y porcentajes
  const moves = []
  const moveRegex = /<div[^>]*class="[^"]*move[^"]*"[^>]*>([^<]+)<\/div>\s*<[^>]*>(\d+\.?\d*)%/gi
  let m
  while ((m = moveRegex.exec(html)) !== null && moves.length < 4) {
    moves.push({ name: m[1].trim(), usage: parseFloat(m[2]) / 100 })
  }

  const itemMatch = html.match(/(?:Held Item|Item)[^<]*<\/[^>]+>\s*<[^>]+>([^<]{3,40})</)
  const abilityMatch = html.match(/Ability[^<]*<\/[^>]+>\s*<[^>]+>([^<]{3,30})</)
  const natureMatch  = html.match(/Nature[^<]*<\/[^>]+>\s*<[^>]+>([A-Za-z]+)\s*Nature/)

  if (!moves.length && !itemMatch) return null

  return {
    moves,
    item:    itemMatch?.[1]?.trim() ?? null,
    ability: abilityMatch?.[1]?.trim() ?? null,
    nature:  natureMatch?.[1]?.trim() ?? null,
    evSpread: null, // EVs no siempre disponibles en HTML público
  }
}

function buildSet(data) {
  if (!data) return null

  // Normalizar según estructura encontrada
  const movesRaw  = data.moves ?? data.moveUsage ?? []
  const itemRaw   = data.item ?? (topEntry(data.itemUsage)?.[0])
  const abilRaw   = data.ability ?? (topEntry(data.abilityUsage)?.[0])
  const natureRaw = data.nature ?? (topEntry(data.natureUsage)?.[0])
  const evRaw     = data.evSpread ?? data.spSpread ?? null

  const moves = (Array.isArray(movesRaw) ? movesRaw : Object.entries(movesRaw))
    .slice(0, 4)
    .map(entry => Array.isArray(entry)
      ? { name: entry[0], usage: entry[1] }
      : entry
    )

  const sp = evRaw ? {
    hp:    evToSp(evRaw.hp ?? 0),
    atk:   evToSp(evRaw.atk ?? 0),
    def:   evToSp(evRaw.def ?? 0),
    spAtk: evToSp(evRaw.spAtk ?? evRaw.spa ?? 0),
    spDef: evToSp(evRaw.spDef ?? evRaw.spd ?? 0),
    spe:   evToSp(evRaw.spe ?? 0),
  } : { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 }

  const itemSlug = itemRaw ? toSlug(itemRaw) : ''

  return {
    ability:        abilRaw ? toSlug(abilRaw) : '',
    abilityDisplay: abilRaw ?? '',
    item:           itemRaw ?? '',
    itemSlug,
    nature:         natureRaw ?? 'Hardy',
    sp,
    moves:          moves.map(mv => typeof mv === 'string' ? mv : mv.name),
    moveUsages:     moves.map(mv => typeof mv === 'string' ? 0 : (mv.usage ?? 0)),
    itemUsage:      0,
    abilityUsage:   0,
  }
}

// ── Subir a Supabase ───────────────────────────────────────────────────────────

async function upsertToSupabase(sets) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('  (Sin Supabase configurado — solo generando JSON local)')
    return
  }
  const rows = Object.entries(sets).map(([name, set]) => ({
    pokemon_name: name,
    set_data:     set,
    source:       'pikalytics',
    updated_at:   new Date().toISOString(),
  }))

  const res = await fetch(`${SUPABASE_URL}/rest/v1/sets`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  })
  if (res.ok) {
    console.log(`  ✓ Subidos ${rows.length} sets a Supabase tabla "sets"`)
  } else {
    const err = await res.text()
    console.warn(`  ✗ Error Supabase: ${err}`)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Descargando sets de Pikalytics (Champions VGC 2026)...\n')

  // Cargar smogon_sets.json existente como base
  const outputPath = path.join(__dirname, '../src/data/smogon_sets.json')
  const existing = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : {}

  const newSets = { ...existing }
  let ok = 0, skip = 0, fail = 0

  for (const name of CHAMPIONS_POKEMON) {
    process.stdout.write(`  ${name}... `)
    const data = await fetchPikalytics(name)
    const set  = buildSet(data)
    if (set) {
      newSets[name] = set
      ok++
      console.log('✓')
    } else {
      skip++
      console.log('(sin datos)')
    }
    // Delay cortés para no saturar Pikalytics
    await new Promise(r => setTimeout(r, 400))
  }

  // Guardar JSON local
  fs.writeFileSync(outputPath, JSON.stringify(newSets, null, 2))
  console.log(`\nDone: ${ok} sets descargados, ${skip} sin datos, ${fail} errores`)
  console.log(`JSON guardado en src/data/smogon_sets.json`)

  // Subir a Supabase
  await upsertToSupabase(newSets)
}

main().catch(console.error)
