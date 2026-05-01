// src/screens/VSScreen.tsx

import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle } from '../store/BattleContext'
import type { PokemonBattleState, StatusCondition, Weather, Terrain } from '../lib/battleState'
import { createDefaultBattleState, clampBoost } from '../lib/battleState'
import { calcEffectiveStats, calcMaxEffectiveStats, type EffectiveStats, type SPSpread } from '../lib/statCalc'
import { calcDamage } from '../lib/damageCalc'
import { getMoveData, searchMoves } from '../lib/moveDb'
import { getMegaForm, getMegaForms, isMegaStone, isZAMegaStone, megaFormKey, MEGA_EVOLUCION_SLUG } from '../lib/megaStones'
import { getStatMods, applyMod } from '../lib/statModifiers'
import { analytics } from '../lib/analytics'
import TypeBadge from '../components/TypeBadge'
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect'
import PixelNav from '../components/PixelNav'
import pokemonDataRaw from '../data/pokemon.json'
import itemsDataRaw   from '../data/items.json'
import type { PokemonData } from '../types/pokemon'

const ALL_POKEMON_DATA = pokemonDataRaw as PokemonData[]

type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ITEM_BY_SLUG: Record<string, ItemEntry> = {}
for (const it of itemsDataRaw as ItemEntry[]) {
  ITEM_BY_SLUG[it.nameApi] = it
}
function itemDisplayName(slug: string | undefined, name: string, lang: string): string {
  if (!slug) return name
  const entry = ITEM_BY_SLUG[slug]
  if (!entry) return name
  return lang === 'es' ? entry.nameEs : entry.nameEn
}
const MAX_STATS_KEY = 'sd_max_stats_mode'

const TYPE_COLORS: Record<string, string> = {
  normal:'#a8a878',fire:'#f08030',water:'#6890f0',electric:'#f8d030',
  grass:'#78c850',ice:'#98d8d8',fighting:'#c03028',poison:'#a040a0',
  ground:'#e0c068',flying:'#a890f0',psychic:'#f85888',bug:'#a8b820',
  rock:'#b8a038',ghost:'#705898',dragon:'#7038f8',dark:'#705848',
  steel:'#b8b8d0',fairy:'#ee99ac',
}

const DEFAULT_SP = { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 }

const STATUS_OPTS: { key: StatusCondition; icon: string }[] = [
  { key: 'none',         icon: '—'  },
  { key: 'burn',         icon: '🔥' },
  { key: 'paralysis',    icon: '⚡' },
  { key: 'poison',       icon: '☠'  },
  { key: 'badly-poison', icon: '☣'  },
  { key: 'sleep',        icon: '😴' },
  { key: 'freeze',       icon: '❄'  },
]

type FieldWeather = 'none' | 'sun' | 'rain' | 'sand' | 'snow'
type FieldTerrain = 'none' | 'electric' | 'grassy' | 'misty' | 'psychic'
type GameMode     = 'singles' | 'doubles'

interface FieldSide {
  isReflect:      boolean
  isLightScreen:  boolean
  isAuroraVeil:   boolean
  isTailwind:     boolean
  isHelpingHand:  boolean
  isFriendGuard:  boolean
  isSteelySpirit: boolean
  isBattery:      boolean
  isPowerSpot:    boolean
}

interface FieldState {
  isOpen:   boolean
  gameMode: GameMode
  weather:  FieldWeather
  terrain:  FieldTerrain
  mySide:   FieldSide
  rivalSide: FieldSide
}

const DEFAULT_SIDE: FieldSide = {
  isReflect: false, isLightScreen: false, isAuroraVeil: false, isTailwind: false,
  isHelpingHand: false, isFriendGuard: false, isSteelySpirit: false, isBattery: false, isPowerSpot: false,
}

const DEFAULT_FIELD: FieldState = {
  isOpen: false, gameMode: 'singles', weather: 'none', terrain: 'none',
  mySide: { ...DEFAULT_SIDE }, rivalSide: { ...DEFAULT_SIDE },
}

const FIELD_WEATHER_KEYS: FieldWeather[] = ['none', 'sun', 'rain', 'sand', 'snow']
const FIELD_TERRAIN_KEYS: FieldTerrain[] = ['none', 'electric', 'grassy', 'misty', 'psychic']

function fieldModified(f: FieldState): boolean {
  return f.gameMode !== 'singles' || f.weather !== 'none' || f.terrain !== 'none' ||
    Object.values(f.mySide).some(Boolean) || Object.values(f.rivalSide).some(Boolean)
}

// ── FieldPanel ─────────────────────────────────────────────────────────────────

