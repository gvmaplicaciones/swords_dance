// src/lib/damageCalc.ts
// Calculadora de daño para Pokémon Champions (nivel 50)
// Usa @smogon/calc para el orden correcto de roll (primero) + modificadores

import type { EffectiveStats } from './statCalc'
import type { Weather, Terrain } from './battleState'
import { calculate, Generations, Pokemon as SmogonPokemon, Move as SmogonMove } from '@smogon/calc'
import type { TypeName } from '@smogon/calc/dist/data/interface'

const gen9 = Generations.get(9)

// ── Tabla de efectividad de tipos ─────────────────────────────────────────────
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, water: 2, flying: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0 },
  poison:   { grass: 2, fairy: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { fire: 2, electric: 2, poison: 2, rock: 2, steel: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying:   { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost:    { psychic: 2, ghost: 2, normal: 0, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { psychic: 2, ghost: 2, fighting: 0.5, dark: 0.5, fairy: 0.5 },
  steel:    { ice: 2, rock: 2, fairy: 2, fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5 },
  fairy:    { fighting: 2, dragon: 2, dark: 2, fire: 0.5, poison: 0.5, steel: 0.5 },
}

export function getTypeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let mult = 1
  const chart = TYPE_CHART[moveType] ?? {}
  for (const defType of defenderTypes) {
    mult *= chart[defType] ?? 1
  }
  return mult
}

export function isSTAB(moveType: string, attackerTypes: string[]): boolean {
  return attackerTypes.includes(moveType)
}

// ── Listas de moves para habilidades de potencia ───────────────────────────────

const SOUND_MOVES = new Set([
  'boomburst', 'bug-buzz', 'chatter', 'clangorous-soul', 'clanging-scales',
  'confide', 'disarming-voice', 'echoed-voice', 'eerie-spell', 'entrainment',
  'growl', 'heal-bell', 'hyper-voice', 'metal-sound', 'noble-roar',
  'overdrive', 'parting-shot', 'perish-song', 'relic-song',
  'roar', 'round', 'screech', 'sing', 'snarl', 'snore', 'sparkling-aria',
  'supersonic', 'torch-song', 'uproar',
])

const PUNCH_MOVES = new Set([
  'focus-punch', 'ice-punch', 'fire-punch', 'thunder-punch', 'mach-punch',
  'bullet-punch', 'shadow-punch', 'drain-punch', 'hammer-arm', 'sky-uppercut',
  'comet-punch', 'mega-punch', 'dizzy-punch', 'dynamic-punch', 'meteor-mash',
  'power-up-punch',
])

const RECOIL_MOVES = new Set([
  'brave-bird', 'double-edge', 'flare-blitz', 'head-charge', 'head-smash',
  'high-jump-kick', 'jump-kick', 'light-of-ruin', 'submission', 'take-down',
  'volt-tackle', 'wood-hammer', 'wild-charge', 'wave-crash',
])

const BITE_MOVES = new Set([
  'bite', 'crunch', 'fire-fang', 'ice-fang', 'thunder-fang', 'poison-fang',
  'psychic-fangs', 'hyper-fang', 'bug-bite', 'fishious-rend', 'jaw-lock',
])

const PULSE_MOVES = new Set([
  'aura-sphere', 'dark-pulse', 'dragon-pulse', 'heal-pulse', 'origin-pulse',
  'water-pulse', 'zap-cannon', 'terrain-pulse',
])

// ── Interfaz de entrada ────────────────────────────────────────────────────────

export interface DamageCalcInput {
  attackerStats:   EffectiveStats
  defenderStats:   EffectiveStats
  attackerTypes:   string[]
  defenderTypes:   string[]
  movePower:       number
  moveType:        string
  moveCategory:    'physical' | 'special'
  weather:         Weather
  terrain:         Terrain
  isCritical?:     boolean
  // Habilidades
  attackerAbility?: string
  defenderAbility?: string
  // Nombre API del move (slug)
  moveName?: string
  // Flags del move
  moveIsContact?:           boolean
  moveHasSecondaryEffect?:  boolean
  // Estado del atacante/defensor
  attackerStatus?: string
  defenderStatus?: string
  // Si el defensor está al máximo de PS
  defenderIsFullHP?: boolean
  // Campo de batalla
  isDoubles?: boolean
  // Condiciones del lado del atacante
  attackerSideHelpingHand?:  boolean
  attackerSideBattery?:      boolean
  attackerSidePowerSpot?:    boolean
  attackerSideSteelySpirit?: boolean
  // Condiciones del lado del defensor
  defenderSideReflect?:      boolean
  defenderSideLightScreen?:  boolean
  defenderSideAuroraVeil?:   boolean
  defenderSideFriendGuard?:  boolean
}

export interface DamageResult {
  min: number
  max: number
  minPercent: number
  maxPercent: number
  effectiveness: number
  isKO: boolean
  desc: string
  notes: string[]
}

// ── Utilidad: normalizar nombre de habilidad ───────────────────────────────────
function normAb(ab: string | undefined): string {
  if (!ab) return ''
  return ab.toLowerCase().replace(/[\s\-_]/g, '')
}

function hasStatus(status: string | undefined): boolean {
  return !!status && status !== 'none'
}

// ── PARTE 1: Habilidades que transforman el tipo del move ──────────────────────

interface TypeTransformResult {
  type:      string
  powerMult: number
  note:      string | null
}

function applyTypeTransform(
  moveType: string,
  moveName: string,
  attackerAbility?: string,
): TypeTransformResult {
  const ab = normAb(attackerAbility)
  if (!ab) return { type: moveType, powerMult: 1, note: null }

  if (ab === 'liquidvoice' && moveType === 'normal' && SOUND_MOVES.has(moveName)) {
    return { type: 'water', powerMult: 1, note: 'Voz Fluida: move de sonido → tipo Agua' }
  }
  if (ab === 'normalize') {
    return { type: 'normal', powerMult: 1.2, note: moveType !== 'normal' ? 'Normalizar: move → tipo Normal ×1.2' : null }
  }
  if (ab === 'refrigerate' && moveType === 'normal') {
    return { type: 'ice', powerMult: 1.2, note: 'Velo Gélido: move Normal → tipo Hielo ×1.2' }
  }
  if (ab === 'pixilate' && moveType === 'normal') {
    return { type: 'fairy', powerMult: 1.2, note: 'Pixiládo: move Normal → tipo Hada ×1.2' }
  }
  if (ab === 'aerilate' && moveType === 'normal') {
    return { type: 'flying', powerMult: 1.2, note: 'Aerodinámica: move Normal → tipo Volador ×1.2' }
  }
  if (ab === 'galvanize' && moveType === 'normal') {
    return { type: 'electric', powerMult: 1.2, note: 'Galvanizar: move Normal → tipo Eléctrico ×1.2' }
  }
  if (ab === 'dragonize' && moveType === 'normal') {
    return { type: 'dragon', powerMult: 1.2, note: 'Dragonizar: move Normal → tipo Dragón ×1.2' }
  }
  return { type: moveType, powerMult: 1, note: null }
}

// ── PARTE 2: Multiplicadores de potencia por habilidad ─────────────────────────

interface PowerMultResult {
  mult:  number
  notes: string[]
}

function getPowerAbilityMult(
  moveName:               string,
  moveIsContact:          boolean | undefined,
  moveHasSecondaryEffect: boolean | undefined,
  attackerAbility:        string | undefined,
): PowerMultResult {
  const ab    = normAb(attackerAbility)
  let mult    = 1
  const notes: string[] = []

  if (ab === 'ironfist' && PUNCH_MOVES.has(moveName)) {
    mult *= 1.2
    notes.push('Puño Férreo: move de puño → ×1.2')
  }
  if (ab === 'reckless' && RECOIL_MOVES.has(moveName)) {
    mult *= 1.2
    notes.push('Temeridad: move con retroceso → ×1.2')
  }
  if (ab === 'toughclaws' && moveIsContact) {
    mult *= 1.3
    notes.push('Garras Duras: move de contacto → ×1.3')
  }
  if (ab === 'strongjaw' && BITE_MOVES.has(moveName)) {
    mult *= 1.5
    notes.push('Mandíbula Fuerte: move de mordisco → ×1.5')
  }
  if (ab === 'megalauncher' && PULSE_MOVES.has(moveName)) {
    mult *= 1.5
    notes.push('Megadisparador: move de pulso/aura → ×1.5')
  }
  if (ab === 'sheerforce' && moveHasSecondaryEffect) {
    mult *= 1.3
    notes.push('Fuerza Bruta: move con efecto secundario → ×1.3')
  }

  return { mult, notes }
}

// ── PARTE 3: STAB — Protean / Libero / Adaptability ───────────────────────────

function getStabMult(
  moveType: string,
  attackerTypes: string[],
  attackerAbility?: string,
): { mult: number; note: string | null } {
  const ab = normAb(attackerAbility)

  if (ab === 'protean' || ab === 'libero') {
    return { mult: 1.5, note: 'Proteico: STAB en todos los moves' }
  }

  const hasStab = attackerTypes.map(t => t.toLowerCase()).includes(moveType.toLowerCase())
  if (!hasStab) return { mult: 1, note: null }

  if (ab === 'adaptability') {
    return { mult: 2.0, note: 'Adaptación: STAB → ×2.0' }
  }

  return { mult: 1.5, note: null }
}

// ── PARTE 4: Modificadores de stats por habilidad ─────────────────────────────

function getAttackerAtkMod(
  atk: number,
  category: 'physical' | 'special',
  attackerAbility?: string,
  attackerStatus?: string,
): { atk: number; note: string | null } {
  if (category !== 'physical') return { atk, note: null }
  const ab = normAb(attackerAbility)

  if (ab === 'hugepower' || ab === 'purepower') {
    return { atk: atk * 2, note: 'Gran Poder: ATK ×2' }
  }
  if (ab === 'guts' && hasStatus(attackerStatus)) {
    return { atk: atk * 1.5, note: 'Agallas: estado → ATK ×1.5 (quemadura no penaliza ATK)' }
  }
  if (ab === 'hustle') {
    return { atk: atk * 1.5, note: 'Brío: ATK ×1.5 (precisión moves físicos ×0.8)' }
  }

  return { atk, note: null }
}

function getDefenderDefMod(
  def: number,
  category: 'physical' | 'special',
  defenderAbility?: string,
  defenderStatus?: string,
): { def: number; note: string | null } {
  if (category !== 'physical') return { def, note: null }
  const ab = normAb(defenderAbility)

  if (ab === 'furcoat') {
    return { def: def * 2, note: 'Pelo Suave: DEF ×2 vs moves físicos' }
  }
  if (ab === 'marvelscale' && hasStatus(defenderStatus)) {
    return { def: def * 1.5, note: 'Escama Especial: estado → DEF ×1.5' }
  }

  return { def, note: null }
}

// ── PARTE 5: Multiplicadores de daño por habilidad (defender/attacker) ─────────

interface AbilityDamageResult {
  mult:             number
  notes:            string[]
  wonderGuardBlock: boolean
}

function getAbilityDamageMult(
  moveType: string,
  effectiveness: number,
  moveCategory: 'physical' | 'special',
  _attackerAbility: string | undefined,
  defenderAbility: string | undefined,
  defenderIsFullHP: boolean,
): AbilityDamageResult {
  let mult = 1
  const notes: string[] = []
  const defAb = normAb(defenderAbility)

  if ((moveType === 'fire' || moveType === 'ice') && defAb === 'thickfat') {
    mult *= 0.5
    notes.push('Piel Gruesa: move Fuego/Hielo ×0.5')
  }
  if (effectiveness >= 2 && (defAb === 'filter' || defAb === 'solidrock' || defAb === 'prismarmor')) {
    mult *= 0.75
    notes.push('Filtro: move súper eficaz ×0.75')
  }
  if (defAb === 'wonderguard' && effectiveness < 2) {
    return { mult: 0, notes: ['Maravilla: solo daña moves súper eficaces'], wonderGuardBlock: true }
  }
  if (defAb === 'multiscale' && defenderIsFullHP) {
    mult *= 0.5
    notes.push('Multiscama: daño ×0.5 con PS completos')
  }
  // Intimidate: aviso informativo (el -1 ATK ya está en los stats del atacante)
  if (moveCategory === 'physical' && defAb === 'intimidate') {
    notes.push('Intimidación activa: comprueba que el -1 ATK está aplicado en los boosts')
  }

  return { mult, notes, wonderGuardBlock: false }
}

// ── PARTE 6: Aura Feérica ──────────────────────────────────────────────────────

function getFairyAuraMultiplier(
  moveType: string,
  attackerAbility?: string,
  defenderAbility?: string,
): { mult: number; note: string | null } {
  if (moveType !== 'fairy') return { mult: 1, note: null }
  const hasFairyAura = normAb(attackerAbility) === 'fairyaura' || normAb(defenderAbility) === 'fairyaura'
  if (!hasFairyAura) return { mult: 1, note: null }
  const hasAuraBreak = normAb(attackerAbility) === 'aurabreak' || normAb(defenderAbility) === 'aurabreak'
  return hasAuraBreak
    ? { mult: 3 / 4, note: 'Aura Feérica invertida por Rompeaura: moves Hada ×0.75' }
    : { mult: 4 / 3, note: 'Aura Feérica: moves Hada ×1.33 para ambos' }
}

// ── PARTE 7: Mega Sol ──────────────────────────────────────────────────────────

function getMegaSolMult(
  moveType: string,
  weather: Weather,
  attackerAbility?: string,
): { mult: number; note: string | null } {
  if (normAb(attackerAbility) !== 'megasol') return { mult: 1, note: null }
  if (weather === 'sun') return { mult: 1, note: null }
  if (moveType === 'fire')  return { mult: 1.5, note: 'Mega Sol: move Fuego ×1.5' }
  if (moveType === 'water') return { mult: 0.5, note: 'Mega Sol: move Agua ×0.5' }
  return { mult: 1, note: null }
}

// ── Clima y terreno ────────────────────────────────────────────────────────────

function getWeatherMultiplier(moveType: string, weather: Weather): number {
  if (weather === 'sun')  {
    if (moveType === 'fire')  return 1.5
    if (moveType === 'water') return 0.5
  }
  if (weather === 'rain') {
    if (moveType === 'water') return 1.5
    if (moveType === 'fire')  return 0.5
  }
  return 1
}

function getTerrainMultiplier(moveType: string, terrain: Terrain, attackerTypes: string[]): number {
  const grounded = !attackerTypes.includes('flying')
  if (!grounded) return 1
  if (terrain === 'electric' && moveType === 'electric') return 1.3
  if (terrain === 'grassy'   && moveType === 'grass')    return 1.3
  if (terrain === 'psychic'  && moveType === 'psychic')  return 1.3
  return 1
}

// ── Cálculo principal ──────────────────────────────────────────────────────────

export function calcDamage(input: DamageCalcInput): DamageResult {
  const {
    attackerStats, defenderStats,
    attackerTypes, defenderTypes,
    movePower, moveType, moveCategory,
    weather, terrain, isCritical = false,
    attackerAbility, defenderAbility,
    moveName = '',
    moveIsContact, moveHasSecondaryEffect,
    attackerStatus, defenderStatus,
    defenderIsFullHP = true,
    isDoubles = false,
    attackerSideHelpingHand  = false,
    attackerSideBattery      = false,
    attackerSidePowerSpot    = false,
    attackerSideSteelySpirit = false,
    defenderSideReflect      = false,
    defenderSideLightScreen  = false,
    defenderSideAuroraVeil   = false,
    defenderSideFriendGuard  = false,
  } = input

  const notes: string[] = []

  // ── 1. Transformar tipo del move por habilidad ─────────────────────────────
  const typeTransform     = applyTypeTransform(moveType.toLowerCase(), moveName.toLowerCase(), attackerAbility)
  const effectiveMoveType = typeTransform.type
  if (typeTransform.note) notes.push(typeTransform.note)

  // ── 2. Technician: potencia base ≤60 → ×1.5 ──────────────────────────────
  const techPower = (normAb(attackerAbility) === 'technician' && movePower <= 60)
    ? Math.floor(movePower * 1.5)
    : movePower
  if (techPower !== movePower) notes.push('Technician: potencia base ≤60 → ×1.5')

  // ── 3. Potencia efectiva (tipo transform + habilidades de potencia) ────────
  const typeAdjustedPower = Math.floor(techPower * typeTransform.powerMult)
  const powerAbility      = getPowerAbilityMult(moveName.toLowerCase(), moveIsContact, moveHasSecondaryEffect, attackerAbility)
  notes.push(...powerAbility.notes)
  const effectivePower    = Math.floor(typeAdjustedPower * powerAbility.mult)

  // ── 4. Stats base con modificadores de habilidad ──────────────────────────
  const rawAtk = moveCategory === 'physical' ? attackerStats.atk   : attackerStats.spAtk
  const rawDef = moveCategory === 'physical' ? defenderStats.def   : defenderStats.spDef

  const atkMod = getAttackerAtkMod(rawAtk, moveCategory, attackerAbility, attackerStatus)
  const defMod = getDefenderDefMod(rawDef, moveCategory, defenderAbility, defenderStatus)
  const atk = atkMod.atk
  const def = defMod.def
  if (atkMod.note) notes.push(atkMod.note)
  if (defMod.note) notes.push(defMod.note)

  // ── 5. Modificadores de daño ──────────────────────────────────────────────
  const stabResult = getStabMult(effectiveMoveType, attackerTypes, attackerAbility)
  const stab       = stabResult.mult
  if (stabResult.note) notes.push(stabResult.note)

  const effective   = getTypeEffectiveness(effectiveMoveType, defenderTypes.map(t => t.toLowerCase()))
  const fairyAura   = getFairyAuraMultiplier(effectiveMoveType, attackerAbility, defenderAbility)
  if (fairyAura.note) notes.push(fairyAura.note)

  const critMult    = isCritical ? 1.5 : 1
  const weatherMult = getWeatherMultiplier(effectiveMoveType, weather)
  const terrainMult = getTerrainMultiplier(effectiveMoveType, terrain, attackerTypes.map(t => t.toLowerCase()))
  const megaSol     = getMegaSolMult(effectiveMoveType, weather, attackerAbility)
  if (megaSol.note) notes.push(megaSol.note)

  const abilityDmg  = getAbilityDamageMult(effectiveMoveType, effective, moveCategory, attackerAbility, defenderAbility, defenderIsFullHP)
  notes.push(...abilityDmg.notes)

  // ── 6. @smogon/calc: fórmula base + roll correcto (roll primero) ──────────
  // Convertimos nuestros stats efectivos (ya con boosts/estado/habilidades) en
  // "fake base stats" que producen el mismo valor al pasar por la fórmula de
  // smogon (nivel 50, Serious, 0 EVs, 31 IVs):
  //   no-HP: stat = base + 20  →  base = stat - 20
  //   HP:    stat = base + 75  →  base = stat - 75
  // Esto funciona correctamente en clone() porque smogon recalcula desde baseStats.
  // Tipo dummy 'Fighting' → move Normal → STAB=1 y tipo=1 (no interfiere).
  function toFakeBase(s: number, isHP: boolean) { return Math.max(1, s - (isHP ? 75 : 20)) }

  const atkBase = {
    hp:  toFakeBase(attackerStats.hp,   true),
    atk: toFakeBase(moveCategory === 'physical' ? atk : attackerStats.atk, false),
    def: toFakeBase(attackerStats.def,  false),
    spa: toFakeBase(moveCategory === 'special'  ? atk : attackerStats.spAtk, false),
    spd: toFakeBase(attackerStats.spDef, false),
    spe: toFakeBase(attackerStats.spe,   false),
  }
  const defBase = {
    hp:  toFakeBase(defenderStats.hp,   true),
    atk: toFakeBase(defenderStats.atk,  false),
    def: toFakeBase(moveCategory === 'physical' ? def : defenderStats.def, false),
    spa: toFakeBase(defenderStats.spAtk, false),
    spd: toFakeBase(moveCategory === 'special'  ? def : defenderStats.spDef, false),
    spe: toFakeBase(defenderStats.spe,   false),
  }

  const smAtt = new SmogonPokemon(gen9, 'Ditto', {
    level: 50, nature: 'Serious',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0,  atk: 0,  def: 0,  spa: 0,  spd: 0,  spe: 0  },
    overrides: { baseStats: atkBase, types: ['Fighting'] as [TypeName] },
  })
  const smDef = new SmogonPokemon(gen9, 'Ditto', {
    level: 50, nature: 'Serious',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0,  atk: 0,  def: 0,  spa: 0,  spd: 0,  spe: 0  },
    overrides: { baseStats: defBase, types: ['Fighting'] as [TypeName] },
  })

  const smMove = new SmogonMove(gen9, 'Tackle', {
    overrides: {
      basePower: effectivePower,
      type:      'Normal' as TypeName,
      category:  moveCategory === 'physical' ? 'Physical' : 'Special',
    },
  })

  const smResult  = calculate(gen9, smAtt, smDef, smMove)
  const rawDamage = smResult.damage
  const smRolls: number[] = Array.isArray(rawDamage) && typeof rawDamage[0] === 'number'
    ? rawDamage as number[]
    : [typeof rawDamage === 'number' ? rawDamage : 1]

  // ── 7. Rango de daño: aplicar STAB, tipo, clima, terreno y habilidades ────
  // Notas de campo de batalla
  if (attackerSideHelpingHand && isDoubles)
    notes.push('Refuerzo: daño ×1.5')
  if (attackerSideBattery && isDoubles && moveCategory === 'special')
    notes.push('Batería: SpA ×1.3')
  if (attackerSidePowerSpot && isDoubles)
    notes.push('Fuente Energía: daño ×1.3')
  if (attackerSideSteelySpirit && isDoubles && effectiveMoveType === 'steel')
    notes.push('Alma Acerada: move Acero ×1.5')
  if (defenderSideReflect && moveCategory === 'physical')
    notes.push(`Reflejo: daño físico ×${isDoubles ? '0.67' : '0.5'}`)
  if (defenderSideLightScreen && moveCategory === 'special')
    notes.push(`Pantalla Luz: daño especial ×${isDoubles ? '0.67' : '0.5'}`)
  if (defenderSideAuroraVeil)
    notes.push(`Velo Aurora: daño ×${isDoubles ? '0.67' : '0.5'}`)
  if (defenderSideFriendGuard && isDoubles)
    notes.push('Vastaguardia: daño ×0.75')

  const results: number[] = abilityDmg.wonderGuardBlock
    ? Array(16).fill(0)
    : smRolls.map(d => {
        if (d === 0) return 0
        let dmg = d
        dmg = Math.floor(dmg * stab)
        dmg = Math.floor(dmg * effective)
        dmg = Math.floor(dmg * fairyAura.mult)
        dmg = Math.floor(dmg * critMult)
        dmg = Math.floor(dmg * weatherMult)
        dmg = Math.floor(dmg * terrainMult)
        dmg = Math.floor(dmg * megaSol.mult)
        dmg = Math.floor(dmg * abilityDmg.mult)
        // Field conditions (applied after STAB/type per Gen VI order)
        if (attackerSideHelpingHand && isDoubles)
          dmg = Math.floor(dmg * 1.5)
        if (attackerSideBattery && isDoubles && moveCategory === 'special')
          dmg = Math.floor(dmg * 1.3)
        if (attackerSidePowerSpot && isDoubles)
          dmg = Math.floor(dmg * 1.3)
        if (attackerSideSteelySpirit && isDoubles && effectiveMoveType === 'steel')
          dmg = Math.floor(dmg * 1.5)
        if (defenderSideReflect && moveCategory === 'physical')
          dmg = Math.floor(dmg * (isDoubles ? 2 / 3 : 0.5))
        if (defenderSideLightScreen && moveCategory === 'special')
          dmg = Math.floor(dmg * (isDoubles ? 2 / 3 : 0.5))
        if (defenderSideAuroraVeil)
          dmg = Math.floor(dmg * (isDoubles ? 2 / 3 : 0.5))
        if (defenderSideFriendGuard && isDoubles)
          dmg = Math.floor(dmg * 0.75)
        return Math.max(1, dmg)
      })

  const minDmg = results[0]
  const maxDmg = results[results.length - 1]
  const hp     = defenderStats.hp

  return {
    min:           minDmg,
    max:           maxDmg,
    minPercent:    Math.round((minDmg / hp) * 1000) / 10,
    maxPercent:    Math.round((maxDmg / hp) * 1000) / 10,
    effectiveness: effective,
    isKO:          minDmg >= hp,
    desc:          formatResult(minDmg, maxDmg, hp, effective),
    notes,
  }
}

function formatResult(min: number, max: number, hp: number, eff: number): string {
  const minPct = Math.round((min / hp) * 1000) / 10
  const maxPct = Math.round((max / hp) * 1000) / 10
  const effStr = eff === 0 ? ' (no afecta)' : eff > 1 ? ' (súper eficaz)' : eff < 1 ? ' (poco eficaz)' : ''
  if (min >= hp) return `¡KO seguro! ${minPct}–${maxPct}%${effStr}`
  if (max >= hp) return `Posible KO (${minPct}–${maxPct}%)${effStr}`
  return `${minPct}–${maxPct}%${effStr}`
}
