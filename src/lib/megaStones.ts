// src/lib/megaStones.ts
// Maps mega stone item slugs → mega forms (PokeAPI classic + Legends Z-A)
// También maneja el objeto genérico "megaevolucion" que reemplaza a las piedras individuales.

import type { PokemonData } from '../types/pokemon'
import { MEGA_EVOLUTIONS_ZA } from '../data/mega-evolutions-za'

/** Slug del objeto genérico de Mega Evolución */
export const MEGA_EVOLUCION_SLUG = 'megaevolucion'

// ── Classic mega stones (PokeAPI) ─────────────────────────────────────────────
// Item slug → mega form name (PokeAPI slug, matched against pokemon.json)
export const MEGA_STONE_MAP: Record<string, string> = {
  // Gen 1
  'venusaurite':    'venusaur-mega',
  'charizardite-x': 'charizard-mega-x',
  'charizardite-y': 'charizard-mega-y',
  'blastoisinite':  'blastoise-mega',
  'alakazite':      'alakazam-mega',
  'gengarite':      'gengar-mega',
  'kangaskhanite':  'kangaskhan-mega',
  'pinsirite':      'pinsir-mega',
  'gyaradosite':    'gyarados-mega',
  'aerodactylite':  'aerodactyl-mega',
  'mewtwonite-x':   'mewtwo-mega-x',
  'mewtwonite-y':   'mewtwo-mega-y',
  // Gen 2
  'ampharosite':    'ampharos-mega',
  'scizorite':      'scizor-mega',
  'heracronite':    'heracross-mega',
  'houndoominite':  'houndoom-mega',
  'tyranitarite':   'tyranitar-mega',
  // Gen 3
  'sceptilite':     'sceptile-mega',
  'blazikenite':    'blaziken-mega',
  'swampertite':    'swampert-mega',
  'gardevoirite':   'gardevoir-mega',
  'mawilite':       'mawile-mega',
  'aggronite':      'aggron-mega',
  'medichamite':    'medicham-mega',
  'manectite':      'manectric-mega',
  'sharpedonite':   'sharpedo-mega',
  'cameruptite':    'camerupt-mega',
  'latiasite':      'latias-mega',
  'latiosite':      'latios-mega',
  'salamencite':    'salamence-mega',
  'metagrossite':   'metagross-mega',
  // Gen 4
  'sablenite':      'sableye-mega',
  'altarianite':    'altaria-mega',
  'banettite':      'banette-mega',
  'absolite':       'absol-mega',
  'glalitite':      'glalie-mega',
  'lopunnite':      'lopunny-mega',
  'garchompite':    'garchomp-mega',
  'lucarionite':    'lucario-mega',
  'abomasite':      'abomasnow-mega',
  'galladite':      'gallade-mega',
  'steelixite':     'steelix-mega',
  // Gen 5+
  'audinite':       'audino-mega',
  'slowbronite':    'slowbro-mega',
  'pidgeotite':     'pidgeot-mega',
  'beedrillite':    'beedrill-mega',
  'diancite':       'diancie-mega',
}

// ── ZA mega stones (Legends: Z-A) ─────────────────────────────────────────────
// Stone name → lowercased slug (e.g. "Dragoninite" → "dragoninite")
export const ZA_STONE_MAP: Record<string, string> = {
  'dragoninite':   'mega-dragonite',
  'meganiumite':   'mega-meganium',
  'feraligatrite': 'mega-feraligatr',
  'clefablite':    'mega-clefable',
  'victrebelite':  'mega-victreebel',
  'starmite':      'mega-starmie',
  'skarmite':      'mega-skarmory',
  'chimechite':    'mega-chimecho',
  'emboarite':     'mega-emboar',
  'excadrillite':  'mega-excadrill',
  'scraftite':     'mega-scrafty',
  'chandelurite':  'mega-chandelure',
  'eelektrossite': 'mega-eelektross',
  'scolipedite':   'mega-scolipede',
  'golurkite':     'mega-golurk',
  'froslasite':    'mega-froslass',
  'chesnaughtite': 'mega-chesnaught',
  'delphoxite':    'mega-delphox',
  'greninjaite':   'mega-greninja',
  'hawluchite':    'mega-hawlucha',
  'drampite':      'mega-drampa',
  'zygardite':     'mega-zygarde',
  'raichunite-x':  'mega-raichu-x',
  'meowstite':     'mega-meowstic',
  'crabominite':   'mega-crabominable',
  'zeraite':       'mega-zeraora',
  'scovillainite': 'mega-scovillain',
  'glimmorite':    'mega-glimmora',
  'floettelite':   'mega-floette',
}

