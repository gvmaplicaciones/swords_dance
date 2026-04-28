// src/lib/setsDb.ts
// Carga sets generados por Claude (source="claude-sonnet") desde Supabase
// y los convierte al formato SmogonSet que usa la app.
// Tiene prioridad sobre los sets de Smogon/Pikalytics.

import { supabase } from './supabase'
import type { SmogonSet } from './smogon'
import { getMoveData } from './moveDb'
import itemsData from '../data/items.json'

// ── Lookup de items por slug ───────────────────────────────────────────────────
type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ITEM_BY_SLUG: Record<string, ItemEntry> = {}
for (const item of itemsData as ItemEntry[]) {
  ITEM_BY_SLUG[item.nameApi] = item
  ITEM_BY_SLUG[item.nameApi.replace(/-/g, '')] = item
}

function resolveItem(slug: string): { name: string; slug: string } {
  const found = ITEM_BY_SLUG[slug] ?? ITEM_BY_SLUG[slug?.replace(/-/g, '')]
  if (found) return { name: found.nameEn, slug: found.nameApi }
  // Fallback: capitalizar slug
  const display = slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? ''
  return { name: display, slug: slug ?? '' }
}

function resolveAbilityDisplay(slug: string): string {
  return slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? ''
}

// ── Tipo de la tabla sets de Supabase ─────────────────────────────────────────
interface DbSet {
  pokemon_id:   number
  pokemon_name: string
  moves:        string[]   // API slugs, ej. ["solar-beam", "synthesis"]
  item:         string     // API slug, ej. "choice-scarf"
  ability:      string     // API slug, ej. "overgrow"
  nature:       string     // ej. "Modest"
  sp_spread:    { hp: number; atk: number; def: number; spAtk: number; spDef: number; spe: number }
  role:         string
  source:       string
}

// ── Cache en memoria ───────────────────────────────────────────────────────────
let _cache: Map<number, SmogonSet> | null = null
let _loadPromise: Promise<Map<number, SmogonSet>> | null = null

function dbSetToSmogonSet(row: DbSet): SmogonSet {
  const item = resolveItem(row.item)
  const moves = (row.moves ?? []).map(slug => {
    const data = getMoveData(slug)
    return data?.nameEn ?? slug
  })

  return {
    ability:        row.ability ?? '',
    abilityDisplay: resolveAbilityDisplay(row.ability),
    item:           item.name,
    itemSlug:       item.slug,
    nature:         row.nature ?? 'Hardy',
    sp:             row.sp_spread ?? { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 },
    moves,
    moveUsages:     moves.map(() => 1),
    itemUsage:      1,
    abilityUsage:   1,
  }
}

/** Carga todos los sets claude-sonnet de Supabase en un Map<pokemonId, SmogonSet>. */
async function loadClaudeSets(): Promise<Map<number, SmogonSet>> {
  const map = new Map<number, SmogonSet>()
  try {
    const { data, error } = await supabase
      .from('sets')
      .select('pokemon_id,pokemon_name,moves,item,ability,nature,sp_spread,role,source')
      .eq('source', 'claude-sonnet')

    if (error) {
      console.warn('[setsDb] Error cargando sets de Supabase:', error.message)
      return map
    }

    for (const row of (data ?? []) as DbSet[]) {
      map.set(row.pokemon_id, dbSetToSmogonSet(row))
    }
    console.log(`[setsDb] ${map.size} sets claude-sonnet cargados`)
  } catch (e) {
    console.warn('[setsDb] Supabase no disponible:', e)
  }
  return map
}

/**
 * Inicia la carga de sets en background.
 * Llamar una vez al arrancar la app (BattleContext).
 */
export function initClaudeSets(): void {
  if (_cache || _loadPromise) return
  _loadPromise = loadClaudeSets().then(map => {
    _cache = map
    return map
  })
}

/**
 * Devuelve el set claude-sonnet para un pokémon si está disponible.
 * Sincrónico — devuelve null si los sets aún no han cargado.
 */
export function getClaudeSet(pokemonId: number): SmogonSet | null {
  return _cache?.get(pokemonId) ?? null
}

/** Espera a que los sets carguen y luego devuelve el set del pokémon. */
export async function getClaudeSetAsync(pokemonId: number): Promise<SmogonSet | null> {
  if (_cache) return _cache.get(pokemonId) ?? null
  if (_loadPromise) {
    const map = await _loadPromise
    return map.get(pokemonId) ?? null
  }
  return null
}

/** True si los sets claude ya están disponibles en caché. */
export function isClaudeSetsReady(): boolean {
  return _cache !== null
}
