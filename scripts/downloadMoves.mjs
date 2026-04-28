// scripts/downloadMoves.mjs
// Descarga todos los moves y construye la relación pokémon → moves aprendibles.
//
// Genera:
//   src/data/moves.json          — datos de cada move (nombre, tipo, potencia…)
//   src/data/pokemon_moves.json  — { "3": ["solar-beam", "synthesis", …], … }
//
// Sube a Supabase (si está configurado):
//   tabla moves          — datos de moves
//   tabla pokemon_moves  — relación pokemon_id ↔ move_name_api
//
// Uso: node scripts/downloadMoves.mjs
// Tiempo estimado: 20-40 min dependiendo de la red

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local')
  if (!fs.existsSync(envPath)) return {}
  const raw = fs.readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) env[k.trim()] = v.join('=').trim()
  }
  return env
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchJSON(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
      if (res.status === 404) return null
      console.warn(`  HTTP ${res.status} en ${url} — reintento ${i+1}/${retries}`)
      await sleep(500 * (i + 1))
    } catch (e) {
      console.warn(`  Error de red en ${url}: ${e.message} — reintento ${i+1}/${retries}`)
      await sleep(800 * (i + 1))
    }
  }
  return null
}

function getName(names, lang) {
  return names?.find(n => n.language.name === lang)?.name ?? ''
}

function categoryFromDamageCls(dc) {
  if (!dc) return 'status'
  if (dc.name === 'physical') return 'physical'
  if (dc.name === 'special')  return 'special'
  return 'status'
}

function getFlavorText(entries, lang) {
  if (!entries?.length) return ''
  const PREFERRED_VERSIONS = [
    'scarlet-violet', 'sword-shield', 'sun-moon', 'x-y',
    'black-2-white-2', 'black-white', 'heart-gold-soul-silver',
    'diamond-pearl', 'ruby-sapphire',
  ]
  const filtered = entries.filter(e => e.language.name === lang)
  if (!filtered.length) return ''
  for (const version of PREFERRED_VERSIONS) {
    const found = filtered.find(e => e.version_group.name === version)
    if (found) return found.flavor_text.replace(/\n|\f/g, ' ').trim()
  }
  return filtered[filtered.length - 1].flavor_text.replace(/\n|\f/g, ' ').trim()
}

