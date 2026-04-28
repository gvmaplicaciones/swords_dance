// src/types/pokemon.ts

export interface PokemonName {
  en: string
  es: string
  ja: string
}

export interface PokemonBaseStats {
  hp: number
  atk: number
  def: number
  spAtk: number
  spDef: number
  spe: number
}

export interface PokemonSprites {
  normal:      string | null
  female:      string | null
  shiny:       string | null
  shinyFemale: string | null
}

export interface PokemonAbility {
  name: string
  hidden: boolean
}

export interface CompetitiveSet {
  name: PokemonName
  item: string
  ability: string
  moves: string[]
  sp: {
    hp: number; atk: number; def: number
    spAtk: number; spDef: number; spe: number
  }
  smogonRef?: string
  nature: string
  usage: number
}

export interface PokemonData {
  id: number
  name: PokemonName
  types: string[]
  baseStats: PokemonBaseStats
  sprites: PokemonSprites
  abilities: PokemonAbility[]
  isMega?: boolean
  isRegional?: boolean
  megaOf?: number
  megaEvolutions: number[]
  baseForm?: number
  competitiveSets: CompetitiveSet[]
}
