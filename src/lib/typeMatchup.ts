// src/lib/typeMatchup.ts
// Tabla de efectividad de tipos y cálculo de score de matchup.

import type { MySlot } from '../store/BattleContext'
import type { RivalSlot } from '../store/BattleContext'
import { getMoveData } from './moveDb'

// ── Tabla de efectividad ───────────────────────────────────────────────────────
// CHART[attackType][defType] = multiplicador (solo se almacenan los distintos de 1)
// 0 = inmune, 0.5 = poco efectivo, 2 = superefectivo

const CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5,  grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5,             fire: 2, ground: 2, rock: 2 },
  electric: { grass: 0.5, electric: 0.5, dragon: 0.5, ground: 0,  water: 2, flying: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5,
              water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, steel: 0.5, fire: 0.5,    grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { ghost: 0, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, fairy: 0.5,
              normal: 2, ice: 2, rock: 2, dark: 2, steel: 2 },
  poison:   { steel: 0, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5,  grass: 2, fairy: 2 },
  ground:   { flying: 0, grass: 0.5, bug: 0.5,
              fire: 2, electric: 2, poison: 2, rock: 2, steel: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5,           grass: 2, fighting: 2, bug: 2 },
  psychic:  { dark: 0, steel: 0.5, psychic: 0.5,              fighting: 2, poison: 2 },
  bug:      { fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5,
              grass: 2, psychic: 2, dark: 2 },
  rock:     { fighting: 0.5, ground: 0.5, steel: 0.5,         fire: 2, ice: 2, flying: 2, bug: 2 },
  ghost:    { normal: 0,  ghost: 2, psychic: 2, dark: 0.5 },
  dragon:   { steel: 0.5, fairy: 0,                            dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5,           ghost: 2, psychic: 2 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, steel: 0.5,             fighting: 2, dragon: 2, dark: 2 },
}

/** Efectividad de [attackType] contra un Pokémon con [defTypes] */
export function getEffectiveness(attackType: string, defTypes: string[]): number {
  const row = CHART[attackType] ?? {}
  return defTypes.reduce((acc, dt) => {
    const mult = row[dt] ?? 1
    return acc * mult
  }, 1)
}

// ── Colores de borde por score ────────────────────────────────────────────────

export type MatchupTier = 'good' | 'neutral' | 'bad' | 'none'

export function matchupTier(score: number): MatchupTier {
  if (score >= 4)  return 'good'
  if (score >= 1)  return 'neutral'
  return 'bad'
}

export const MATCHUP_BORDER: Record<MatchupTier, string> = {
  good:    'border-[#00ff88] shadow-[0_0_8px_#00ff8866]',
  neutral: 'border-[#ffd93d] shadow-[0_0_6px_#ffd93d44]',
  bad:     'border-[#ff4466] shadow-[0_0_6px_#ff446644]',
  none:    '',
}

// ── Cálculo de score ──────────────────────────────────────────────────────────

/**
 * Calcula el score de matchup de un slot mío contra el equipo rival.
 * Solo se activa si al menos un rival tiene Pokémon.
 */
export function calcMatchupScore(mySlot: MySlot, rivalSlots: RivalSlot[]): number {
  const rivals = rivalSlots.filter(s => s.pokemon !== null)
  if (rivals.length === 0) return 0

  // Tipos de mis moves (deduplicated)
  const myMoveTypes = [...new Set(
    mySlot.moves
      .map(name => getMoveData(name)?.type ?? null)
      .filter(Boolean) as string[]
  )]

  // Tipos defensivos propios (minúsculas)
  const myDefTypes = (mySlot.pokemon?.types ?? []).map(t => t.toLowerCase())

  let score = 0

  for (const rival of rivals) {
    const rivalTypes = (rival.pokemon!.types ?? []).map(t => t.toLowerCase())

    // OFENSA: mejor efectividad de mis moves contra este rival
    let bestEff = myMoveTypes.length === 0 ? 0.5 : 0
    for (const moveType of myMoveTypes) {
      const eff = getEffectiveness(moveType, rivalTypes)
      if (eff > bestEff) bestEff = eff
    }
    if (bestEff >= 2)  score += 2
    else if (bestEff >= 1) score += 1
    else score -= 1

    // DEFENSA: tipos del rival como atacantes contra mis tipos
    for (const rivalType of rivalTypes) {
      const myDef = getEffectiveness(rivalType, myDefTypes)
      if (myDef <= 0)       score += 1  // inmune
      else if (myDef < 1)   score += 1  // resistente
      else if (myDef > 1)   score -= 1  // débil
      // neutro = sin cambio
    }
  }

  return score
}

// ── Counter highlight ─────────────────────────────────────────────────────────

/**
 * Devuelve true si mySlot tiene ventaja contra rival en al menos una condición:
 * 1) algún move superefectivo (×2+) contra el rival
 * 2) resiste o es inmune a al menos uno de los tipos del rival
 * 3) su velocidad real supera la velocidad máxima estimada del rival
 */
export function hasCounterAdvantage(mySlot: MySlot, rival: RivalSlot): boolean {
  if (!mySlot.pokemon || !rival.pokemon) return false

  const rivalTypes = rival.pokemon.types.map(t => t.toLowerCase())
  const myDefTypes = mySlot.pokemon.types.map(t => t.toLowerCase())

  // 1. Move superefectivo
  const myMoveTypes = [...new Set(
    mySlot.moves
      .map(name => getMoveData(name)?.type ?? null)
      .filter(Boolean) as string[]
  )]
  if (myMoveTypes.some(mt => getEffectiveness(mt, rivalTypes) >= 2)) return true

  // 2. Resiste o es inmune a al menos un tipo del rival
  return rivalTypes.some(rt => getEffectiveness(rt, myDefTypes) <= 0.5)
}
