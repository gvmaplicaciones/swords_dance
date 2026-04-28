// scripts/addMissingMegas.mjs
// Fetches missing mega/primal forms from PokeAPI and adds to pokemon.json

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const POKEMON_PATH = join(__dir, '../src/data/pokemon.json')

// Missing megas to add: [pokeapi_id, base_pokemon_name, base_pokemon_id, is_mega]
const MISSING = [
  { id: 10043, name: 'mewtwo-mega-x',  baseId: 150, isMega: true  },
  { id: 10044, name: 'mewtwo-mega-y',  baseId: 150, isMega: true  },
  { id: 10050, name: 'blaziken-mega',  baseId: 257, isMega: true  },
  { id: 10052, name: 'mawile-mega',    baseId: 303, isMega: true  },
  { id: 10062, name: 'latias-mega',    baseId: 380, isMega: true  },
  { id: 10063, name: 'latios-mega',    baseId: 381, isMega: true  },
  { id: 10064, name: 'swampert-mega',  baseId: 260, isMega: true  },
  { id: 10065, name: 'sceptile-mega',  baseId: 254, isMega: true  },
  { id: 10072, name: 'steelix-mega',   baseId: 208, isMega: true  },
  { id: 10075, name: 'diancie-mega',   baseId: 719, isMega: true  },
  { id: 10076, name: 'metagross-mega', baseId: 376, isMega: true  },
  { id: 10079, name: 'rayquaza-mega',  baseId: 384, isMega: true  },
  { id: 10089, name: 'salamence-mega', baseId: 373, isMega: true  },
]

async function fetchPokemon(id) {
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  if (!r.ok) throw new Error(`Failed ${id}: ${r.status}`)
  return r.json()
}

function buildEntry(data, meta) {
  const stats = {}
  for (const s of data.stats) {
    const map = { 'hp':'hp','attack':'atk','defense':'def','special-attack':'spAtk','special-defense':'spDef','speed':'spe' }
    const k = map[s.stat.name]
    if (k) stats[k] = s.base_stat
  }
  const abilities = data.abilities.map(a => ({ name: a.ability.name, hidden: a.is_hidden }))
  const home = data.sprites?.other?.home
  return {
    id: data.id,
    name: { en: meta.name, es: meta.name, ja: meta.name },
    types: data.types.map(t => t.type.name),
    baseStats: {
      hp:    stats.hp    ?? 0,
      atk:   stats.atk   ?? 0,
      def:   stats.def   ?? 0,
      spAtk: stats.spAtk ?? 0,
      spDef: stats.spDef ?? 0,
      spe:   stats.spe   ?? 0,
    },
    sprites: {
      normal:      home?.front_default ?? null,
      female:      home?.front_female  ?? null,
      shiny:       home?.front_shiny   ?? null,
      shinyFemale: home?.front_shiny_female ?? null,
    },
    abilities,
    isMega:      meta.isMega,
    megaOf:      meta.baseId,
    megaEvolutions: [],
    baseForm:    meta.baseId,
    competitiveSets: [],
  }
}

async function main() {
  const pokemon = JSON.parse(readFileSync(POKEMON_PATH, 'utf8'))
  const existingIds = new Set(pokemon.map(p => p.id))

  const toAdd = []
  for (const meta of MISSING) {
    if (existingIds.has(meta.id)) { console.log(`Skip ${meta.name} (already exists)`); continue }
    console.log(`Fetching ${meta.name} (${meta.id})...`)
    try {
      const data = await fetchPokemon(meta.id)
      const entry = buildEntry(data, meta)
      toAdd.push(entry)
      console.log(`  ✓ ${entry.name.en} | ${entry.types.join('/')} | BST ${Object.values(entry.baseStats).reduce((a,b)=>a+b,0)}`)
    } catch (e) {
      console.error(`  ✗ ${e.message}`)
    }
  }

  if (toAdd.length === 0) { console.log('Nothing to add.'); return }

  // Also update megaEvolutions on base pokemon
  for (const entry of toAdd) {
    const base = pokemon.find(p => p.id === entry.megaOf)
    if (base && !base.megaEvolutions.includes(entry.id)) {
      base.megaEvolutions.push(entry.id)
    }
  }

  const updated = [...pokemon, ...toAdd].sort((a,b) => a.id - b.id)
  writeFileSync(POKEMON_PATH, JSON.stringify(updated, null, 2))
  console.log(`\n✓ Added ${toAdd.length} entries to pokemon.json`)
}

main().catch(console.error)
