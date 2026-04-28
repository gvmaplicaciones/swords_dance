// scripts/downloadSmogonSets.mjs
// Descarga los sets de Smogon VGC, los sube a Supabase y genera src/data/smogon_sets.json
// Uso: node scripts/downloadSmogonSets.mjs

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Leer .env.local ────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  }
  return env
}

// ── Smogon ─────────────────────────────────────────────────────────────────────
const FORMATS = ['gen9vgc2025regh','gen9vgc2025regg']
const MONTHS  = ['2026-03','2026-02','2026-01','2025-12','2025-11','2025-10']

async function fetchSmogon() {
  for (const month of MONTHS) {
    for (const fmt of FORMATS) {
      const url = `https://www.smogon.com/stats/${month}/chaos/${fmt}-0.json`
      try {
        process.stdout.write(`  Probando ${month}/${fmt}... `)
        const res = await fetch(url)
        if (res.ok) {
          console.log('✓')
          return await res.json()
        }
        console.log(`${res.status}`)
      } catch (e) { console.log(`err: ${e.message}`) }
    }
  }
  return null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toSlug(s) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
function topEntry(rec) {
  const entries = Object.entries(rec).filter(([k]) => k !== 'nothing' && k !== '' && k !== 'No Item')
  if (!entries.length) return null
  return entries.sort((a, b) => b[1] - a[1])[0]
}
function topN(rec, n) {
  return Object.entries(rec)
    .filter(([k]) => k !== 'nothing' && k !== '' && k !== 'No Item')
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}
function parseSpread(s) {
  const [nature, evPart] = s.split(':')
  if (!evPart) return null
  const parts = evPart.split('/').map(Number)
  if (parts.length !== 6 || parts.some(isNaN)) return null
  const [hp, atk, def, spAtk, spDef, spe] = parts
  return {
    nature,
    sp: {
      hp:    Math.min(32, Math.round(hp    / 8)),
      atk:   Math.min(32, Math.round(atk   / 8)),
      def:   Math.min(32, Math.round(def   / 8)),
      spAtk: Math.min(32, Math.round(spAtk / 8)),
      spDef: Math.min(32, Math.round(spDef / 8)),
      spe:   Math.min(32, Math.round(spe   / 8)),
    },
  }
}

// ── Mapping nombre Smogon ─────────────────────────────────────────────────────
function toSmogonName(pokemon) {
  if (pokemon.isMega) {
    const base = pokemon.name.en.replace(/^Mega\s+/i, '').trim().split(/\s+/)
    return base.length === 1 ? `${base[0]}-Mega` : `${base[0]}-Mega-${base.slice(1).join('-')}`
  }
  const ID_MAP = {
    10008:'Rotom-Heat',  10009:'Rotom-Wash',   10010:'Rotom-Frost',
    10011:'Rotom-Fan',   10012:'Rotom-Mow',
    10100:'Raichu-Alola',   10104:'Ninetales-Alola',
    10165:'Slowbro-Galar',  10172:'Slowking-Galar',   10180:'Stunfisk-Galar',
    10126:'Lycanroc-Midnight', 10152:'Lycanroc-Dusk',
    10230:'Arcanine-Hisui',  10233:'Typhlosion-Hisui', 10236:'Samurott-Hisui',
    10239:'Zoroark-Hisui',   10242:'Goodra-Hisui',
    10243:'Avalugg-Hisui',   10244:'Decidueye-Hisui',
  }
  return ID_MAP[pokemon.id] ?? pokemon.name.en
}

// ── Extraer set ────────────────────────────────────────────────────────────────
function extractSet(entry) {
  if (!entry) return null
  const rawCount = entry['Raw count'] || 1

  const topAbility = topEntry(entry.Abilities)
  const topItem    = topEntry(entry.Items)
  if (!topAbility) return null

  const topSpread    = topEntry(entry.Spreads)
  const parsedSpread = topSpread ? parseSpread(topSpread[0]) : null

  const moves = topN(entry.Moves, 5)
    .filter(([m]) => m !== 'nothing')
    .slice(0, 4)

  return {
    ability:      { name: topAbility[0], slug: toSlug(topAbility[0]), usage: +(topAbility[1] / rawCount).toFixed(3) },
    item:         topItem ? { name: topItem[0], slug: toSlug(topItem[0]), usage: +(topItem[1] / rawCount).toFixed(3) } : null,
    nature:       { name: parsedSpread?.nature ?? 'Hardy', usage: topSpread ? +(topSpread[1] / rawCount).toFixed(3) : 0 },
    spSpread:     parsedSpread?.sp ?? { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 },
    moves:        moves.map(([m, c]) => ({ name: m, usage: +(c / rawCount).toFixed(3) })),
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎯 Descargando sets de Smogon VGC...\n')

  const pokemonPath = path.join(__dirname, '../src/data/pokemon.json')
  const allPokemon  = JSON.parse(fs.readFileSync(pokemonPath, 'utf8'))

  console.log('📡 Descargando datos de Smogon...')
  const raw = await fetchSmogon()
  if (!raw) { console.error('❌ No se pudo descargar datos de Smogon.'); process.exit(1) }

  console.log(`\n📊 Procesando ${allPokemon.length} Pokémon...`)
  const result = {}
  let found = 0, missing = 0

  for (const pokemon of allPokemon) {
    const smogonName = toSmogonName(pokemon)
    const entry = raw.data[smogonName]
    const set = extractSet(entry)
    if (set) {
      result[smogonName] = set
      found++
    } else {
      missing++
      // console.log(`  ✗ No encontrado: ${smogonName}`)
    }
  }

  console.log(`\n  ✓ Sets encontrados: ${found}`)
  console.log(`  ✗ No en Smogon:     ${missing}`)

  // Guardar JSON local
  const outputPath = path.join(__dirname, '../src/data/smogon_sets.json')
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  console.log(`\n✅ Guardado: ${outputPath}`)

  // Subir a Supabase
  console.log('\n☁  Subiendo a Supabase...')
  const env = loadEnv()
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

    const rows = Object.entries(result).map(([pokemon_name, set]) => ({
      pokemon_name,
      moves:     set.moves,
      item:      set.item,
      ability:   set.ability,
      nature:    set.nature,
      sp_spread: set.spSpread,
    }))

    // Lotes de 50
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50)
      const { error } = await sb.from('smogon_sets').upsert(batch, { onConflict: 'pokemon_name' })
      if (error) { console.error(`  ⚠ Supabase error (lote ${i}): ${error.message}`); break }
      process.stdout.write(`  ✓ ${Math.min(i + 50, rows.length)}/${rows.length}\r`)
    }
    console.log(`\n✅ Supabase: ${rows.length} sets subidos`)
  } catch (e) {
    console.warn(`  ⚠ No se pudo subir a Supabase: ${e.message}`)
    console.warn('  → El archivo JSON local sí se generó correctamente.')
    console.warn('  → Para crear la tabla en Supabase, ejecuta el SQL de setup.')
  }

  console.log('\n📋 SQL para crear la tabla (ejecutar en Supabase SQL Editor):')
  console.log(`
CREATE TABLE IF NOT EXISTS smogon_sets (
  pokemon_name text PRIMARY KEY,
  moves jsonb,
  item  jsonb,
  ability jsonb,
  nature  jsonb,
  sp_spread jsonb,
  updated_at timestamptz default now()
);
ALTER TABLE smogon_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON smogon_sets FOR SELECT USING (true);
CREATE POLICY "service insert" ON smogon_sets FOR INSERT WITH CHECK (true);
CREATE POLICY "service update" ON smogon_sets FOR UPDATE USING (true);
`)
}

main().catch(e => { console.error(e); process.exit(1) })
