// src/lib/moveDb.ts
// Carga datos de moves y relaciones pokémon→moves desde JSON locales
// (generados por scripts/downloadMoves.mjs)

import movesRaw    from '../data/moves.json'
import pkmnMovRaw  from '../data/pokemon_moves.json'

export interface MoveData {
  nameApi:        string
  nameEn:         string
  nameEs:         string
  nameJa:         string
  type:           string
  category:       'physical' | 'special' | 'status'
  power:          number       // 0 si es de estado
  accuracy:       number | null
  pp:             number
  descriptionEn?: string
  descriptionEs?: string
  descriptionJa?: string
}

// Filtrar variantes de Z-moves (--physical / --special) — no son seleccionables
const ALL_MOVES = (movesRaw as MoveData[]).filter(
  m => !m.nameApi.includes('--physical') && !m.nameApi.includes('--special')
)

// pokemon_moves.json: { "3": ["solar-beam", "synthesis", …], … }
const PKMN_MOVES = pkmnMovRaw as Record<string, string[]>

// Índice por nombre (EN, ES, JA y API slug) → lookup O(1)
const BY_NAME: Record<string, MoveData> = {}
for (const m of ALL_MOVES) {
  BY_NAME[m.nameApi.toLowerCase()]              = m
  if (m.nameEn) BY_NAME[m.nameEn.toLowerCase()] = m
  if (m.nameEs) BY_NAME[m.nameEs.toLowerCase()] = m
}

/** Devuelve los datos de un move por nombre (EN, ES o API slug). */
export function getMoveData(name: string): MoveData | null {
  if (!name) return null
  return BY_NAME[name.toLowerCase()] ?? null
}

/**
 * Busca moves que coincidan con la query en el idioma activo.
 * Sin query → devuelve la lista completa ordenada alfabéticamente.
 * @param q          texto de búsqueda
 * @param lang       'es' | 'en' | 'ja'
 * @param limit      máximo de resultados
 * @param pokemonId  si se indica, filtra por moves que ese pokémon puede aprender
 */
export function searchMoves(q: string, lang: string, limit = 200, pokemonId?: number): MoveData[] {
  // Si hay pokemonId, trabajar solo sobre sus moves aprendibles (deduplicados)
  let pool: MoveData[]
  if (pokemonId !== undefined) {
    const slugs = PKMN_MOVES[String(pokemonId)] ?? []
    // Deduplicar por nameApi y mapear a MoveData
    pool = [...new Map(
      slugs.map(s => BY_NAME[s]).filter(Boolean).map(m => [m.nameApi, m])
    ).values()]
  } else {
    pool = ALL_MOVES
  }

  const lower = q.trim().toLowerCase()
  if (!lower) return pool.slice(0, limit)

  const results: MoveData[] = []
  for (const m of pool) {
    const primary   = lang === 'ja' ? m.nameJa : lang === 'es' ? m.nameEs : m.nameEn
    const secondary = m.nameEn
    if (
      primary?.toLowerCase().includes(lower) ||
      secondary?.toLowerCase().includes(lower) ||
      m.nameApi.includes(lower)
    ) {
      results.push(m)
      if (results.length >= limit) break
    }
  }
  return results
}

/** Todos los moves del pokémon indicado (vacío si no se conoce). */
export function getPokemonMoves(pokemonId: number): MoveData[] {
  const slugs = PKMN_MOVES[String(pokemonId)] ?? []
  return [...new Map(
    slugs.map(s => BY_NAME[s]).filter(Boolean).map(m => [m.nameApi, m])
  ).values()]
}

/** Todos los moves (para un selector completo sin filtro). */
export function getAllMoves(): MoveData[] {
  return ALL_MOVES
}
