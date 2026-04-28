// src/lib/smogon.ts
// Carga sets de Smogon desde smogon_sets.json (bundled).
// Fallback: descarga en runtime de smogon.com y cachea en localStorage.

import type { SPSpread } from './statCalc'
import bundledSets from '../data/smogon_sets.json'
import itemsData   from '../data/items.json'
import movesData   from '../data/moves.json'
import { getAbilityName } from './abilities'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SmogonSet {
  ability:        string   // slug e.g. "rough-skin"
  abilityDisplay: string   // "Rough Skin"
  item:           string   // display name "Choice Scarf"
  itemSlug:       string   // sprite slug "choice-scarf"
  nature:         string   // "Jolly"
  sp:             SPSpread
  moves:          string[] // top 4 display names
  moveUsages:     number[] // 0-1 per move
  itemUsage:      number
  abilityUsage:   number
}

// Formato interno del JSON generado por el script
interface BundledEntry {
  ability:  { name: string; slug: string; usage: number }
  item:     { name: string; slug: string; usage: number } | null
  nature:   { name: string; usage: number }
  spSpread: SPSpread
  moves:    { name: string; usage: number }[]
}

// ── Lookup de items (Smogon slug → API name) ──────────────────────────────────
// Smogon reg-H almacena items como slugs sin guiones ("lifeorb", "choicescarf")
// Los sprites están en /assets/items/{nameApi}.png (ej. "life-orb.png")
type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ITEM_BY_SLUG: Record<string, ItemEntry> = {}
for (const item of itemsData as ItemEntry[]) {
  // "life-orb" → "lifeorb"  AND  "life-orb" → "life-orb"
  const norm = item.nameApi.replace(/-/g, '').toLowerCase()
  ITEM_BY_SLUG[norm] = item
  ITEM_BY_SLUG[item.nameApi] = item
  // También indexar por nombre EN en minúsculas sin espacios
  const normEn = item.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '')
  ITEM_BY_SLUG[normEn] = item
}

function resolveItem(rawName: string): { name: string; slug: string } {
  if (!rawName) return { name: '', slug: '' }
  const norm = rawName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const found = ITEM_BY_SLUG[norm] ?? ITEM_BY_SLUG[rawName]
  if (found) return { name: found.nameEn, slug: found.nameApi }
  // Fallback: usar raw name con toSlug
  return { name: rawName, slug: rawName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }
}

// ── Lookup de moves (Smogon slug → display name EN) ──────────────────────────
type MoveEntry = { nameApi: string; nameEn: string; nameEs: string; nameJa: string }
const MOVE_BY_SLUG: Record<string, string> = {}  // normalized slug → nameEn
for (const m of movesData as MoveEntry[]) {
  const normApi = m.nameApi.replace(/-/g, '').toLowerCase()
  MOVE_BY_SLUG[normApi]                = m.nameEn
  MOVE_BY_SLUG[m.nameApi]              = m.nameEn
  if (m.nameEn) MOVE_BY_SLUG[m.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '')] = m.nameEn
}

function resolveMove(raw: string): string {
  if (!raw) return ''
  const norm = raw.toLowerCase().replace(/[^a-z0-9]/g, '')
  return MOVE_BY_SLUG[norm] ?? MOVE_BY_SLUG[raw] ?? raw
}

// ── Lookup de abilities (Smogon slug "roughskin" → "rough-skin") ─────────────
function resolveAbilitySlug(raw: string): string {
  if (!raw) return ''
  // Smogon stores "roughskin", our data uses "rough-skin"
  // We can't reliably convert without a full DB, but we can try:
  // 1. Direct match
  // 2. Add hyphens by detecting word boundaries via common suffixes
  // Simplest: just lowercase, the button match will normalize both sides
  return raw.toLowerCase()
}

// ── Cache in-memory ────────────────────────────────────────────────────────────

// Convertir el JSON bundled a un mapa de SmogonSet
const SETS_MAP: Record<string, SmogonSet> = {}

function initBundledSets() {
  for (const [name, raw] of Object.entries(bundledSets as Record<string, BundledEntry>)) {
    const e = raw
    const item = resolveItem(e.item?.name ?? '')
    const abilitySlug = resolveAbilitySlug(e.ability.slug)
    SETS_MAP[name] = {
      ability:        abilitySlug,
      abilityDisplay: getAbilityName(abilitySlug),
      item:           item.name,
      itemSlug:       item.slug,
      nature:         e.nature.name,
      sp:             e.spSpread,
      moves:          e.moves.map(m => resolveMove(m.name)),
      moveUsages:     e.moves.map(m => m.usage),
      itemUsage:      e.item?.usage   ?? 0,
      abilityUsage:   e.ability.usage,
    }
  }
}

initBundledSets()

// ── Fallback: descarga en runtime ─────────────────────────────────────────────

const FORMAT    = 'gen9vgc2025regh'
const MONTHS    = ['2026-03','2026-02','2026-01','2025-12','2025-11','2025-10']
const CACHE_KEY = 'sd_smogon_cache_v2'
const CACHE_TTL = 24 * 60 * 60 * 1000

interface SmogonRaw {
  data: Record<string, {
    'Raw count': number
    Abilities: Record<string, number>
    Items:     Record<string, number>
    Spreads:   Record<string, number>
    Moves:     Record<string, number>
  }>
}

let _runtimeData: SmogonRaw | null = null
let _runtimePromise: Promise<SmogonRaw | null> | null = null