/** Returns true if the item slug is any kind of mega stone or the generic mega item. */
export function isMegaStone(itemSlug: string): boolean {
  return itemSlug === MEGA_EVOLUCION_SLUG || itemSlug in MEGA_STONE_MAP || itemSlug in ZA_STONE_MAP
}

/** Returns true if the item slug is a Legends: Z-A mega stone. */
export function isZAMegaStone(itemSlug: string): boolean {
  return itemSlug in ZA_STONE_MAP
}

/** Build synthetic PokemonData for a ZA mega. */
function buildZAForm(zaData: typeof MEGA_EVOLUTIONS_ZA[number], base: PokemonData): PokemonData {
  return {
    id:         base.id,
    name:       { en: zaData.nameEN, es: zaData.nameES, ja: zaData.nameJA },
    types:      zaData.types.map(t => t.toLowerCase()),
    baseStats:  zaData.baseStats,
    sprites: {
      normal:      `/assets/sprites/mega-za/${zaData.id}.png`,
      female:      null,
      shiny:       null,
      shinyFemale: null,
    },
    abilities:      [{ name: zaData.ability, hidden: false }],
    isMega:         true,
    megaOf:         zaData.baseFormId,
    megaEvolutions: [],
    competitiveSets: [],
  }
}

/**
 * Returns all mega forms available for a Pokémon.
 * Each entry: { key ('mega'|'mega-x'|'mega-y'), form: PokemonData, isZA }
 */
export function getMegaForms(
  pokemon: PokemonData,
  allPokemon: PokemonData[],
): { key: string; form: PokemonData; isZA: boolean }[] {
  const results: { key: string; form: PokemonData; isZA: boolean }[] = []

  // Classic PokeAPI megas (via megaEvolutions array)
  const megaIds = pokemon.megaEvolutions ?? []
  for (let i = 0; i < megaIds.length; i++) {
    const form = allPokemon.find(p => p.id === megaIds[i])
    if (form) {
      const key = megaIds.length === 1 ? 'mega' : i === 0 ? 'mega-x' : 'mega-y'
      results.push({ key, form, isZA: false })
    }
  }

  // Legends Z-A megas
  const zaForms = MEGA_EVOLUTIONS_ZA.filter(m => m.baseFormId === pokemon.id)
  for (const za of zaForms) {
    results.push({ key: 'mega', form: buildZAForm(za, pokemon), isZA: true })
  }

  return results
}

/**
 * Finds the mega form for a base Pokémon + mega stone item.
 * - Individual stone slugs → exact form
 * - 'megaevolucion' → first available mega form
 * Returns null if not a mega stone or no matching form exists.
 */
export function getMegaForm(
  pokemon: PokemonData,
  itemSlug: string,
  allPokemon: PokemonData[],
): PokemonData | null {
  // 1. Generic mega item → return first available mega
  if (itemSlug === MEGA_EVOLUCION_SLUG) {
    return getMegaForms(pokemon, allPokemon)[0]?.form ?? null
  }

  // 2. Classic PokeAPI mega stone
  const megaName = MEGA_STONE_MAP[itemSlug]
  if (megaName) {
    return (
      allPokemon.find(p => p.isMega && p.megaOf === pokemon.id && p.name.en === megaName) ?? null
    )
  }

  // 3. Legends Z-A mega stone
  const zaId = ZA_STONE_MAP[itemSlug]
  if (!zaId) return null
  const zaData = MEGA_EVOLUTIONS_ZA.find(m => m.id === zaId && m.baseFormId === pokemon.id)
  if (!zaData) return null
  return buildZAForm(zaData, pokemon)
}

/**
 * Returns true if a Pokémon has any mega evolution available (classic or ZA).
 */
export function hasMegaAvailable(pokemon: PokemonData): boolean {
  if ((pokemon.megaEvolutions?.length ?? 0) > 0) return true
  return MEGA_EVOLUTIONS_ZA.some(m => m.baseFormId === pokemon.id)
}

/**
 * Determines the activeForm key from a mega stone slug.
 * Returns 'mega', 'mega-x', or 'mega-y'.
 */
export function megaFormKey(itemSlug: string): string {
  if (itemSlug === 'charizardite-x' || itemSlug === 'mewtwonite-x') return 'mega-x'
  if (itemSlug === 'charizardite-y' || itemSlug === 'mewtwonite-y') return 'mega-y'
  if (itemSlug === 'raichunite-x') return 'mega-x'
  return 'mega'
}

/** All mega stone slugs (individual) — useful for filtering them from the item selector. */
export const ALL_MEGA_STONE_SLUGS = new Set([
  ...Object.keys(MEGA_STONE_MAP),
  ...Object.keys(ZA_STONE_MAP),
])
