// src/lib/battleState.ts
// Estado de combate en vivo por Pokémon

export type StatusCondition =
  | 'none' | 'burn' | 'paralysis' | 'poison' | 'badly-poison' | 'sleep' | 'freeze'

export type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'hail' | 'snow'
export type Terrain = 'none' | 'electric' | 'grassy' | 'misty' | 'psychic'
export type ActiveForm = 'normal' | 'mega' | 'mega-x' | 'mega-y' | string

export interface StatBoosts {
  atk:   number  // -6 a +6
  def:   number
  spAtk: number
  spDef: number
  spe:   number
  acc:   number
  eva:   number
}

export interface PokemonBattleState {
  pokemonId: number
  activeForm: ActiveForm
  boosts: StatBoosts
  status: StatusCondition
  weather: Weather
  terrain: Terrain
  confirmedItem: string | null
  confirmedAbility: string | null
  seenMoves: string[]
}

export function createDefaultBattleState(pokemonId: number): PokemonBattleState {
  return {
    pokemonId,
    activeForm: 'normal',
    boosts: { atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0, acc: 0, eva: 0 },
    status: 'none',
    weather: 'none',
    terrain: 'none',
    confirmedItem: null,
    confirmedAbility: null,
    seenMoves: [],
  }
}

export function resetBoosts(state: PokemonBattleState): PokemonBattleState {
  return {
    ...state,
    boosts: { atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0, acc: 0, eva: 0 },
  }
}

export function clampBoost(value: number): number {
  return Math.max(-6, Math.min(6, value))
}