function FieldPanel({ state, onChange }: { state: FieldState; onChange: (s: FieldState) => void }) {
  const { t } = useTranslation()
  const modified   = fieldModified(state)
  const isDoubles  = state.gameMode === 'doubles'
  const canAVeil   = state.weather === 'snow'

  function setWeather(w: FieldWeather) {
    const noVeil = w !== 'snow'
    onChange({
      ...state, weather: w,
      mySide:    noVeil ? { ...state.mySide,    isAuroraVeil: false } : state.mySide,
      rivalSide: noVeil ? { ...state.rivalSide, isAuroraVeil: false } : state.rivalSide,
    })
  }

  const idle: React.CSSProperties    = { border: '1px solid #242424', color: '#cccccc', background: '#181818' }
  const btnCls = "px-2.5 py-2 rounded font-sans text-[8px] uppercase min-h-[40px] transition-colors disabled:opacity-30"

  function Opt({ label, active, color, bg, disabled, onClick }: {
    label: string; active: boolean; color: string; bg: string; disabled?: boolean; onClick: () => void
  }) {
    return (
      <button onClick={onClick} disabled={disabled} className={btnCls}
        style={active ? { border: `2px solid ${color}`, color, background: bg } : idle}>
        {label}
      </button>
    )
  }

  function MySide({ k, labelKey }: { k: keyof FieldSide; labelKey: string }) {
    return <Opt label={t(`vs.${labelKey}`)} active={state.mySide[k]}
      disabled={k === 'isAuroraVeil' && !canAVeil}
      color="#4fc3f7" bg="#04101e"
      onClick={() => onChange({ ...state, mySide: { ...state.mySide, [k]: !state.mySide[k] } })} />
  }

  function RivalSide({ k, labelKey }: { k: keyof FieldSide; labelKey: string }) {
    return <Opt label={t(`vs.${labelKey}`)} active={state.rivalSide[k]}
      disabled={k === 'isAuroraVeil' && !canAVeil}
      color="#ff2244" bg="#1a0606"
      onClick={() => onChange({ ...state, rivalSide: { ...state.rivalSide, [k]: !state.rivalSide[k] } })} />
  }

  if (!state.isOpen) {
    return (
      <button onClick={() => onChange({ ...state, isOpen: true })}
        className="w-full py-3 rounded font-sans text-[8px] uppercase"
        style={{
          border: `1px solid ${modified ? 'rgba(255,136,0,0.7)' : '#242424'}`,
          color: modified ? '#ff8844' : '#666666', background: '#181818',
        }}>
        ⚙ {modified ? t('vs.fieldActive') : t('vs.field')}
      </button>
    )
  }

  return (
    <div className="rounded space-y-3" style={{ border: '1px solid #303030', background: '#141414', padding: '12px' }}>
      <div className="flex items-center justify-between">
        <span className="font-sans text-[8px] uppercase" style={{ color: modified ? '#ff8844' : '#666666' }}>
          ⚙ {modified ? t('vs.fieldActive') : t('vs.field')}
        </span>
        <button onClick={() => onChange({ ...state, isOpen: false })}
          className="font-mono text-text-muted text-sm px-2 py-1">×</button>
      </div>

      <div>
        <p className="font-sans text-[8px] uppercase text-text-muted mb-1.5">{t('vs.mode')}</p>
        <div className="flex gap-2">
          {(['singles', 'doubles'] as GameMode[]).map(m => (
            <button key={m} onClick={() => onChange({ ...state, gameMode: m })} className={btnCls}
              style={state.gameMode === m ? { border: '2px solid #888888', color: '#cccccc', background: '#2a2a2a' } : idle}>
              {m === 'singles' ? t('vs.singles') : t('vs.doubles')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-sans text-[8px] uppercase text-text-muted mb-1.5">{t('vs.weather')}</p>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_WEATHER_KEYS.map(key => (
            <button key={key} onClick={() => setWeather(key)} className={btnCls}
              style={state.weather === key ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' } : idle}>
              {t(`weather.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-sans text-[8px] uppercase text-text-muted mb-1.5">{t('vs.terrain')}</p>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_TERRAIN_KEYS.map(key => (
            <button key={key} onClick={() => onChange({ ...state, terrain: key })} className={btnCls}
              style={state.terrain === key ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' } : idle}>
              {t(`terrain.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-sans text-[8px] uppercase mb-1.5" style={{ color: '#4fc3f7' }}>{t('vs.mySide')}</p>
        <div className="flex flex-wrap gap-1.5">
          <MySide k="isReflect"     labelKey="reflect"     />
          <MySide k="isLightScreen" labelKey="lightScreen" />
          <MySide k="isAuroraVeil"  labelKey="auroraVeil"  />
          <MySide k="isTailwind"    labelKey="tailwind"    />
          {isDoubles && <>
            <MySide k="isHelpingHand"  labelKey="helpingHand"  />
            <MySide k="isSteelySpirit" labelKey="steelySpirit" />
            <MySide k="isBattery"      labelKey="battery"      />
            <MySide k="isPowerSpot"    labelKey="powerSpot"    />
          </>}
        </div>
      </div>

      <div>
        <p className="font-sans text-[8px] uppercase mb-1.5" style={{ color: '#ff2244' }}>{t('vs.rivalSide')}</p>
        <div className="flex flex-wrap gap-1.5">
          <RivalSide k="isReflect"     labelKey="reflect"     />
          <RivalSide k="isLightScreen" labelKey="lightScreen" />
          <RivalSide k="isAuroraVeil"  labelKey="auroraVeil"  />
          <RivalSide k="isTailwind"    labelKey="tailwind"    />
          {isDoubles && <>
            <RivalSide k="isFriendGuard"  labelKey="friendGuard"  />
            <RivalSide k="isSteelySpirit" labelKey="steelySpirit" />
            <RivalSide k="isBattery"      labelKey="battery"      />
            <RivalSide k="isPowerSpot"    labelKey="powerSpot"    />
          </>}
        </div>
      </div>
    </div>
  )
}

const BOOST_KEYS: (keyof PokemonBattleState['boosts'])[] = ['atk','def','spAtk','spDef','spe']
const STAT_KEYS: (keyof EffectiveStats)[] = ['hp','atk','def','spAtk','spDef','spe']

// ── Move icon helpers ─────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="w-5 h-5 rounded shrink-0" style={{ background: TYPE_COLORS[type] ?? '#999' }} />
  return <img src={`/assets/types/${type}.png`} alt={type} width={20} height={20}
    className="object-contain shrink-0" onError={() => setFailed(true)} />
}

function CategoryIcon({ category }: { category: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className="w-5 h-5 font-mono text-[8px] text-text-muted shrink-0 flex items-center justify-center">{category[0].toUpperCase()}</span>
  return <img src={`/assets/categories/${category}.svg`} alt={category} width={20} height={20}
    className="object-contain shrink-0" onError={() => setFailed(true)} />
}

// ── Move selector (SearchableSelect wrapper) ──────────────────────────────────

function MoveSelector({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const options: SelectOption[] = useMemo(() => {
    return searchMoves('', lang, 200).map(m => {
      const name = lang === 'ja' ? (m.nameJa || m.nameEn) : lang === 'en' ? m.nameEn : (m.nameEs || m.nameEn)
      return {
        value:    m.nameEn,
        label:    name,
        sublabel: m.power > 0 ? `${m.power} · ${(m.accuracy ?? 0) > 0 ? m.accuracy + '%' : '—'}` : t('vs.statusMove'),
        icon: (
          <div className="flex items-center gap-1 shrink-0">
            <TypeIcon type={m.type} />
            <CategoryIcon category={m.category} />
          </div>
        ),
      }
    })
  }, [lang, t])

  function handleSearch(q: string): SelectOption[] {
    if (!q.trim()) return []
    return searchMoves(q, lang, 30).map(m => {
      const name = lang === 'ja' ? (m.nameJa || m.nameEn) : lang === 'en' ? m.nameEn : (m.nameEs || m.nameEn)
      return {
        value:    m.nameEn,
        label:    name,
        sublabel: m.power > 0 ? `${m.power} · ${(m.accuracy ?? 0) > 0 ? m.accuracy + '%' : '—'}` : t('vs.statusMove'),
        icon: (
          <div className="flex items-center gap-1 shrink-0">
            <TypeIcon type={m.type} />
            <CategoryIcon category={m.category} />
          </div>
        ),
      }
    })
  }

  function renderTrigger(_opt: SelectOption | null) {
    if (!value) return <span className="font-mono text-text-muted text-sm flex-1 normal-case">{t('vs.otherMove')}</span>
    const m = getMoveData(value)
    if (!m) return <span className="font-mono text-text-primary text-sm flex-1 normal-case">{value}</span>
    const name = lang === 'ja' ? (m.nameJa || m.nameEn) : lang === 'en' ? m.nameEn : (m.nameEs || m.nameEn)
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TypeIcon type={m.type} />
        <CategoryIcon category={m.category} />
        <span className="font-mono text-text-primary text-sm truncate flex-1 normal-case">{name}</span>
        {m.power > 0 && <span className="font-mono text-text-muted text-xs shrink-0">{m.power}</span>}
      </div>
    )
  }

  return (
    <SearchableSelect
      options={options}
      value={value ?? ''}
      onChange={v => onChange(v || null)}
      placeholder={t('vs.searchMove')}
      emptyLabel={t('vs.noMove')}
      onSearch={handleSearch}
      renderTrigger={renderTrigger}
    />
  )
}

// ── Quick move buttons ────────────────────────────────────────────────────────

function QuickMoves({
  moves, selected, onSelect, accentStyle, lang,
}: {
  moves: (string | null)[]
  selected: string | null
  onSelect: (m: string) => void
  accentStyle: React.CSSProperties
  lang: string
}) {
  const filtered = moves.filter(Boolean) as string[]
  if (!filtered.length) return null
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {filtered.map(m => {
        const data = getMoveData(m)
        const isActive = selected === m
        const name = data
          ? (lang === 'ja' ? (data.nameJa || data.nameEn) : lang === 'en' ? data.nameEn : (data.nameEs || data.nameEn))
          : m
        return (
          <button
            key={m}
            onClick={() => onSelect(m)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-mono
                       min-h-[36px] transition-colors normal-case"
            style={isActive
              ? { ...accentStyle, border: '2px solid' }
              : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}
          >
            {data && <TypeIcon type={data.type} />}
            <span className="truncate max-w-[90px]">{name}</span>
            {data?.power && data.power > 0 && (
              <span className="opacity-60 shrink-0">{data.power}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Damage result card ────────────────────────────────────────────────────────

function DamageCard({
  result,
  defenderHp,
  koKey, maybeKey, surviveKey,
}: {
  result: ReturnType<typeof calcDamage> | null
  defenderHp: number
  koKey: string
  maybeKey: string
  surviveKey: string
  isAttack: boolean
}) {
  const { t } = useTranslation()
  if (!result) return null

  const { minPercent, maxPercent, effectiveness, notes } = result
  const isKO     = result.min >= defenderHp
  const isPossKO = !isKO && result.max >= defenderHp

  const verdict = isKO ? t(koKey) : isPossKO ? t(maybeKey) : t(surviveKey)
  const vcolor  = isKO ? 'text-debuff' : isPossKO ? 'text-para' : 'text-text-secondary'

  return (
    <div className={`p-2.5 rounded font-mono text-sm mt-2
      ${isKO ? 'bg-debuff/10' : isPossKO ? 'bg-para/10' : 'bg-bg-elevated'}`}
      style={{ border: `2px solid ${isKO ? '#ff2244' : isPossKO ? '#ffcc00' : '#242424'}` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-text-primary font-bold normal-case">
          {minPercent}%–{maxPercent}%
        </span>
        <span className={`font-sans text-[8px] uppercase shrink-0 ${vcolor}`}>{verdict}</span>
      </div>
      {effectiveness !== 1 && (
        <p className="font-mono text-text-muted text-[9px] mt-0.5 normal-case">
          ×{effectiveness}
          {effectiveness === 0  && ` — ${t('vs.notEffective')}`}
          {effectiveness > 1    && ` — ${t('vs.superEffective')}`}
          {effectiveness < 1 && effectiveness > 0 && ` — ${t('vs.notVeryEffective')}`}
        </p>
      )}
      {notes && notes.length > 0 && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {notes.map((note, i) => (
            <p key={i} className="font-mono text-[9px] text-[#cc88ff] normal-case">
              ✦ {note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── StatePanel ────────────────────────────────────────────────────────────────

function StatePanel({
  title, battleState, effective, moves, moveUsages, onUpdate, onReset, lang,
}: {
  title: string
  battleState: PokemonBattleState
  effective: EffectiveStats | null
  moves?: string[]
  moveUsages?: number[]
  onUpdate: (patch: Partial<PokemonBattleState>) => void
  onReset: () => void
  lang: string
}) {
  const { t } = useTranslation()

  function boost(k: keyof PokemonBattleState['boosts'], delta: number) {
    onUpdate({ boosts: { ...battleState.boosts, [k]: clampBoost(battleState.boosts[k] + delta) } })
  }
  function resetBoost(k: keyof PokemonBattleState['boosts']) {
    onUpdate({ boosts: { ...battleState.boosts, [k]: 0 } })
  }

  return (
    <div className="space-y-4 pb-2">
      {/* Boosts */}
      <div>
        <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('vs.boosts')}</p>
        {BOOST_KEYS.map(k => {
          const val = battleState.boosts[k]
          const eff = effective ? (effective as unknown as Record<string, number>)[k] : null
          return (
            <div key={k} className="flex items-center gap-2 py-1">
              <span className="font-mono w-9 text-xs text-text-secondary shrink-0">{t(`stats.${k}`)}</span>
              <button onClick={() => boost(k, -1)} disabled={val <= -6}
                className="w-11 h-11 rounded bg-bg-elevated font-mono font-bold text-lg
                           flex items-center justify-center active:bg-debuff/20 disabled:opacity-30"
                style={{ border: '1px solid rgba(255,34,68,0.4)', color: '#ff2244' }}>−</button>
              <button onClick={() => resetBoost(k)}
                className="w-11 h-11 rounded bg-bg-elevated font-mono font-bold
                           flex items-center justify-center"
                style={{
                  border: `1px solid ${val > 0 ? 'rgba(0,255,136,0.4)' : val < 0 ? 'rgba(255,34,68,0.4)' : '#242424'}`,
                  color:  val > 0 ? '#00ff88' : val < 0 ? '#ff2244' : '#cccccc',
                }}>
                {val > 0 ? `+${val}` : val}
              </button>
              <button onClick={() => boost(k, +1)} disabled={val >= 6}
                className="w-11 h-11 rounded bg-bg-elevated font-mono font-bold text-lg
                           flex items-center justify-center active:bg-boost/20 disabled:opacity-30"
                style={{ border: '1px solid rgba(0,255,136,0.4)', color: '#00ff88' }}>+</button>
              {eff !== null && (
                <span className={`ml-auto font-mono text-sm font-bold shrink-0
                  ${val > 0 ? 'text-boost' : val < 0 ? 'text-debuff' : 'text-text-secondary'}`}>
                  {eff}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Estado */}
      <div>
        <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('battle.status')}</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map(({ key, icon }) => (
            <button key={key} onClick={() => onUpdate({ status: key })}
              className="px-3 py-2 rounded font-sans text-[8px] uppercase min-h-[44px] transition-colors"
              style={battleState.status === key
                ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' }
                : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}>
              {icon} {t(`status.${key}`)}
            </button>
          ))}
        </div>
        {battleState.status === 'burn'      && <p className="mt-1 font-mono text-xs text-burn">{t('vs.burnNote')}</p>}
        {battleState.status === 'paralysis' && <p className="mt-1 font-mono text-xs text-para">{t('vs.paraNote')}</p>}
      </div>

      {/* Moves observados */}
      {moves && moves.length > 0 && (
        <div>
          <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('vs.observedMoves')}</p>
          <div className="grid grid-cols-2 gap-2">
            {moves.map((m, i) => {
              const data  = getMoveData(m)
              const usage = moveUsages?.[i] ?? 0
              const seen  = battleState.seenMoves?.includes(m)
              const moveName = data
                ? (lang === 'ja' ? (data.nameJa || data.nameEn) : lang === 'en' ? data.nameEn : (data.nameEs || data.nameEn))
                : m
              return (
                <button key={m}
                  onClick={() => onUpdate({
                    seenMoves: seen
                      ? battleState.seenMoves.filter(x => x !== m)
                      : [...(battleState.seenMoves ?? []), m],
                  })}
                  className="px-3 py-2.5 rounded font-mono text-[9px] text-left transition-colors normal-case"
                  style={seen
                    ? { border: '2px solid rgba(79,195,247,0.6)', color: '#4fc3f7', background: 'rgba(79,195,247,0.1)' }
                    : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {data && <TypeIcon type={data.type} />}
                    {data && <CategoryIcon category={data.category} />}
                    <span className="font-semibold truncate">{moveName}</span>
                  </div>
                  {data && <span className="opacity-60 block">{data.power > 0 ? `${data.power} · ${data.type}` : t('vs.statusMove')}</span>}
                  {usage > 0 && <span className="opacity-40 block">{Math.round(usage * 100)}{t('vs.usagePct')}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Reset */}
      <button onClick={onReset}
        className="w-full py-3 rounded font-mono text-text-secondary text-xs active:bg-bg-highlight normal-case"
        style={{ border: '1px solid #242424', background: '#181818' }}>
        {t('vs.resetLabel')} {title}
      </button>
    </div>
  )
}

// ── Pantalla principal ─────────────────────────────────────────────────────────

export default function VSScreen() {
  const navigate  = useNavigate()
  const { state } = useLocation()
  const { myIdx, rivalIdx } = state as { myIdx: number; rivalIdx: number }
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const { mySlots, rivalSlots, updateRivalState, updateMyBattleState } = useBattle()
  const mySlot    = mySlots[myIdx]
  const rivalSlot = rivalSlots[rivalIdx]

  const myPokemon    = mySlot?.pokemon
  const rivalPokemon = rivalSlot?.pokemon

  const myPokeNameDisplay    = myPokemon
    ? (lang === 'ja' ? myPokemon.name.ja : lang === 'en' ? myPokemon.name.en : myPokemon.name.es)
    : null
  const rivalPokeNameDisplay = rivalPokemon
    ? (lang === 'ja' ? rivalPokemon.name.ja : lang === 'en' ? rivalPokemon.name.en : rivalPokemon.name.es)
    : null

  const [showSheet,       setShowSheet]       = useState(false)
  const [activeTab,       setActiveTab]       = useState<'mine' | 'rival'>('rival')
  const [selectedMyMove,  setSelectedMyMove]  = useState<string | null>(null)
  const [selectedRivMove, setSelectedRivMove] = useState<string | null>(null)
  const [maxStatsMode,    setMaxStatsMode]    = useState<boolean>(() => {
    try { return localStorage.getItem(MAX_STATS_KEY) !== 'false' } catch { return true }
  })
  const [rivalCustomSP, setRivalCustomSP] = useState<SPSpread>(DEFAULT_SP)
  const [fieldState,    setFieldState]    = useState<FieldState>(DEFAULT_FIELD)

  useEffect(() => {
    try { localStorage.setItem(MAX_STATS_KEY, String(maxStatsMode)) } catch {}
  }, [maxStatsMode])

  useEffect(() => {
    const set = rivalSlot?.smogonSet
    setRivalCustomSP(set?.sp ?? DEFAULT_SP)
  }, [rivalSlot?.pokemon?.id])

  useEffect(() => {
    if (myPokemon && rivalPokemon) {
      analytics.vsOpened(myPokemon.name.en, rivalPokemon.name.en)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const myBattle    = mySlot?.battleState    ?? createDefaultBattleState(0)
  const rivalBattle = rivalSlot?.battleState ?? createDefaultBattleState(0)
  const rivalSet    = rivalSlot?.smogonSet
  const mySP        = mySlot?.sp ?? DEFAULT_SP

  const myMegaForm = useMemo(() => {
    if (!myPokemon || !mySlot?.itemSlug) return null
    if (mySlot.itemSlug === MEGA_EVOLUCION_SLUG && (myBattle.activeForm === 'mega-x' || myBattle.activeForm === 'mega-y')) {
      return getMegaForms(myPokemon, ALL_POKEMON_DATA).find(f => f.key === myBattle.activeForm)?.form
        ?? getMegaForm(myPokemon, mySlot.itemSlug, ALL_POKEMON_DATA)
    }
    return getMegaForm(myPokemon, mySlot.itemSlug, ALL_POKEMON_DATA)
  }, [myPokemon, mySlot?.itemSlug, myBattle.activeForm])

  const rivalMegaForm = useMemo(() => {
    if (!rivalPokemon || !rivalSet?.itemSlug) return null
    if (rivalSet.itemSlug === MEGA_EVOLUCION_SLUG && (rivalBattle.activeForm === 'mega-x' || rivalBattle.activeForm === 'mega-y')) {
      return getMegaForms(rivalPokemon, ALL_POKEMON_DATA).find(f => f.key === rivalBattle.activeForm)?.form
        ?? getMegaForm(rivalPokemon, rivalSet.itemSlug, ALL_POKEMON_DATA)
    }
    return getMegaForm(rivalPokemon, rivalSet.itemSlug, ALL_POKEMON_DATA)
  }, [rivalPokemon, rivalSet?.itemSlug, rivalBattle.activeForm])
  const myIsMega    = myBattle.activeForm !== 'normal'    && myMegaForm    !== null
  const rivalIsMega = rivalBattle.activeForm !== 'normal' && rivalMegaForm !== null
  const myIsZA    = myIsMega    && isZAMegaStone(mySlot?.itemSlug    ?? '')
  const rivalIsZA = rivalIsMega && isZAMegaStone(rivalSet?.itemSlug  ?? '')

  // When mega is active, use the mega form's ability for all damage calculations
  const myActiveAbility    = (myIsMega    && myMegaForm?.abilities?.[0]?.name)    || mySlot?.ability
  const rivalActiveAbility = (rivalIsMega && rivalMegaForm?.abilities?.[0]?.name) || rivalSet?.ability

  const myActiveSprite    = myIsMega    ? myMegaForm!.sprites.normal    : myPokemon?.sprites.normal
  const rivalActiveSprite = rivalIsMega ? rivalMegaForm!.sprites.normal : rivalPokemon?.sprites.normal
  const myBaseFallback    = myPokemon?.sprites.normal    ?? null
  const rivalBaseFallback = rivalPokemon?.sprites.normal ?? null
  const myActiveTypes     = myIsMega    ? myMegaForm!.types    : myPokemon?.types ?? []
  const rivalActiveTypes  = rivalIsMega ? rivalMegaForm!.types : rivalPokemon?.types ?? []

  const myEffective = useMemo(() => {
    if (!myPokemon) return null
    const bs = myIsMega && myMegaForm ? myMegaForm.baseStats : myPokemon.baseStats
    return calcEffectiveStats(bs, myBattle, mySP, mySlot?.nature ?? 'Hardy')
  }, [myPokemon, myBattle, mySP, mySlot?.nature, myIsMega, myMegaForm])

  const rivalEffective = useMemo(() => {
    if (!rivalPokemon) return null
    const bs = rivalIsMega && rivalMegaForm ? rivalMegaForm.baseStats : rivalPokemon.baseStats
    if (maxStatsMode) return calcMaxEffectiveStats(bs, rivalBattle)
    return calcEffectiveStats(bs, rivalBattle, rivalCustomSP, rivalSet?.nature ?? 'Hardy')
  }, [rivalPokemon, rivalBattle, rivalSet?.nature, rivalCustomSP, maxStatsMode, rivalIsMega, rivalMegaForm])

  const myStatMods    = useMemo(() =>
    getStatMods(mySlot?.itemSlug, mySlot?.ability),
  [mySlot?.itemSlug, mySlot?.ability])

  const rivalStatMods = useMemo(() =>
    getStatMods(rivalSet?.itemSlug, rivalSet?.ability),
  [rivalSet?.itemSlug, rivalSet?.ability])

  const abilityContextNotes = useMemo(() => {
    const notes: { side: 'my' | 'rival'; key: string; vars?: Record<string, string | number> }[] = []
    const weather = fieldState.weather
    function nb(ab?: string) { return ab?.toLowerCase().replace(/[\s\-_]/g, '') ?? '' }

    const myAb  = nb(myActiveAbility)
    const rivAb = nb(rivalActiveAbility)

    if (myAb === 'speedboost')  notes.push({ side: 'my', key: 'speedboost_my' })
    if (myAb === 'chlorophyll' && weather === 'sun')  notes.push({ side: 'my', key: 'chlorophyll_my' })
    if (myAb === 'swiftswim'   && weather === 'rain') notes.push({ side: 'my', key: 'swiftswim_my' })
    if (myAb === 'sandrush'    && weather === 'sand') notes.push({ side: 'my', key: 'sandrush_my' })
    if (myAb === 'unburden')   notes.push({ side: 'my', key: 'unburden_my' })
    if (myAb === 'intimidate') notes.push({ side: 'my', key: 'intimidate_my' })
    if (myAb === 'download' && rivalEffective) {
      const stat = rivalEffective.def < rivalEffective.spDef ? 'ATK' : 'SpA'
      notes.push({ side: 'my', key: 'download_my', vars: { stat, def: rivalEffective.def, spd: rivalEffective.spDef } })
    }

    if (rivAb === 'speedboost')  notes.push({ side: 'rival', key: 'speedboost_rival' })
    if (rivAb === 'chlorophyll' && weather === 'sun')  notes.push({ side: 'rival', key: 'chlorophyll_rival' })
    if (rivAb === 'swiftswim'   && weather === 'rain') notes.push({ side: 'rival', key: 'swiftswim_rival' })
    if (rivAb === 'sandrush'    && weather === 'sand') notes.push({ side: 'rival', key: 'sandrush_rival' })
    if (rivAb === 'unburden')   notes.push({ side: 'rival', key: 'unburden_rival' })
    if (rivAb === 'intimidate') notes.push({ side: 'rival', key: 'intimidate_rival' })
    if (rivAb === 'download' && myEffective) {
      const stat = myEffective.def < myEffective.spDef ? 'ATK' : 'SpA'
      notes.push({ side: 'rival', key: 'download_rival', vars: { stat, def: myEffective.def, spd: myEffective.spDef } })
    }

    return notes
  }, [myActiveAbility, rivalActiveAbility, fieldState.weather, myEffective, rivalEffective])

  const myAttackResult = useMemo(() => {
    if (!myEffective || !rivalEffective || !myPokemon || !rivalPokemon || !selectedMyMove) return null
    const moveData = getMoveData(selectedMyMove)
    if (!moveData || moveData.category === 'status' || moveData.power === 0) return null
    const doubles = fieldState.gameMode === 'doubles'
    return calcDamage({
      attackerStats: myEffective, defenderStats: rivalEffective,
      attackerTypes: myActiveTypes, defenderTypes: rivalActiveTypes,
      movePower: moveData.power, moveType: moveData.type,
      moveCategory: moveData.category,
      weather: fieldState.weather as Weather, terrain: fieldState.terrain as Terrain,
      attackerAbility: myActiveAbility,
      defenderAbility: rivalActiveAbility,
      moveName: moveData.nameApi,
      defenderIsFullHP: true,
      isDoubles: doubles,
      attackerSideHelpingHand:  doubles && fieldState.mySide.isHelpingHand,
      attackerSideBattery:      doubles && fieldState.mySide.isBattery,
      attackerSidePowerSpot:    doubles && fieldState.mySide.isPowerSpot,
      attackerSideSteelySpirit: doubles && fieldState.mySide.isSteelySpirit,
      defenderSideReflect:      fieldState.rivalSide.isReflect,
      defenderSideLightScreen:  fieldState.rivalSide.isLightScreen,
      defenderSideAuroraVeil:   fieldState.rivalSide.isAuroraVeil,
      defenderSideFriendGuard:  doubles && fieldState.rivalSide.isFriendGuard,
    })
  }, [myEffective, rivalEffective, myPokemon, rivalPokemon, selectedMyMove, myBattle, myActiveTypes, rivalActiveTypes, myActiveAbility, rivalActiveAbility, fieldState])

  const rivalAttackResult = useMemo(() => {
    if (!myEffective || !rivalEffective || !myPokemon || !rivalPokemon || !selectedRivMove) return null
    const moveData = getMoveData(selectedRivMove)
    if (!moveData || moveData.category === 'status' || moveData.power === 0) return null
    const doubles = fieldState.gameMode === 'doubles'
    return calcDamage({
      attackerStats: rivalEffective, defenderStats: myEffective,
      attackerTypes: rivalActiveTypes, defenderTypes: myActiveTypes,
      movePower: moveData.power, moveType: moveData.type,
      moveCategory: moveData.category,
      weather: fieldState.weather as Weather, terrain: fieldState.terrain as Terrain,
      attackerAbility: rivalActiveAbility,
      defenderAbility: myActiveAbility,
      moveName: moveData.nameApi,
      defenderIsFullHP: true,
      isDoubles: doubles,
      attackerSideHelpingHand:  false,
      attackerSideBattery:      doubles && fieldState.rivalSide.isBattery,
      attackerSidePowerSpot:    doubles && fieldState.rivalSide.isPowerSpot,
      attackerSideSteelySpirit: doubles && fieldState.rivalSide.isSteelySpirit,
      defenderSideReflect:      fieldState.mySide.isReflect,
      defenderSideLightScreen:  fieldState.mySide.isLightScreen,
      defenderSideAuroraVeil:   fieldState.mySide.isAuroraVeil,
      defenderSideFriendGuard:  false,
    })
  }, [myEffective, rivalEffective, myPokemon, rivalPokemon, selectedRivMove, myBattle, myActiveTypes, rivalActiveTypes, myActiveAbility, rivalActiveAbility, fieldState])

  function patchMyBattle(patch: Partial<PokemonBattleState>) {
    updateMyBattleState(myIdx, { ...myBattle, ...patch })
  }
  function patchRivalBattle(patch: Partial<PokemonBattleState>) {
    updateRivalState(rivalIdx, { ...rivalBattle, ...patch })
  }
  function resetMy() {
    updateMyBattleState(myIdx, createDefaultBattleState(myPokemon?.id ?? 0))
    setSelectedMyMove(null)
  }
  function resetRival() {
    updateRivalState(rivalIdx, createDefaultBattleState(rivalPokemon?.id ?? 0))
  }

  const myMegaForms    = myPokemon    ? getMegaForms(myPokemon,    ALL_POKEMON_DATA) : []
  const rivalMegaForms = rivalPokemon ? getMegaForms(rivalPokemon, ALL_POKEMON_DATA) : []
  const myIsMultiMega    = mySlot?.itemSlug    === MEGA_EVOLUCION_SLUG && myMegaForms.length >= 2
  const rivalIsMultiMega = rivalSet?.itemSlug  === MEGA_EVOLUCION_SLUG && rivalMegaForms.length >= 2

  function toggleMyMega() {
    if (!myMegaForm || !mySlot?.itemSlug) return
    if (myBattle.activeForm !== 'normal') {
      patchMyBattle({ activeForm: 'normal' })
    } else {
      const key = myIsMultiMega ? 'mega-x' : megaFormKey(mySlot.itemSlug)
      patchMyBattle({ activeForm: key })
    }
  }
  function toggleRivalMega() {
    if (!rivalMegaForm || !rivalSet?.itemSlug) return
    if (rivalBattle.activeForm !== 'normal') {
      patchRivalBattle({ activeForm: 'normal' })
    } else {
      const key = rivalIsMultiMega ? 'mega-x' : megaFormKey(rivalSet.itemSlug)
      patchRivalBattle({ activeForm: key })
    }
  }
  function pickMyMegaForm(key: string) {
    patchMyBattle({ activeForm: key as 'mega-x' | 'mega-y' })
  }
  function pickRivalMegaForm(key: string) {
    patchRivalBattle({ activeForm: key as 'mega-x' | 'mega-y' })
  }

  function stateLabel(bs: PokemonBattleState) {
    const parts: string[] = []
    if (Object.values(bs.boosts).some(v => v !== 0)) parts.push('boost')
    if (bs.status !== 'none') parts.push(STATUS_OPTS.find(s => s.key === bs.status)?.icon ?? '')
    return parts.join(' ')
  }

  useEffect(() => {
    if (myAttackResult && selectedMyMove) {
      const isKO = myAttackResult.min >= (rivalEffective?.hp ?? Infinity)
      const isPossKO = !isKO && myAttackResult.max >= (rivalEffective?.hp ?? Infinity)
      const verdict = isKO ? 'KO' : isPossKO ? 'MAYBE' : 'SURVIVE'
      analytics.damageCalculated(selectedMyMove, verdict, Math.round(myAttackResult.minPercent), Math.round(myAttackResult.maxPercent))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMyMove, myAttackResult?.minPercent])

  const myMoves  = mySlot?.moves?.filter(Boolean) ?? []
  const rivMoves = rivalSet?.moves?.filter(Boolean) ?? []

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">

      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '2px solid #ff2244' }}>
        <button onClick={() => navigate(-1)} className="font-mono text-text-muted text-xl p-1 min-w-[44px]">←</button>
        <span className="font-sans text-red text-sm uppercase"
          style={{ textShadow: '0 0 10px rgba(255,34,68,0.7)' }}>{t('vs.title')}</span>
        <button onClick={() => { resetMy(); resetRival() }}
          className="font-sans text-[8px] uppercase px-3 py-2 rounded min-h-[44px]"
          style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}>
          {t('vs.rotate')}
        </button>
      </header>

      {/* Sprites VS */}
      <div className="flex items-end justify-around px-4 py-3 shrink-0"
        style={{ background: '#0f0f0f', borderBottom: '1px solid #181818' }}>

        {/* Mi Pokémon */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="relative">
            {myActiveSprite && (
              <img src={myActiveSprite} alt={myPokeNameDisplay ?? ''}
                className="w-16 h-16 object-contain" style={{ imageRendering:'pixelated' }}
                onError={myIsZA && myBaseFallback ? (e) => { (e.target as HTMLImageElement).src = myBaseFallback } : undefined} />
            )}
            {myIsMega && <span className="absolute -top-1 -right-1 text-bg-primary text-[8px] font-black px-1 py-0.5 leading-none"
              style={{ background: myIsZA ? '#44ff88' : '#cc88ff', borderRadius: '50%' }}>
              {myIsZA ? 'ZA' : 'M'}
            </span>}
          </div>
          <span className="font-sans text-[9px] uppercase text-center" style={{ color: '#4fc3f7' }}>
            {myPokeNameDisplay ?? '—'}
          </span>
          <div className="flex gap-1 justify-center flex-wrap">
            {myActiveTypes.map(tp => <TypeBadge key={tp} type={tp} size="icon" />)}
          </div>
          {mySlot?.item && (
            <div className="flex items-center gap-1 mt-0.5">
              {mySlot.itemSlug && <img src={`/assets/items/${mySlot.itemSlug}.png`} alt="" className="w-4 h-4 object-contain" />}
              <span className="font-mono text-text-muted text-[9px] normal-case">{itemDisplayName(mySlot.itemSlug, mySlot.item, lang)}</span>
            </div>
          )}
          {myMegaForm && isMegaStone(mySlot?.itemSlug ?? '') && (
            <div className="flex gap-1 mt-0.5">
              {myIsMultiMega ? (
                myMegaForms.map(({ key }) => (
                  <button key={key} onClick={() => pickMyMegaForm(key)}
                    className="px-2 py-1.5 rounded font-sans text-[8px] uppercase transition-colors"
                    style={myBattle.activeForm === key
                      ? { border: '2px solid #cc88ff', color: '#cc88ff', background: '#2a1a4a' }
                      : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                    {key === 'mega-x' ? 'X' : key === 'mega-y' ? 'Y' : 'M'}
                  </button>
                ))
              ) : (
                <button onClick={toggleMyMega}
                  className="px-3 py-1.5 rounded font-sans text-[8px] uppercase transition-colors"
                  style={myIsMega
                    ? myIsZA
                      ? { border: '2px solid #44ff88', color: '#44ff88', background: '#1a2a1a' }
                      : { border: '2px solid #cc88ff', color: '#cc88ff', background: '#2a1a4a' }
                    : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                  {myIsMega ? (myIsZA ? '◆ Z-A' : '◆ MEGA') : (myIsZA ? '◇ Z-A' : '◇ MEGA')}
                </button>
              )}
            </div>
          )}
          {stateLabel(myBattle) && <span className="font-mono text-[9px]" style={{ color: '#4fc3f7' }}>{stateLabel(myBattle)}</span>}
        </div>

        <span className="font-sans font-black text-2xl px-2"
          style={{ color: '#ff2244', textShadow: '0 0 12px rgba(255,34,68,0.7)' }}>VS</span>

        {/* Rival */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="relative">
            {rivalActiveSprite && (
              <img src={rivalActiveSprite} alt={rivalPokeNameDisplay ?? ''}
                className="w-16 h-16 object-contain"
                style={{ imageRendering:'pixelated', transform:'scaleX(-1)' }}
                onError={rivalIsZA && rivalBaseFallback ? (e) => { (e.target as HTMLImageElement).src = rivalBaseFallback } : undefined} />
            )}
            {rivalIsMega && <span className="absolute -top-1 -right-1 text-bg-primary text-[8px] font-black px-1 py-0.5 leading-none"
              style={{ background: rivalIsZA ? '#44ff88' : '#cc88ff', borderRadius: '50%' }}>
              {rivalIsZA ? 'ZA' : 'M'}
            </span>}
          </div>
          <span className="font-sans text-[9px] uppercase text-center text-debuff">
            {rivalPokeNameDisplay ?? '—'}
          </span>
          <div className="flex gap-1 justify-center flex-wrap">
            {rivalActiveTypes.map(tp => <TypeBadge key={tp} type={tp} size="icon" />)}
          </div>
          {rivalSet?.item && (
            <div className="flex items-center gap-1 mt-0.5">
              {rivalSet.itemSlug && <img src={`/assets/items/${rivalSet.itemSlug}.png`} alt="" className="w-4 h-4 object-contain" />}
              <span className="font-mono text-text-muted text-[9px] normal-case">{itemDisplayName(rivalSet.itemSlug, rivalSet.item, lang)}</span>
            </div>
          )}
          {rivalMegaForm && isMegaStone(rivalSet?.itemSlug ?? '') && (
            <div className="flex gap-1 mt-0.5">
              {rivalIsMultiMega ? (
                rivalMegaForms.map(({ key }) => (
                  <button key={key} onClick={() => pickRivalMegaForm(key)}
                    className="px-2 py-1.5 rounded font-sans text-[8px] uppercase transition-colors"
                    style={rivalBattle.activeForm === key
                      ? { border: '2px solid #cc88ff', color: '#cc88ff', background: '#2a1a4a' }
                      : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                    {key === 'mega-x' ? 'X' : key === 'mega-y' ? 'Y' : 'M'}
                  </button>
                ))
              ) : (
                <button onClick={toggleRivalMega}
                  className="px-3 py-1.5 rounded font-sans text-[8px] uppercase transition-colors"
                  style={rivalIsMega
                    ? rivalIsZA
                      ? { border: '2px solid #44ff88', color: '#44ff88', background: '#1a2a1a' }
                      : { border: '2px solid #cc88ff', color: '#cc88ff', background: '#2a1a4a' }
                    : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                  {rivalIsMega ? (rivalIsZA ? '◆ Z-A' : '◆ MEGA') : (rivalIsZA ? '◇ Z-A' : '◇ MEGA')}
                </button>
              )}
            </div>
          )}
          {stateLabel(rivalBattle) && <span className="font-mono text-[9px] text-debuff">{stateLabel(rivalBattle)}</span>}
        </div>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* Tabla de stats */}
        <div className="px-4 py-3">
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="text-text-muted text-[10px]">
                <th className="text-left pb-1 w-10 font-sans text-[8px] uppercase">{t('vs.stat')}</th>
                <th className="text-right pb-1" style={{ color: '#4fc3f7' }}>{t('vs.me')}</th>
                <th className="w-6"></th>
                <th className="text-left pb-1 text-debuff">
                  {t('vs.rival')}{maxStatsMode && <span className="text-[8px] text-text-muted ml-1">{t('vs.max')}</span>}
                </th>
                {!maxStatsMode && <th className="text-right pb-1 text-text-muted text-[8px] w-10 font-sans uppercase">{t('vs.sp')}</th>}
              </tr>
            </thead>
            <tbody>
              {STAT_KEYS.map(key => {
                const myVal    = myEffective?.[key]    ?? 0
                const rivalVal = rivalEffective?.[key] ?? 0
                const myBoost    = key !== 'hp' ? (myBattle.boosts    as unknown as Record<string, number>)[key] ?? 0 : 0
                const rivalBoost = key !== 'hp' ? (rivalBattle.boosts as unknown as Record<string, number>)[key] ?? 0 : 0

                const myMod    = myStatMods[key]
                const rivalMod = rivalStatMods[key]
                const myModVal    = myMod    ? applyMod(myVal,    myMod)    : null
                const rivalModVal = rivalMod ? applyMod(rivalVal, rivalMod) : null

                const modColor = (source: string) =>
                  source === 'item' ? '#4499ff' : source === 'ability' ? '#cc88ff' : '#4499ff'

                const spKey = key as keyof SPSpread
                const spVal = rivalCustomSP[spKey] ?? 0

                return (
                  <tr key={key} style={{ borderTop: '1px solid #181818' }}>
                    <td className="py-1.5 text-text-muted font-sans text-[8px] uppercase">{t(`stats.${key}`)}</td>
                    <td className="text-right py-1.5">
                      <span className={`font-bold
                        ${myVal > rivalVal ? 'text-boost' : myVal < rivalVal ? 'text-text-secondary' : 'text-text-primary'}`}>
                        {myVal || '—'}
                      </span>
                      {myBoost !== 0 && <span className={`text-[9px] ml-0.5 ${myBoost > 0 ? 'text-boost' : 'text-debuff'}`}>{myBoost > 0 ? `+${myBoost}` : myBoost}</span>}
                      {myModVal !== null && (
                        <span className="text-[9px] ml-1 font-bold" style={{ color: modColor(myMod!.source) }}>
                          →{myModVal}
                        </span>
                      )}
                    </td>
                    <td className="text-center font-mono text-text-muted text-xs">│</td>
                    <td className="py-1.5">
                      <span className={`font-bold
                        ${rivalVal > myVal ? 'text-debuff' : rivalVal < myVal ? 'text-text-secondary' : 'text-text-primary'}`}>
                        {rivalVal || '—'}
                      </span>
                      {rivalBoost !== 0 && <span className={`text-[9px] ml-0.5 ${rivalBoost > 0 ? 'text-boost' : 'text-debuff'}`}>{rivalBoost > 0 ? `+${rivalBoost}` : rivalBoost}</span>}
                      {rivalModVal !== null && (
                        <span className="text-[9px] ml-1 font-bold" style={{ color: modColor(rivalMod!.source) }}>
                          →{rivalModVal}
                        </span>
                      )}
                    </td>
                    {!maxStatsMode && (
                      <td className="py-1 pl-1 text-right">
                        <input
                          type="number"
                          min={0}
                          max={32}
                          value={spVal === 0 ? '' : spVal}
                          placeholder="0"
                          onChange={e => {
                            const v = Math.max(0, Math.min(32, parseInt(e.target.value) || 0))
                            setRivalCustomSP(prev => ({ ...prev, [spKey]: v }))
                          }}
                          className="w-9 text-right text-xs rounded text-[#ff8888] px-1 py-0.5
                                     focus:outline-none [appearance:textfield]
                                     [&::-webkit-outer-spin-button]:appearance-none
                                     [&::-webkit-inner-spin-button]:appearance-none"
                          style={{ background: '#181818', border: '1px solid #242424' }}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Notas de habilidades */}
        {abilityContextNotes.length > 0 && (
          <div className="px-4 pb-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid #181818', paddingTop: 8 }}>
            {abilityContextNotes.map((note, i) => (
              <p key={i} className={`font-mono text-[9px] normal-case ${note.side === 'my' ? '' : 'text-[#ff8888]'}`}
                style={note.side === 'my' ? { color: '#4488ff' } : {}}>
                ✦ {t(`abilityNote.${note.key}`, note.vars ?? {})}
              </p>
            ))}
          </div>
        )}

        {/* Toggle stats máximas */}
        <div className="flex items-center justify-between px-4 py-2.5 min-h-[48px]"
          style={{ borderTop: '1px solid #181818' }}>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[8px] uppercase text-text-secondary">{t('vs.maxStats')}</p>
            <p className="font-mono text-text-muted text-[9px] normal-case">
              {maxStatsMode ? t('vs.maxStatsOn') : t('vs.maxStatsOff')}
            </p>
          </div>
          <button
            onClick={() => setMaxStatsMode(v => !v)}
            className="relative w-12 h-6 rounded overflow-hidden transition-colors shrink-0 ml-3"
            style={{ background: maxStatsMode ? '#ff2244' : '#242424' }}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded bg-white shadow transition-all duration-200
              ${maxStatsMode ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Campo de Batalla */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid #181818' }}>
          <FieldPanel state={fieldState} onChange={setFieldState} />
        </div>

        {/* YO ATACO */}
        <div className="px-4 py-3" style={{ borderTop: '2px solid #1a3a5a', background: 'rgba(6,15,30,0.5)' }}>
          <p className="font-sans text-[8px] uppercase mb-2" style={{ color: '#4fc3f7' }}>
            {t('vs.iAttack')}
          </p>

          <QuickMoves
            moves={myMoves}
            selected={selectedMyMove}
            onSelect={m => setSelectedMyMove(prev => prev === m ? null : m)}
            accentStyle={{ borderColor: '#4fc3f7', color: '#4fc3f7', background: 'rgba(10,30,58,0.8)' }}
            lang={lang}
          />

          <MoveSelector value={selectedMyMove} onChange={setSelectedMyMove} />

          {selectedMyMove && getMoveData(selectedMyMove)?.category === 'status' && (
            <div className="p-2.5 rounded font-mono text-text-muted text-xs text-center mt-2 normal-case"
              style={{ border: '1px solid #242424', background: '#181818' }}>
              {t('vs.statusMove')}
            </div>
          )}
          <DamageCard
            result={myAttackResult}
            defenderHp={rivalEffective?.hp ?? 0}
            koKey="vs.ko"
            maybeKey="vs.maybe"
            surviveKey="vs.survive"
            isAttack={true}
          />
        </div>

        {/* RIVAL ATACA */}
        <div className="px-4 py-3" style={{ borderTop: '2px solid #3a1a1a', background: 'rgba(19,8,8,0.5)' }}>
          <p className="font-sans text-[8px] uppercase mb-2 text-debuff">
            {t('vs.rivalAttacks')}
          </p>

          <QuickMoves
            moves={rivMoves}
            selected={selectedRivMove}
            onSelect={m => setSelectedRivMove(prev => prev === m ? null : m)}
            accentStyle={{ borderColor: '#ff2244', color: '#ff2244', background: 'rgba(42,10,10,0.8)' }}
            lang={lang}
          />

          <MoveSelector value={selectedRivMove} onChange={setSelectedRivMove} />

          {selectedRivMove && getMoveData(selectedRivMove)?.category === 'status' && (
            <div className="p-2.5 rounded font-mono text-text-muted text-xs text-center mt-2 normal-case"
              style={{ border: '1px solid #242424', background: '#181818' }}>
              {t('vs.statusMove')}
            </div>
          )}
          <DamageCard
            result={rivalAttackResult}
            defenderHp={myEffective?.hp ?? 0}
            koKey="vs.noSurvive"
            maybeKey="vs.maybe"
            surviveKey="vs.youSurvive"
            isAttack={false}
          />
        </div>

        <div className="h-4" />
      </div>

      {/* Botones de estado fijos */}
      <div className="px-4 pb-3 shrink-0 flex gap-2 bg-bg-primary" style={{ borderTop: '1px solid #181818' }}>
        <button onClick={() => { setActiveTab('mine'); setShowSheet(true) }}
          className="flex-1 py-4 rounded font-sans text-[8px] uppercase min-h-[56px]"
          style={{ border: '2px solid rgba(79,195,247,0.4)', color: '#4fc3f7', background: '#04101e' }}>
          {t('vs.myStatus')}
        </button>
        <button onClick={() => { setActiveTab('rival'); setShowSheet(true) }}
          className="flex-1 py-4 rounded font-sans text-[8px] uppercase min-h-[56px]"
          style={{ border: '2px solid rgba(255,34,68,0.4)', color: '#ff2244', background: '#1a0606' }}>
          {t('vs.rivalBtn')}
        </button>
      </div>

      {/* Bottom sheet de estado */}
      {showSheet && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowSheet(false)} />
          <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
            style={{ maxHeight: '65vh', borderTop: '2px solid #ff2244' }}>
            <div className="flex flex-col items-center pt-3 shrink-0 sticky top-0 bg-bg-secondary z-10">
              <div className="w-10 h-1 bg-bg-highlight mb-3" />
              <div className="flex w-full px-4 gap-2 pb-3">
                <button onClick={() => setActiveTab('mine')}
                  className="flex-1 py-2.5 rounded font-sans text-[8px] uppercase transition-colors"
                  style={activeTab === 'mine'
                    ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#04101e' }
                    : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                  ⚡ {myPokeNameDisplay?.toUpperCase() ?? t('vs.myPokemon')}
                </button>
                <button onClick={() => setActiveTab('rival')}
                  className="flex-1 py-2.5 rounded font-sans text-[8px] uppercase transition-colors"
                  style={activeTab === 'rival'
                    ? { border: '2px solid #ff2244', color: '#ff2244', background: '#1a0606' }
                    : { border: '1px solid #242424', color: '#999999', background: '#181818' }}>
                  ⚔ {rivalPokeNameDisplay?.toUpperCase() ?? t('vs.rival')}
                </button>
              </div>
            </div>
            <div className="overflow-y-auto px-4 pb-6">
              {activeTab === 'mine' ? (
                <StatePanel
                  title={myPokeNameDisplay ?? t('vs.myPokemon')}
                  battleState={myBattle} effective={myEffective}
                  moves={mySlot?.moves?.filter(Boolean)} onUpdate={patchMyBattle} onReset={resetMy}
                  lang={lang}
                />
              ) : (
                <StatePanel
                  title={rivalPokeNameDisplay ?? t('vs.rival')}
                  battleState={rivalBattle} effective={rivalEffective}
                  moves={rivalSet?.moves} moveUsages={rivalSet?.moveUsages}
                  onUpdate={patchRivalBattle} onReset={resetRival}
                  lang={lang}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <PixelNav />
    </div>
  )
}
