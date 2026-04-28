// src/lib/statCalc.ts
// Fórmula oficial de Pokémon Champions
// IVs siempre 31, SP se convierte a EVs equivalentes (SP × 8)

import type { PokemonBattleState } from './battleState'

const LEVEL = 50
const IV    = 31

// Tabla de multiplicadores de boost (-6 a +6)
const BOOST_MULTIPLIERS: Record<number, number> = {
  [-6]: 2/8, [-5]: 2/7, [-4]: 2/6, [-3]: 2/5, [-2]: 2/4, [-1]: 2/3,
  [0]: 1,
  [1]: 3/2, [2]: 2, [3]: 5/2, [4]: 3, [5]: 7/2, [6]: 4,
}

const NATURES: Record<string, { up: string; down: string } | null> = {
  Hardy: null, Docile: null, Serious: null, Bashful: null, Quirky: null,
  Lonely:  { up: 'atk',   down: 'def'   },
  Brave:   { up: 'atk',   down: 'spe'   },
  Adamant: { up: 'atk',   down: 'spAtk' },
  Naughty: { up: 'atk',   down: 'spDef' },
  Bold:    { up: 'def',   down: 'atk'   },
  Relaxed: { up: 'def',   down: 'spe'   },
  Impish:  { up: 'def',   down: 'spAtk' },
  Lax:     { up: 'def',   down: 'spDef' },
  Timid:   { up: 'spe',   down: 'atk'   },
  Hasty:   { up: 'spe',   down: 'def'   },
  Jolly:   { up: 'spe',   down: 'spAtk' },
  Naive:   { up: 'spe',   down: 'spDef' },
  Modest:  { up: 'spAtk', down: 'atk'   },
  Mild:    { up: 'spAtk', down: 'def'   },
  Quiet:   { up: 'spAtk', down: 'spe'   },
  Rash:    { up: 'spAtk', down: 'spDef' },
  Calm:    { up: 'spDef', down: 'atk'   },
  Gentle:  { up: 'spDef', down: 'def'   },
  Sassy:   { up: 'spDef', down: 'spe'   },
  Careful: { up: 'spDef', down: 'spAtk' },
}

export interface SPSpread {
  hp: number; atk: number; def: number
  spAtk: number; spDef: number; spe: number
}

export interface BaseStats {
  hp: number; atk: number; def: number
  spAtk: number; spDef: number; spe: number
}

export interface EffectiveStats extends BaseStats {}

function spToEv(sp: number): number {
  return Math.min(32, sp) * 8
}

function getNatureMultiplier(nature: string, statName: string): number {
  const n = NATURES[nature]
  if (!n) return 1
  if (n.up   === statName) return 1.1
  if (n.down === statName) return 0.9
  return 1
}

export function calcBaseStat(
  base: number,
  sp: number,
  statName: string,
  nature: string,
  isHP: boolean
): number {
  const ev = spToEv(sp)
  if (isHP) {
    return Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + LEVEL + 10)
  }
  const mult = getNatureMultiplier(nature, statName)
  return Math.floor(
    Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + 5) * mult
  )
}

function getBoostMultiplier(boost: number): number {
  const clamped = Math.max(-6, Math.min(6, boost))
  return BOOST_MULTIPLIERS[clamped]
}

export function calcEffectiveStats(
  baseStats: BaseStats,
  battleState: PokemonBattleState,
  sp: SPSpread,
  nature = 'Hardy'
): EffectiveStats {
  const rawHP    = calcBaseStat(baseStats.hp,    sp.hp,    'hp',    nature, true)
  const rawAtk   = calcBaseStat(baseStats.atk,   sp.atk,   'atk',   nature, false)
  const rawDef   = calcBaseStat(baseStats.def,   sp.def,   'def',   nature, false)
  const rawSpAtk = calcBaseStat(baseStats.spAtk, sp.spAtk, 'spAtk', nature, false)
  const rawSpDef = calcBaseStat(baseStats.spDef, sp.spDef, 'spDef', nature, false)
  const rawSpe   = calcBaseStat(baseStats.spe,   sp.spe,   'spe',   nature, false)

  const applyBoost = (stat: number, boost: number) =>
    Math.floor(stat * getBoostMultiplier(boost))

  const applyStatus = (stat: number, statName: string) => {
    if (statName === 'atk' && battleState.status === 'burn')      return Math.floor(stat * 0.5)
    if (statName === 'spe' && battleState.status === 'paralysis') return Math.floor(stat * 0.5)
    return stat
  }

  return {
    hp:    rawHP,
    atk:   applyStatus(applyBoost(rawAtk,   battleState.boosts.atk),   'atk'),
    def:   applyBoost(rawDef,   battleState.boosts.def),
    spAtk: applyBoost(rawSpAtk, battleState.boosts.spAtk),
    spDef: applyBoost(rawSpDef, battleState.boosts.spDef),
    spe:   applyStatus(applyBoost(rawSpe, battleState.boosts.spe), 'spe'),
  }
}