async function main() {
  console.log('\n🎮 Descargando moves y relaciones pokémon→moves desde PokeAPI...\n')

  const movesPath   = path.join(__dirname, '../src/data/moves.json')
  const pkmnMovPath = path.join(__dirname, '../src/data/pokemon_moves.json')

  // ── 1. Cargar caché existente de moves ────────────────────────────────────
  const existingMoves = fs.existsSync(movesPath)
    ? JSON.parse(fs.readFileSync(movesPath, 'utf8'))
    : []
  const moveCache = new Map(existingMoves.map(m => [m.nameApi, m]))
  console.log(`  Moves en caché: ${moveCache.size}`)

  // ── 2. Obtener lista de todos los Pokémon ─────────────────────────────────
  console.log('  Obteniendo lista de Pokémon...')
  const pokemonList = await fetchJSON('https://pokeapi.co/api/v2/pokemon?limit=2000')
  if (!pokemonList) { console.error('Error al obtener la lista de Pokémon'); process.exit(1) }
  console.log(`  Total Pokémon: ${pokemonList.results.length}\n`)

  // ── 3. Iterar pokémon — recopilar slugs únicos Y relaciones id→moves ──────
  // pokemonMovesMap: { pokemonId → Set<moveSlug> }
  const allMoveSlugs   = new Set()
  const pokemonMovesMap = new Map()   // Map<number, Set<string>>

  let pkmnDone = 0
  const BATCH_PKM = 20

  for (let i = 0; i < pokemonList.results.length; i += BATCH_PKM) {
    const batch   = pokemonList.results.slice(i, i + BATCH_PKM)
    const results = await Promise.all(batch.map(p => fetchJSON(p.url)))

    for (const pkmn of results) {
      if (!pkmn?.moves) continue

      const pkmnId = pkmn.id
      const moveSet = new Set()

      for (const entry of pkmn.moves) {
        // SIN filtro por version_group — todos los moves de todos los juegos
        const slug = entry.move.name
        allMoveSlugs.add(slug)
        moveSet.add(slug)
      }

      pokemonMovesMap.set(pkmnId, moveSet)
    }

    pkmnDone += batch.length
    process.stdout.write(
      `  Pokémon analizados: ${pkmnDone}/${pokemonList.results.length}` +
      ` → ${allMoveSlugs.size} moves únicos\r`
    )
    await sleep(30)
  }
  console.log(`\n\n  Moves únicos encontrados: ${allMoveSlugs.size}`)

  // ── 4. Cross-check con /move (para no perder ninguno) ─────────────────────
  console.log('  Verificando lista completa de /move...')
  const moveListData = await fetchJSON('https://pokeapi.co/api/v2/move?limit=2000')
  if (moveListData) {
    for (const m of moveListData.results) allMoveSlugs.add(m.name)
  }
  console.log(`  Total moves a descargar: ${allMoveSlugs.size}`)

  // ── 5. Descargar datos de cada move ───────────────────────────────────────
  const movesResult = new Map(moveCache)
  let downloaded = 0, cached = 0, failed = 0

  const slugArray = [...allMoveSlugs].sort()
  console.log('\n  Descargando datos de cada move...\n')

  for (let i = 0; i < slugArray.length; i++) {
    const nameApi = slugArray[i]
    process.stdout.write(`[${i+1}/${slugArray.length}] ${nameApi}... `)

    if (movesResult.has(nameApi) && movesResult.get(nameApi).descriptionEn !== undefined) {
      process.stdout.write('(caché)\n')
      cached++
      continue
    }

    const data = await fetchJSON(`https://pokeapi.co/api/v2/move/${nameApi}`)
    if (!data) {
      process.stdout.write('✗ (no encontrado)\n')
      failed++
      await sleep(60)
      continue
    }

    const nameEn = getName(data.names, 'en')
    const nameEs = getName(data.names, 'es') || getName(data.names, 'es-mx') || nameEn
    const nameJa = getName(data.names, 'ja-Hrkt') || getName(data.names, 'ja')

    movesResult.set(nameApi, {
      nameApi,
      nameEn:        nameEn || data.name,
      nameEs:        nameEs || nameEn || data.name,
      nameJa:        nameJa || '',
      type:          data.type?.name ?? 'normal',
      category:      categoryFromDamageCls(data.damage_class),
      power:         data.power ?? 0,
      accuracy:      data.accuracy ?? null,
      pp:            data.pp ?? 10,
      descriptionEn: getFlavorText(data.flavor_text_entries, 'en'),
      descriptionEs: getFlavorText(data.flavor_text_entries, 'es') || getFlavorText(data.flavor_text_entries, 'en'),
      descriptionJa: getFlavorText(data.flavor_text_entries, 'ja'),
    })
    downloaded++
    process.stdout.write('✓\n')

    if (downloaded % 50 === 0) {
      const arr = [...movesResult.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
      fs.writeFileSync(movesPath, JSON.stringify(arr, null, 2))
      console.log(`  💾 Guardado intermedio: ${arr.length} moves`)
    }

    await sleep(60)
  }

  // ── 6. Guardar moves.json ─────────────────────────────────────────────────
  const finalMoves = [...movesResult.values()].sort((a, b) => a.nameEn.localeCompare(b.nameEn))
  fs.writeFileSync(movesPath, JSON.stringify(finalMoves, null, 2))
  console.log(`\n✅ moves.json: ${finalMoves.length} moves | Descargados: ${downloaded} | Caché: ${cached} | Fallidos: ${failed}`)

  // ── 7. Guardar pokemon_moves.json ─────────────────────────────────────────
  // Formato: { "3": ["solar-beam", "synthesis", …], "6": ["flamethrower", …], … }
  const pkmnMovObj = {}
  for (const [id, moveSet] of pokemonMovesMap.entries()) {
    // Deduplicar (Set ya lo garantiza) y ordenar
    pkmnMovObj[String(id)] = [...moveSet].sort()
  }
  fs.writeFileSync(pkmnMovPath, JSON.stringify(pkmnMovObj, null, 2))
  console.log(`✅ pokemon_moves.json: ${pokemonMovesMap.size} pokémon`)

  // ── 8. Validar moves críticos ─────────────────────────────────────────────
  const REQUIRED = ['solar-beam', 'synthesis', 'giga-drain', 'petal-dance',
                    'earthquake', 'ice-beam', 'thunderbolt', 'flamethrower']
  console.log('\n🔍 Validando moves críticos...')
  for (const slug of REQUIRED) {
    const inMoves    = movesResult.has(slug)
    const venusaurId = 3
    const inVenusaur = pokemonMovesMap.get(venusaurId)?.has(slug)
    const marker = inMoves ? '✓' : '✗'
    const vmark  = inVenusaur !== undefined ? (inVenusaur ? ' (Venusaur ✓)' : ' (Venusaur ✗)') : ''
    console.log(`  ${marker} ${slug}${vmark}`)
  }

  // ── 9. Subir a Supabase ───────────────────────────────────────────────────
  const env = loadEnv()
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    console.log('\n(Sin Supabase configurado — solo JSON local generado)')
    printSQL()
    return
  }

  console.log('\n☁  Subiendo a Supabase...')
  const { createClient } = await import('@supabase/supabase-js')
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

  // moves
  try {
    const BATCH = 100
    for (let i = 0; i < finalMoves.length; i += BATCH) {
      const batch = finalMoves.slice(i, i + BATCH).map(m => ({
        name_api:        m.nameApi,
        name_es:         m.nameEs,
        name_en:         m.nameEn,
        name_ja:         m.nameJa,
        type:            m.type,
        category:        m.category,
        power:           m.power || null,
        accuracy:        m.accuracy,
        pp:              m.pp,
        description_en:  m.descriptionEn,
        description_es:  m.descriptionEs,
        description_ja:  m.descriptionJa,
      }))
      const { error } = await sb.from('moves').upsert(batch, { onConflict: 'name_api', ignoreDuplicates: true })
      if (error) console.error(`  ⚠ moves batch ${i}: ${error.message}`)
      else process.stdout.write(`  moves: ${Math.min(i + BATCH, finalMoves.length)}/${finalMoves.length}\r`)
    }
    console.log(`\n  ✅ moves: ${finalMoves.length} registros`)
  } catch (e) {
    console.warn(`  ⚠ Error subiendo moves: ${e.message}`)
  }

  // pokemon_moves — TRUNCATE + INSERT en lotes
  try {
    console.log('  Limpiando pokemon_moves...')
    const { error: trErr } = await sb.rpc('truncate_pokemon_moves')
    if (trErr) {
      // Si no existe la función RPC, intentar DELETE
      console.warn(`  ⚠ RPC truncate_pokemon_moves no disponible — usando DELETE`)
      await sb.from('pokemon_moves').delete().neq('pokemon_id', -1)
    }

    console.log('  Insertando pokemon_moves...')
    const allRows = []
    for (const [id, moveSet] of pokemonMovesMap.entries()) {
      for (const slug of moveSet) {
        allRows.push({ pokemon_id: id, move_name_api: slug })
      }
    }

    const BATCH = 500
    for (let i = 0; i < allRows.length; i += BATCH) {
      const batch = allRows.slice(i, i + BATCH)
      const { error } = await sb.from('pokemon_moves').upsert(batch, {
        onConflict: 'pokemon_id,move_name_api',
        ignoreDuplicates: true,
      })
      if (error) console.error(`  ⚠ pokemon_moves batch ${i}: ${error.message}`)
      else process.stdout.write(`  pokemon_moves: ${Math.min(i + BATCH, allRows.length)}/${allRows.length}\r`)
    }
    console.log(`\n  ✅ pokemon_moves: ${allRows.length} filas`)
  } catch (e) {
    console.warn(`  ⚠ Error subiendo pokemon_moves: ${e.message}`)
  }

  printSQL()
}

function printSQL() {
  console.log('\n📋 SQL para crear las tablas si no existen:')
  console.log(`
-- Tabla de datos de moves
CREATE TABLE IF NOT EXISTS moves (
  name_api       text PRIMARY KEY,
  name_en        text,
  name_es        text,
  name_ja        text,
  type           text,
  category       text,
  power          integer,
  accuracy       integer,
  pp             integer,
  description_en text,
  description_es text,
  description_ja text
);

-- Tabla de relación pokémon ↔ moves aprendibles
CREATE TABLE IF NOT EXISTS pokemon_moves (
  pokemon_id    integer,
  move_name_api text,
  PRIMARY KEY (pokemon_id, move_name_api)
);

-- Función RPC para limpiar pokemon_moves (ejecutar en Supabase SQL Editor)
CREATE OR REPLACE FUNCTION truncate_pokemon_moves()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  TRUNCATE TABLE pokemon_moves;
END;
$$;

-- Verificar solar-beam en Venusaur (id=3)
SELECT * FROM pokemon_moves WHERE pokemon_id = 3 AND move_name_api = 'solar-beam';
`)
}

main().catch(e => { console.error(e); process.exit(1) })
