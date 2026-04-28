// src/lib/statModifiers.ts
// Modificadores de stats por objeto y habilidad.
// Devuelve multiplicadores por stat y fuente ('item' | 'ability' | 'both').

import type { EffectiveStats } from './statCalc'

export type ModSource = 'item' | 'ability' | 'both'

export interface StatMod {
  multiplier: number
  source:     ModSource
}

export type StatMods = Partial<Record<keyof EffectiveStats, StatMod>>

// ── Objetos ───────────────────────────────────────────────────────────────────

// itemSlug → { stat: multiplier }
const ITEM_MODS: Record<string, Partial<Record<keyof EffectiveStats, number>>> = {
  'choice-scarf':   { spe: 1.5 },
  'choice-band':    { atk: 1.5 },
  'choice-specs':   { spAtk: 1.5 },
  'light-ball':     { atk: 2, spAtk: 2 },   // solo Pikachu
  'thick-club':     { atk: 2 },              // solo Cubone/Marowak
  'deep-sea-tooth': { spAtk: 2 },            // solo Clamperl
  'deep-sea-scale': { spDef: 2 },            // solo Clamperl
  'metal-powder':   { def: 2 },              // solo Ditto
  'quick-powder':   { spe: 2 },              // solo Ditto
  'eviolite':       { def: 1.5, spDef: 1.5 },
  'assault-vest':   { spDef: 1.5 },
}

// ── Habilidades ────────────────────────────────────────────────────────────────

// abilitySlug → { stat: multiplier }
// Solo se incluyen las que modifican stats de forma relevante para el cálculo de daño.
// Las condicionales (clima, estado) se marcan con el mismo valor — el usuario juzga.
const ABILITY_MODS: Record<string, Partial<Record<keyof EffectiveStats, number>>> = {
  // Siempre activas
  'huge-power':       { atk: 2 },
  'pure-power':       { atk: 2 },
  'hustle':           { atk: 1.5 },
  'gorilla-tactics':  { atk: 1.5 },

  // Condicionales (estado — se muestran igual, el usuario sabe)
  'guts':             { atk: 1.5 },
  'marvel-scale':     { def: 1.5 },
  'quick-feet':       { spe: 1.5 },
  'facade':           { atk: 2 },   // movimiento, no habilidad, pero por consistencia

  // Condicionales (clima)
  'chlorophyll':      { spe: 2 },
  'swift-swim':       { spe: 2 },
  'sand-rush':        { spe: 2 },
  'slush-rush':       { spe: 2 },
  'sand-force':       {},           // potencia moves de roca/acero/tierra, no stats directas
  'solar-power':      { spAtk: 1.5 },

  // Penalizaciones
  'slow-start':       { atk: 0.5, spe: 0.5 },
  'defeatist':        { atk: 0.5, spAtk: 0.5 },

  // Otras
  'fur-coat':         { def: 2 },
  'intrepid-sword':   { atk: 1 },   // +1 etapa al entrar, no multiplicador directo
  'dauntless-shield': { def: 1 },
  'protosynthesis':   {},           // depende del stat más alto — demasiado dinámico
  'quark-drive':      {},
  'download':         {},           // depende del rival
  'intimidate':       {},           // baja atk del rival
  'unburden':         { spe: 2 },   // tras perder objeto
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Calcula los modificadores de stats para un Pokémon dado su objeto y habilidad.
 * Combina fuentes: si ambos afectan la misma stat → source = 'both'.
 */
export function getStatMods(itemSlug: string | undefined, abilitySlug: string | undefined): StatMods {
  const result: StatMods = {}

  const itemMod    = itemSlug    ? ITEM_MODS[itemSlug.toLowerCase()]    : undefined
  const abilityMod = abilitySlug ? ABILITY_MODS[abilitySlug.toLowerCase()] : undefined

  const allKeys = new Set<keyof EffectiveStats>([
    ...Object.keys(itemMod    ?? {}) as (keyof EffectiveStats)[],
    ...Object.keys(abilityMod ?? {}) as (keyof EffectiveStats)[],
  ])

  for (const stat of allKeys) {
    const iMul = itemMod?.[stat]
    const aMul = abilityMod?.[stat]

    if (iMul !== undefined && aMul !== undefined) {
      result[stat] = { multiplier: iMul * aMul, source: 'both' }
    } else if (iMul !== undefined) {
      result[stat] = { multiplier: iMul, source: 'item' }
    } else if (aMul !== undefined) {
      result[stat] = { multiplier: aMul, source: 'ability' }
    }
  }

  return result
}

/** Aplica los modificadores a un valor de stat ya calculado. */
export function applyMod(value: number, mod: StatMod | undefined): number {
  if (!mod || mod.multiplier === 1) return value
  return Math.floor(value * mod.multiplier)
}