export function calcStatRange(
  base: number,
  statName: string,
  isHP: boolean,
  boost = 0
): { min: number; max: number } {
  const rawMin = calcBaseStat(base, 0,  statName, '', isHP)
  const rawMax = calcBaseStat(base, 32, statName, '', isHP)
  const statMin = isHP ? rawMin : Math.floor(rawMin * 0.9)
  const statMax = isHP ? rawMax : Math.floor(rawMax * 1.1)
  const mult = getBoostMultiplier(boost)
  return {
    min: Math.floor(statMin * mult),
    max: Math.floor(statMax * mult),
  }
}

/**
 * Calcula los stats MÁXIMOS posibles del rival para el modo "Stats al máximo".
 * Cada stat se calcula de forma independiente con SP=32 y la mejor naturaleza
 * (+1.1×) para ese stat. Los boosts y estados del combate se siguen aplicando.
 *
 * Esto garantiza que maxStats >= stats reales para TODOS los stats.
 */
export function calcMaxEffectiveStats(
  baseStats: BaseStats,
  battleState: PokemonBattleState,
): EffectiveStats {
  // Naturalezas que dan +1.1 por stat (la mejor posible para cada uno)
  const rawHP    = calcBaseStat(baseStats.hp,    32, 'hp',    'Hardy',   true)
  const rawAtk   = calcBaseStat(baseStats.atk,   32, 'atk',   'Adamant', false)  // +atk
  const rawDef   = calcBaseStat(baseStats.def,   32, 'def',   'Impish',  false)  // +def
  const rawSpAtk = calcBaseStat(baseStats.spAtk, 32, 'spAtk', 'Modest',  false)  // +spAtk
  const rawSpDef = calcBaseStat(baseStats.spDef, 32, 'spDef', 'Calm',    false)  // +spDef
  const rawSpe   = calcBaseStat(baseStats.spe,   32, 'spe',   'Timid',   false)  // +spe

  const applyBoost = (stat: number, boost: number) =>
    Math.floor(stat * getBoostMultiplier(boost))

  return {
    hp:    rawHP,
    atk:   Math.floor(applyBoost(rawAtk,   battleState.boosts.atk)   * (battleState.status === 'burn'      ? 0.5 : 1)),
    def:   applyBoost(rawDef,   battleState.boosts.def),
    spAtk: applyBoost(rawSpAtk, battleState.boosts.spAtk),
    spDef: applyBoost(rawSpDef, battleState.boosts.spDef),
    spe:   Math.floor(applyBoost(rawSpe, battleState.boosts.spe) * (battleState.status === 'paralysis' ? 0.5 : 1)),
  }
}

// Conversión EV Smogon → SP Champions
export function evSpreadToSP(evSpread: string): SPSpread {
  const defaults: SPSpread = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 }
  if (!evSpread) return defaults

  if (/^\d+\/\d+\/\d+\/\d+\/\d+\/\d+$/.test(evSpread.trim())) {
    const [hp, atk, def, spAtk, spDef, spe] = evSpread.split('/').map(Number)
    return {
      hp:    Math.min(32, Math.round(hp    / 8)),
      atk:   Math.min(32, Math.round(atk   / 8)),
      def:   Math.min(32, Math.round(def   / 8)),
      spAtk: Math.min(32, Math.round(spAtk / 8)),
      spDef: Math.min(32, Math.round(spDef / 8)),
      spe:   Math.min(32, Math.round(spe   / 8)),
    }
  }

  const result = { ...defaults }
  const statMap: Record<string, keyof SPSpread> = {
    'HP': 'hp', 'Atk': 'atk', 'Def': 'def',
    'SpA': 'spAtk', 'SpD': 'spDef', 'Spe': 'spe',
  }
  evSpread.split('/').forEach(part => {
    const match = part.trim().match(/(\d+)\s+(\w+)/)
    if (match) {
      const ev = parseInt(match[1])
      const key = statMap[match[2]]
      if (key) result[key] = Math.min(32, Math.round(ev / 8))
    }
  })
  return result
}