function toSlug(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
function topEntry(rec: Record<string, number>) {
  const entries = Object.entries(rec).filter(([k]) => k !== 'nothing' && k !== '' && k !== 'No Item')
  if (!entries.length) return null
  return entries.sort((a, b) => b[1] - a[1])[0] as [string, number]
}
function topN(rec: Record<string, number>, n: number) {
  return Object.entries(rec)
    .filter(([k]) => k !== 'nothing' && k !== '' && k !== 'No Item')
    .sort((a, b) => b[1] - a[1])
    .slice(0, n) as [string, number][]
}
function parseSpread(s: string): { nature: string; sp: SPSpread } | null {
  const [nature, evPart] = s.split(':')
  if (!evPart) return null
  const [hp, atk, def, spAtk, spDef, spe] = evPart.split('/').map(Number)
  if ([hp,atk,def,spAtk,spDef,spe].some(isNaN)) return null
  return { nature, sp: {
    hp:    Math.min(32, Math.round(hp    / 8)),
    atk:   Math.min(32, Math.round(atk   / 8)),
    def:   Math.min(32, Math.round(def   / 8)),
    spAtk: Math.min(32, Math.round(spAtk / 8)),
    spDef: Math.min(32, Math.round(spDef / 8)),
    spe:   Math.min(32, Math.round(spe   / 8)),
  }}
}

function extractSetFromRaw(raw: SmogonRaw, smogonName: string): SmogonSet | null {
  const entry = raw.data[smogonName]
  if (!entry) return null
  const rawCount = entry['Raw count'] || 1
  const topAbility = topEntry(entry.Abilities)
  const topItem    = topEntry(entry.Items)
  if (!topAbility) return null
  const topSpread    = topEntry(entry.Spreads)
  const parsedSpread = topSpread ? parseSpread(topSpread[0]) : null
  const moves = topN(entry.Moves, 5).filter(([m]) => m !== 'nothing').slice(0, 4)
  return {
    ability:        toSlug(topAbility[0]),
    abilityDisplay: getAbilityName(toSlug(topAbility[0])),
    item:           topItem?.[0]  ?? '',
    itemSlug:       topItem ? toSlug(topItem[0]) : '',
    nature:         parsedSpread?.nature ?? 'Hardy',
    sp:             parsedSpread?.sp ?? { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 },
    moves:          moves.map(([m]) => m),
    moveUsages:     moves.map(([,c]) => c / rawCount),
    itemUsage:      topItem ? topItem[1] / rawCount : 0,
    abilityUsage:   topAbility[1] / rawCount,
  }
}

async function fetchSmogonRaw(): Promise<SmogonRaw | null> {
  const formats = [FORMAT, 'gen9vgc2025regg']
  for (const month of MONTHS) {
    for (const fmt of formats) {
      try {
        const res = await fetch(`https://www.smogon.com/stats/${month}/chaos/${fmt}-0.json`)
        if (res.ok) return await res.json() as SmogonRaw
      } catch { /* siguiente */ }
    }
  }
  return null
}

/** Carga datos Smogon en runtime (para sets NO en el bundled JSON). */
export async function loadSmogon(): Promise<SmogonRaw | null> {
  if (Object.keys(SETS_MAP).length > 0) return null // bundled listo, no necesario
  if (_runtimeData) return _runtimeData
  if (_runtimePromise) return _runtimePromise

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { ts, data } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL) { _runtimeData = data; return _runtimeData }
    }
  } catch { /* ignorar */ }

  _runtimePromise = fetchSmogonRaw().then(data => {
    _runtimeData = data
    if (data) {
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch { /* ignorar */ }
    }
    return data
  })
  return _runtimePromise
}

// ── API pública ────────────────────────────────────────────────────────────────

/**
 * Devuelve true si los sets bundled están disponibles (evita hacer fetch).
 * Usarlo en BattleContext para el indicador "Smogon ✓".
 */
export function isSmogonBundled(): boolean {
  return Object.keys(SETS_MAP).length > 0
}

/** Extrae el set más usado para un Pokémon (busca en bundled, luego en runtime). */
export function getSmogonSet(data: SmogonRaw | null, smogonName: string): SmogonSet | null {
  // 1. Bundled JSON (preferido)
  if (SETS_MAP[smogonName]) return SETS_MAP[smogonName]
  // 2. Runtime
  if (data) return extractSetFromRaw(data, smogonName)
  return null
}

/** Convierte un Pokémon a su nombre en Smogon. */
export function toSmogonName(nameEn: string, id: number, isMega?: boolean): string {
  if (isMega) {
    const base = nameEn.replace(/^Mega\s+/i, '').trim().split(/\s+/)
    return base.length === 1 ? `${base[0]}-Mega` : `${base[0]}-Mega-${base.slice(1).join('-')}`
  }
  const ID_MAP: Record<number, string> = {
    10008:'Rotom-Heat',  10009:'Rotom-Wash',   10010:'Rotom-Frost',
    10011:'Rotom-Fan',   10012:'Rotom-Mow',
    10100:'Raichu-Alola',   10104:'Ninetales-Alola',
    10165:'Slowbro-Galar',  10172:'Slowking-Galar',   10180:'Stunfisk-Galar',
    10126:'Lycanroc-Midnight', 10152:'Lycanroc-Dusk',
    10230:'Arcanine-Hisui',  10233:'Typhlosion-Hisui', 10236:'Samurott-Hisui',
    10239:'Zoroark-Hisui',   10242:'Goodra-Hisui',
    10243:'Avalugg-Hisui',   10244:'Decidueye-Hisui',
  }
  return ID_MAP[id] ?? nameEn
}
