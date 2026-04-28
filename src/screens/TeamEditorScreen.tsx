// src/screens/TeamEditorScreen.tsx
// Editor de mi equipo — pixel aesthetic redesign

import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle, type MySlot, emptyMySlot } from '../store/BattleContext'
import type { PokemonData } from '../types/pokemon'
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import naturesData from '../i18n/natures.json'
import TypeBadge  from '../components/TypeBadge'
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect'
import { searchMoves, getMoveData } from '../lib/moveDb'
import { calcBaseStat } from '../lib/statCalc'
import type { SPSpread } from '../lib/statCalc'
import { getMegaForm, isZAMegaStone, ALL_MEGA_STONE_SLUGS, MEGA_EVOLUCION_SLUG, hasMegaAvailable } from '../lib/megaStones'
import AdBanner from '../components/AdBanner'
import PixelNav from '../components/PixelNav'
import { useAuth } from '../hooks/useAuth'
import AuthModal from '../components/AuthModal'
import { getAbilityName } from '../lib/abilities'
import { saveRivalPreset, loadRivalPresets, deleteRivalPreset, type RivalPreset } from '../lib/rivalPresetsDb'

const ALL_POKEMON     = (pokemonData as PokemonData[]).filter(p => !p.isMega)
const ALL_POKEMON_ALL = pokemonData as PokemonData[]

// ── Tipos de color por tipo ────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  normal:'#a8a878',fire:'#f08030',water:'#6890f0',electric:'#f8d030',
  grass:'#78c850',ice:'#98d8d8',fighting:'#c03028',poison:'#a040a0',
  ground:'#e0c068',flying:'#a890f0',psychic:'#f85888',bug:'#a8b820',
  rock:'#b8a038',ghost:'#705898',dragon:'#7038f8',dark:'#705848',
  steel:'#b8b8d0',fairy:'#ee99ac',
}

// ── Nature helpers ─────────────────────────────────────────────────────────────
const NATURES_DB = naturesData as Record<string, {
  en: string; es: string; ja: string; up: string | null; down: string | null
}>

const STAT_DISPLAY: Record<string, string> = {
  atk:'ATK', def:'DEF', spAtk:'SpA', spDef:'SpD', spe:'SPE'
}

function natureLabel(key: string, lang: string): string {
  const n = NATURES_DB[key]
  if (!n) return key
  return lang === 'ja' ? n.ja : lang === 'es' ? n.es : n.en
}

function natureSublabel(key: string): string {
  const n = NATURES_DB[key]
  if (!n || (!n.up && !n.down)) return 'Neutral'
  return `↑${STAT_DISPLAY[n.up!] ?? n.up} ↓${STAT_DISPLAY[n.down!] ?? n.down}`
}

// ── Item helpers ───────────────────────────────────────────────────────────────
type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ALL_ITEMS = itemsData as ItemEntry[]

function itemLabel(item: ItemEntry, lang: string): string {
  return lang === 'es' ? item.nameEs : item.nameEn
}

// ── SP labels ────────────────────────────────────────────────────────────────
const SP_KEYS: { key: keyof SPSpread; isHP: boolean }[] = [
  { key:'hp',    isHP: true  },
  { key:'atk',   isHP: false },
  { key:'def',   isHP: false },
  { key:'spAtk', isHP: false },
  { key:'spDef', isHP: false },
  { key:'spe',   isHP: false },
]

function slugToItemName(slug: string, lang: string): string {
  if (!slug) return ''
  const it = ALL_ITEMS.find(i => i.nameApi === slug)
  return it ? itemLabel(it, lang) : slug
}

// ── Pokémon SearchableSelect ──────────────────────────────────────────────────
function buildPokemonOptions(lang: string): SelectOption[] {
  return ALL_POKEMON.map(p => ({
    value: String(p.id),
    label: lang === 'ja' ? p.name.ja : lang === 'es' ? p.name.es : p.name.en,
    sublabel: p.types.join(' / '),
    icon: p.sprites.normal
      ? <img src={p.sprites.normal} alt="" className="w-8 h-8 object-contain"
          style={{ imageRendering:'pixelated' }} />
      : undefined,
  }))
}

// ── Item Sprite ───────────────────────────────────────────────────────────────
function ItemSprite({ slug, size = 30 }: { slug: string; size?: number }) {
  const [src, setSrc] = useState(`/assets/items/${slug}.png`)
  const [err, setErr] = useState(false)

  // Si el png falla, intentar jpg
  function handleError() {
    if (src.endsWith('.png')) {
      setSrc(`/assets/items/${slug}.jpg`)
    } else {
      setErr(true)
    }
  }

  if (!slug || err) return null
  return (
    <img
      src={src}
      alt=""
      onError={handleError}
      style={{ width: size, height: size, objectFit:'contain' }}
    />
  )
}

// ── Move icon helpers ─────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    const bg = TYPE_COLORS[type] ?? '#999'
    return <span className="w-5 h-5 rounded shrink-0" style={{ background: bg }} />
  }
  return (
    <img src={`/assets/types/${type}.png`} alt={type} width={20} height={20}
      className="object-contain shrink-0" onError={() => setFailed(true)} />
  )
}

function CategoryIcon({ category }: { category: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className="w-5 h-5 text-[8px] text-text-muted shrink-0 flex items-center justify-center">{category[0].toUpperCase()}</span>
  }
  return (
    <img src={`/assets/categories/${category}.svg`} alt={category} width={20} height={20}
      className="object-contain shrink-0" onError={() => setFailed(true)} />
  )
}

function buildMoveOption(m: ReturnType<typeof searchMoves>[number], lang: string): SelectOption {
  const name = lang === 'ja' ? m.nameJa : lang === 'es' ? m.nameEs : m.nameEn
  const power = m.power > 0 ? String(m.power) : '—'
  const acc   = (m.accuracy ?? 0) > 0 ? `${m.accuracy}%` : '—'
  const desc  = lang === 'ja'
    ? (m.descriptionJa || m.descriptionEn || '')
    : lang === 'es'
    ? (m.descriptionEs || m.descriptionEn || '')
    : (m.descriptionEn || '')
  const stats = `POT ${power}  PREC ${acc}  PP ${m.pp}`
  return {
    value:    m.nameEn,
    label:    name || m.nameEn,
    sublabel: desc ? `${stats} · ${desc}` : stats,
    icon: (
      <div className="flex items-center gap-1 shrink-0">
        <TypeIcon type={m.type} />
        <CategoryIcon category={m.category} />
      </div>
    ),
  }
}

// ── Move SearchableSelect ─────────────────────────────────────────────────────
function MoveSearchSelect({
  value, onChange, lang, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  lang: string
  placeholder?: string
}) {
  const { t } = useTranslation()
  const options: SelectOption[] = useMemo(
    () => searchMoves('', lang, 500).map(m => buildMoveOption(m, lang)),
    [lang]
  )

  function handleSearch(q: string): SelectOption[] {
    if (!q.trim()) return []
    return searchMoves(q, lang, 60).map(m => buildMoveOption(m, lang))
  }

  function renderTrigger(_opt: SelectOption | null) {
    if (!value) return <span className="text-text-muted text-sm flex-1">{placeholder ?? t('teamEditor.movePlaceholder')}</span>
    const m = getMoveData(value)
    if (!m) return <span className="text-text-primary text-sm flex-1 truncate">{value}</span>
    const name = lang === 'ja' ? m.nameJa : lang === 'es' ? m.nameEs : m.nameEn
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TypeIcon type={m.type} />
        <CategoryIcon category={m.category} />
        <span className="text-text-primary text-sm font-semibold truncate flex-1">{name || value}</span>
        {m.power > 0 && <span className="text-text-muted text-xs shrink-0">{m.power}</span>}
        {(m.accuracy ?? 0) > 0 && <span className="text-text-muted text-xs shrink-0">{m.accuracy}%</span>}
      </div>
    )
  }

  return (
    <SearchableSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={t('teamEditor.searchMove')}
      emptyLabel={placeholder ?? t('teamEditor.movePlaceholder')}
      onSearch={handleSearch}
      renderTrigger={renderTrigger}
    />
  )
}

// ── Preset Sheets ─────────────────────────────────────────────────────────────

function SavePresetSheet({ pokemonId, ability, item, itemSlug, nature, sp, moves, onClose }: {
  pokemonId: number; ability: string; item: string; itemSlug: string
  nature: string; sp: SPSpread; moves: string[]; onClose: () => void
}) {
  const { t } = useTranslation()
  const [name,   setName]   = useState('')
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    setSaving(true); setError('')
    const result = await saveRivalPreset({
      name: name.trim() || 'Sin nombre',
      pokemonId, ability, item, itemSlug, nature, sp,
      moves: moves.filter(Boolean), note,
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col p-4 gap-3 animate-slide-up"
        style={{ borderTop: '2px solid #4fc3f7' }}>
        <div className="w-10 h-1 bg-bg-highlight mx-auto" />
        <p className="font-sans text-text-primary text-[9px] uppercase">{t('teamEditor.savePresetTitle')}</p>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder={t('teamEditor.presetName')} maxLength={40}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }} />
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={t('teamEditor.presetNote')} maxLength={80}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }} />
        {error && <p className="font-mono text-debuff text-[9px] normal-case">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded font-sans text-[8px] uppercase"
            style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}>
            {t('teamEditor.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase disabled:opacity-50"
            style={{ border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#080808',
                     boxShadow: '3px 3px 0 #004488' }}>
            {saving ? '...' : t('teamEditor.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

function PresetsSheet({ pokemonId, onLoad, onClose }: {
  pokemonId: number; onLoad: (p: RivalPreset) => void; onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { session } = useAuth()
  const [presets, setPresets] = useState<RivalPreset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    loadRivalPresets().then(({ data }) => {
      setPresets(data.filter(p => p.pokemon_id === pokemonId))
      setLoading(false)
    })
  }, [session, pokemonId])

  async function handleDelete(id: string) {
    await deleteRivalPreset(id)
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
        style={{ maxHeight: '70vh', borderTop: '2px solid #4fc3f7' }}>
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #181818' }}>
          <p className="font-sans text-text-primary text-[9px] uppercase">{t('teamEditor.myPresets')}</p>
          <button onClick={onClose} className="font-mono text-text-muted text-xl p-1">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {loading ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case animate-pulse">
              {t('teamEditor.loading')}
            </p>
          ) : presets.length === 0 ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
              {t('teamEditor.noPresetsForPoke')}
            </p>
          ) : presets.map(preset => {
            const natStr   = natureLabel(preset.nature, lang)
            const movesStr = preset.moves.filter(Boolean).map(m => {
              const d = getMoveData(m)
              if (!d) return m
              return lang === 'ja' ? (d.nameJa || d.nameEn) : lang === 'es' ? (d.nameEs || d.nameEn) : d.nameEn
            }).join(', ')
            return (
              <div key={preset.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(36,36,36,0.5)' }}>
                <button onClick={() => { onLoad(preset); onClose() }} className="flex-1 text-left min-h-[44px]">
                  <p className="font-sans text-text-primary text-[9px] uppercase">{preset.name}</p>
                  {preset.note && (
                    <p className="font-mono text-text-muted text-[8px] normal-case mt-0.5">{preset.note}</p>
                  )}
                  <p className="font-mono text-text-muted text-[8px] normal-case mt-0.5">
                    {natStr} · {movesStr}
                  </p>
                </button>
                <button onClick={() => handleDelete(preset.id)}
                  className="font-mono text-text-muted text-sm p-2 min-w-[40px] min-h-[40px]
                             flex items-center justify-center active:text-debuff transition-colors">
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Slot Summary (collapsed view) ─────────────────────────────────────────────
function SlotSummary({ slot, slotIdx, lang, isMega, isZA, activeTypes, activeSprite, baseFallbackSprite, onExpand }: {
  slot: MySlot
  slotIdx: number
  lang: string
  isMega: boolean
  isZA: boolean
  activeTypes: string[]
  activeSprite: string | null
  baseFallbackSprite: string | null
  onExpand: () => void
}) {
  const { t } = useTranslation()
  const p = slot.pokemon

  return (
    <button
      onClick={onExpand}
      className="w-full bg-bg-secondary p-3 rounded flex items-center gap-3
                 active:bg-bg-elevated/60 transition-colors text-left"
      style={{ border: '2px solid #242424' }}
    >
      {/* Sprite */}
      <div className="w-12 h-12 flex items-center justify-center shrink-0 relative rounded"
        style={isZA
          ? { background: '#1a2a1a', border: '2px solid #44ff88' }
          : isMega
          ? { background: '#2a1a4a', border: '2px solid #cc88ff' }
          : { background: '#181818', border: '1px solid #242424' }}>
        {activeSprite
          ? <img src={activeSprite} alt="" className="w-10 h-10 object-contain"
              style={{ imageRendering: 'pixelated' }}
              onError={isZA && baseFallbackSprite ? (e) => { (e.target as HTMLImageElement).src = baseFallbackSprite } : undefined} />
          : <span className="font-mono text-xl text-text-muted">{slotIdx + 1}</span>
        }
        {isMega && (
          <span className="absolute -top-1 -right-1 text-bg-primary text-[7px] font-black px-0.5 py-0.5 leading-none"
            style={{ background: isZA ? '#44ff88' : '#cc88ff', borderRadius: '50%' }}>
            {isZA ? 'ZA' : 'M'}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {p ? (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-text-primary text-[9px] uppercase truncate">
                {lang === 'ja' ? p.name.ja : lang === 'es' ? p.name.es : p.name.en}
              </span>
              {isMega && <span className="font-sans text-[8px] font-black" style={{ color: isZA ? '#44ff88' : '#cc88ff' }}>{isZA ? 'Z-A' : 'MEGA'}</span>}
              <div className="flex gap-1">
                {activeTypes.map(tp => <TypeBadge key={tp} type={tp} />)}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {slot.itemSlug && (
                <div className="flex items-center gap-1 shrink-0">
                  <ItemSprite slug={slot.itemSlug} size={12} />
                </div>
              )}
              {slot.moves.filter(Boolean).length > 0 && (
                <span className="font-mono text-text-muted text-[9px] truncate normal-case">
                  {slot.moves.filter(Boolean).slice(0,4).map(m => {
                    const d = getMoveData(m)
                    return d ? (lang === 'ja' ? d.nameJa : lang === 'es' ? d.nameEs : d.nameEn) || m : m
                  }).join(' · ')}
                </span>
              )}
            </div>
          </>
        ) : (
          <span className="font-mono text-text-muted text-[9px] normal-case">{t('teamEditor.emptySlot', { n: slotIdx + 1 })}</span>
        )}
      </div>

      {/* Edit indicator */}
      <span className="font-mono text-text-muted text-xs shrink-0">✎</span>
    </button>
  )
}

// ── Slot Editor ───────────────────────────────────────────────────────────────
function SlotEditor({ slot, slotIdx, lang, onChange, onCollapse }: {
  slot: MySlot
  slotIdx: number
  lang: string
  onChange: (s: MySlot) => void
  onCollapse: () => void
}) {
  const { t } = useTranslation()
  const { preloadSmogonSet, smogonReady } = useBattle()
  const { session } = useAuth()
  const p = slot.pokemon

  const [showSavePreset, setShowSavePreset] = useState(false)
  const [showPresets,    setShowPresets]    = useState(false)
  const [showAuthModal,  setShowAuthModal]  = useState(false)
  const [pendingAction,  setPendingAction]  = useState<null | 'save' | 'presets'>(null)

  useEffect(() => {
    if (!session || !pendingAction) return
    if (pendingAction === 'save')    setShowSavePreset(true)
    if (pendingAction === 'presets') setShowPresets(true)
    setPendingAction(null)
  }, [session, pendingAction])

  function triggerPreset(action: 'save' | 'presets') {
    if (!session) { setPendingAction(action); setShowAuthModal(true) }
    else if (action === 'save')    setShowSavePreset(true)
    else                           setShowPresets(true)
  }

  function loadPreset(preset: RivalPreset) {
    onChange({
      ...slot,
      ability:  preset.ability,
      item:     preset.item,
      itemSlug: preset.item_slug,
      nature:   preset.nature,
      sp:       preset.sp_spread,
      moves:    [...preset.moves, '', '', '', ''].slice(0, 4),
    })
  }

  // Mega form: active when item is a mega stone
  const megaForm = p && slot.itemSlug ? getMegaForm(p, slot.itemSlug, ALL_POKEMON_ALL) : null
  const isMega   = megaForm !== null
  const isZA     = isMega && isZAMegaStone(slot.itemSlug ?? '')

  // Active display: use mega form data when applicable
  const activeTypes     = isMega ? megaForm!.types     : p?.types ?? []
  const activeAbilities = isMega ? megaForm!.abilities : p?.abilities ?? []
  const activeBaseStats = isMega ? megaForm!.baseStats : p?.baseStats
  const activeSprite    = isMega ? megaForm!.sprites.normal : p?.sprites.normal
  const baseFallbackSprite = p?.sprites.normal ?? null

  function update(patch: Partial<MySlot>) {
    onChange({ ...slot, ...patch })
  }

  function loadSmogonSet() {
    if (!p) return
    const set = preloadSmogonSet(p)
    if (!set) { alert(t('teamEditor.noSet')); return }
    onChange({
      ...slot,
      item:     set.item,
      itemSlug: set.itemSlug,
      ability:  set.ability,
      nature:   set.nature,
      sp:       set.sp,
      moves:    set.moves,
    })
  }

  const totalSP = Object.values(slot.sp).reduce((a, b) => a + b, 0)

  // ── Pokémon options
  const pokemonOptions = useMemo(() => buildPokemonOptions(lang), [lang])

  // ── Item options
  // Ocultar piedras mega individuales; mostrar "Megaevolución" solo si el Pokémon puede mega-evolucionar
  const itemOptions: SelectOption[] = useMemo(() => {
    const canMega = p ? hasMegaAvailable(p) : false
    return ALL_ITEMS
      .filter(it => {
        // Filtrar todas las piedras mega individuales
        if (ALL_MEGA_STONE_SLUGS.has(it.nameApi)) return false
        // Filtrar megaevolucion si el Pokémon no puede mega-evolucionar
        if (it.nameApi === MEGA_EVOLUCION_SLUG && !canMega) return false
        return true
      })
      .map(it => ({
        value:    it.nameApi,
        label:    itemLabel(it, lang),
        sublabel: it.nameApi === MEGA_EVOLUCION_SLUG
          ? '◆ Activa Mega Evolución en combate'
          : it.nameEn !== itemLabel(it, lang) ? it.nameEn : undefined,
        icon:     it.nameApi === MEGA_EVOLUCION_SLUG
          ? <img src="/assets/items/megaevolution.jpg" alt="Mega" width={28} height={28} className="object-contain" />
          : <ItemSprite slug={it.nameApi} size={28} />,
      }))
  }, [lang, p])

  // ── Nature options
  const natureOptions: SelectOption[] = useMemo(() =>
    Object.entries(NATURES_DB).map(([key]) => ({
      value:    key,
      label:    natureLabel(key, lang),
      sublabel: natureSublabel(key),
    })), [lang]
  )

  // ── Real-time base stats (sin boosts/status, solo SP + naturaleza)
  // Uses mega base stats when a mega stone is equipped
  const liveStats = useMemo(() => {
    if (!p) return null
    const bs = activeBaseStats ?? p.baseStats
    return {
      hp:    calcBaseStat(bs.hp,    slot.sp.hp,    'hp',    slot.nature, true),
      atk:   calcBaseStat(bs.atk,   slot.sp.atk,   'atk',   slot.nature, false),
      def:   calcBaseStat(bs.def,   slot.sp.def,   'def',   slot.nature, false),
      spAtk: calcBaseStat(bs.spAtk, slot.sp.spAtk, 'spAtk', slot.nature, false),
      spDef: calcBaseStat(bs.spDef, slot.sp.spDef, 'spDef', slot.nature, false),
      spe:   calcBaseStat(bs.spe,   slot.sp.spe,   'spe',   slot.nature, false),
    }
  }, [p, slot.sp, slot.nature, activeBaseStats])

  const currentNature = NATURES_DB[slot.nature]

  return (
    <div className="bg-bg-secondary rounded p-4 space-y-5" style={{ border: '2px solid #ff2244' }}>

      {/* Cabecera del slot */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 flex items-center justify-center shrink-0 relative rounded"
          style={isZA
            ? { background: '#1a2a1a', border: '2px solid #44ff88' }
            : isMega
            ? { background: '#2a1a4a', border: '2px solid #cc88ff' }
            : { background: '#181818', border: '1px solid #242424' }}>
          {activeSprite
            ? <img src={activeSprite} alt="" className="w-12 h-12 object-contain"
                style={{ imageRendering:'pixelated' }}
                onError={isZA && baseFallbackSprite ? (e) => { (e.target as HTMLImageElement).src = baseFallbackSprite } : undefined} />
            : <span className="font-mono text-2xl text-text-muted">{slotIdx + 1}</span>
          }
          {isMega && (
            <span className="absolute -top-1.5 -right-1.5 text-bg-primary text-[9px] font-black px-1 py-0.5 leading-none"
              style={{ background: isZA ? '#44ff88' : '#cc88ff', borderRadius: '50%' }}>
              {isZA ? 'ZA' : 'M'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {p ? (
            <>
              <p className="font-sans text-text-primary text-[9px] uppercase flex items-center gap-1.5">
                {lang === 'ja' ? p.name.ja : lang === 'es' ? p.name.es : p.name.en}
                {isMega && (
                  <span className="font-sans text-[8px] font-black" style={{ color: isZA ? '#44ff88' : '#cc88ff' }}>{isZA ? 'Z-A' : 'MEGA'}</span>
                )}
              </p>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {activeTypes.map(tp => <TypeBadge key={tp} type={tp} />)}
              </div>
              {slot.itemSlug && (
                <div className="flex items-center gap-1.5 mt-1">
                  <ItemSprite slug={slot.itemSlug} size={16} />
                  <span className="font-mono text-text-muted text-xs normal-case">{slugToItemName(slot.itemSlug, lang)}</span>
                </div>
              )}
            </>
          ) : (
            <p className="font-mono text-text-muted text-[9px] normal-case">{t('teamEditor.slotEmpty')}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={onCollapse}
            className="w-10 h-10 rounded bg-bg-elevated font-mono text-sm
                       flex items-center justify-center active:bg-bg-highlight"
            style={{ border: '1px solid #4fc3f7', color: '#4fc3f7' }}>
            ▲
          </button>
          {p && (
            <button onClick={() => onChange(emptyMySlot())}
              className="w-10 h-10 rounded bg-bg-elevated font-mono text-sm
                         flex items-center justify-center active:bg-bg-highlight"
              style={{ border: '1px solid #242424', color: '#999999' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Selector de Pokémon ── */}
      <div className="space-y-1">
        <p className="text-text-muted text-xs font-bold uppercase tracking-wide">{t('teamEditor.pokemon')}</p>
        <SearchableSelect
          options={pokemonOptions}
          value={p ? String(p.id) : ''}
          onChange={(_, opt) => {
            const found = ALL_POKEMON.find(pk => String(pk.id) === opt.value)
            if (found) onChange({ ...emptyMySlot(), pokemon: found })
          }}
          placeholder={t('teamEditor.searchPokemon')}
          emptyLabel={t('teamEditor.pokemon')}
          onSearch={q => {
            if (!q.trim()) return pokemonOptions.slice(0, 30)
            const lower = q.toLowerCase()
            return pokemonOptions.filter(o =>
              o.label.toLowerCase().includes(lower) ||
              ALL_POKEMON.find(pk => String(pk.id) === o.value)?.name.en.toLowerCase().includes(lower)
            ).slice(0, 20)
          }}
        />
      </div>

      {p && (
        <>
          {/* ── Set competitivo ── */}
          <button
            onClick={loadSmogonSet}
            disabled={!smogonReady}
            className="w-full py-3.5 rounded font-sans text-[8px] uppercase
                       disabled:opacity-40 transition-colors min-h-[56px]"
            style={{ border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa',
                     boxShadow: '3px 3px 0 #004488' }}
          >
            {smogonReady ? t('teamEditor.loadSet') : t('teamEditor.loadingSets')}
          </button>

          {/* ── Presets ── */}
          <div className="flex gap-2">
            <button onClick={() => triggerPreset('presets')}
              className="flex-1 py-3 rounded font-sans text-[8px] uppercase transition-colors min-h-[44px]"
              style={{ border: '1px solid #4fc3f7', color: '#4fc3f7', background: '#181818' }}>
              {t('teamEditor.myPresets')}
            </button>
            <button onClick={() => triggerPreset('save')}
              className="flex-1 py-3 rounded font-sans text-[8px] uppercase transition-colors min-h-[44px]"
              style={{ border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#080808',
                       boxShadow: '3px 3px 0 #004488' }}>
              {t('teamEditor.savePreset')}
            </button>
          </div>

          {/* ── Objeto ── */}
          <div className="space-y-1">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('teamEditor.item')}</p>
            <SearchableSelect
              options={itemOptions}
              value={slot.itemSlug}
              onChange={(apiName, opt) => {
                update({ item: opt.label, itemSlug: apiName })
              }}
              emptyLabel={t('teamEditor.noItem')}
              renderTrigger={opt => (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {opt
                    ? <>
                        <ItemSprite slug={opt.value} size={28} />
                        <span className="text-text-primary text-sm font-semibold truncate">{opt.label}</span>
                      </>
                    : <span className="text-text-muted text-sm">{t('teamEditor.noItem')}</span>
                  }
                </div>
              )}
            />
          </div>

          {/* ── Habilidad ── */}
          <div className="space-y-2">
            <p className="font-sans text-[8px] uppercase text-text-muted">
              {t('teamEditor.ability')}{isMega && <span className="ml-1.5" style={{ color: '#cc88ff' }}>(MEGA)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeAbilities.map(a => {
                const isActive = slot.ability === a.name || slot.ability.replace(/-/g,'') === a.name.replace(/-/g,'')
                return (
                  <button key={a.name}
                    onClick={() => update({ ability: a.name })}
                    className="px-4 py-3 rounded font-mono text-xs min-h-[48px] transition-colors flex-1 normal-case"
                    style={isActive
                      ? isMega
                        ? { border: '2px solid #cc88ff', color: '#cc88ff', background: '#2a1a4a' }
                        : { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' }
                      : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}>
                    {getAbilityName(a.name, lang)}
                    {a.hidden && <span className="ml-1 opacity-60 text-[9px]">★</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Naturaleza ── */}
          <div className="space-y-1">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('teamEditor.nature')}</p>
            <SearchableSelect
              options={natureOptions}
              value={slot.nature}
              onChange={v => update({ nature: v })}
              placeholder={t('teamEditor.nature')}
              emptyLabel={t('teamEditor.nature')}
            />
          </div>

          {/* ── SP sliders con stats en tiempo real ── */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-sans text-[8px] uppercase text-text-muted">{t('teamEditor.statPoints')}</p>
              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-lg
                ${totalSP > 66  ? 'bg-debuff/20 text-debuff'
                : totalSP === 66 ? 'bg-boost/20 text-boost'
                : 'bg-bg-elevated text-text-secondary'}`}>
                {totalSP}/66
              </span>
            </div>

            {SP_KEYS.map(({ key, isHP }) => {
              const val  = slot.sp[key]
              const stat = liveStats?.[key] ?? 0
              const isUp   = !isHP && currentNature?.up   === key
              const isDown = !isHP && currentNature?.down === key
              return (
                <div key={key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono font-bold w-9
                      ${isUp ? 'text-boost' : isDown ? 'text-debuff' : 'text-text-muted'}`}>
                      {t(`stats.${key}`)}{isUp ? '↑' : isDown ? '↓' : ''}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-secondary w-6 text-right">{val}</span>
                      {stat > 0 && (
                        <span className={`text-sm font-mono font-bold w-12 text-right
                          ${isUp ? 'text-boost' : isDown ? 'text-debuff' : 'text-text-primary'}`}>
                          → {stat}
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={32} value={val}
                    onChange={e => update({ sp: { ...slot.sp, [key]: +e.target.value } })}
                    className="w-full h-2 cursor-pointer"
                    style={{ accentColor: isUp ? '#00ff88' : isDown ? '#ff4466' : '#00d4ff' }}
                  />
                </div>
              )
            })}
          </div>

          {/* ── Moves ── */}
          <div className="space-y-2">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('teamEditor.moves')}</p>
            {[0,1,2,3].map(i => (
              <MoveSearchSelect
                key={i}
                value={slot.moves[i] ?? ''}
                onChange={v => {
                  const moves = [...(slot.moves.length >= 4 ? slot.moves : Array(4).fill('').map((_, j) => slot.moves[j] ?? ''))]
                  moves[i] = v
                  update({ moves })
                }}
                lang={lang}
                placeholder={t('battleScreen.moveSlot', { n: i + 1 })}
              />
            ))}
          </div>
        </>
      )}

      {p && showSavePreset && (
        <SavePresetSheet
          pokemonId={p.id}
          ability={slot.ability} item={slot.item} itemSlug={slot.itemSlug ?? ''}
          nature={slot.nature} sp={slot.sp} moves={slot.moves}
          onClose={() => setShowSavePreset(false)}
        />
      )}
      {p && showPresets && (
        <PresetsSheet
          pokemonId={p.id}
          onLoad={loadPreset}
          onClose={() => setShowPresets(false)}
        />
      )}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  )
}

// ── Pokepaste Parser ──────────────────────────────────────────────────────────

interface ParsedSlot {
  pokemonName: string   // English name
  item:        string   // English name or ''
  ability:     string   // English name or ''
  nature:      string   // e.g. 'Timid'
  evs:         { hp:number; atk:number; def:number; spAtk:number; spDef:number; spe:number }
  moves:       string[] // English move names, up to 4
}

function parsePokepaste(text: string): ParsedSlot[] {
  const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim())
  const results: ParsedSlot[] = []

  for (const block of blocks.slice(0, 6)) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    // First line: "Name (nickname) @ Item" or "Name @ Item" or just "Name"
    const firstLine = lines[0]
    let pokemonName = firstLine
    let item = ''

    if (firstLine.includes('@')) {
      const [namePart, itemPart] = firstLine.split('@').map(s => s.trim())
      item = itemPart ?? ''
      // Remove nickname in parentheses: "Pikachu (Pika)" → "Pikachu"
      pokemonName = namePart.replace(/\s*\([^)]+\)/, '').trim()
    } else {
      pokemonName = firstLine.replace(/\s*\([^)]+\)/, '').trim()
    }

    // Remove gender indicator
    pokemonName = pokemonName.replace(/\s*\(M\)$|\s*\(F\)$/, '').trim()

    let ability = ''
    let nature  = 'Hardy'
    const evs   = { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 }
    const moves: string[] = []

    for (const line of lines.slice(1)) {
      if (line.startsWith('Ability:')) {
        ability = line.replace('Ability:', '').trim()
      } else if (line.match(/^EVs:/i)) {
        const evPart = line.replace(/^EVs:/i, '').trim()
        for (const chunk of evPart.split('/')) {
          const m = chunk.trim().match(/^(\d+)\s+(.+)$/)
          if (!m) continue
          const val = parseInt(m[1])
          const stat = m[2].trim().toLowerCase()
          if (stat === 'hp')             evs.hp    = val
          else if (stat === 'atk')       evs.atk   = val
          else if (stat === 'def')       evs.def   = val
          else if (stat === 'spa' || stat === 'spatk' || stat === 'sp. atk') evs.spAtk = val
          else if (stat === 'spd' || stat === 'spdef' || stat === 'sp. def') evs.spDef = val
          else if (stat === 'spe')       evs.spe   = val
        }
      } else if (line.match(/\bNature$/i)) {
        nature = line.replace(/\s*Nature$/i, '').trim()
      } else if (line.startsWith('-')) {
        const moveName = line.replace(/^-\s*/, '').trim()
        if (moveName && moves.length < 4) moves.push(moveName)
      }
    }

    results.push({ pokemonName, item, ability, nature, evs, moves })
  }
  return results
}

function evToSp(ev: number): number {
  return Math.min(32, Math.round(ev / 8))
}

// ── Pokepaste Modal ───────────────────────────────────────────────────────────

function PokepasteModal({
  onClose,
  onImport,
}: {
  onClose: () => void
  onImport: (slots: MySlot[]) => void
}) {
  const { t } = useTranslation()
  const [text,  setText]  = useState('')
  const [error, setError] = useState('')

  function handleImport() {
    setError('')
    const parsed = parsePokepaste(text)
    if (!parsed.length) {
      setError(t('teams.pasteError'))
      return
    }

    const slots: MySlot[] = parsed.map(p => {
      // Find Pokémon by English name (case-insensitive)
      const pokemon = ALL_POKEMON.find(pk =>
        pk.name.en.toLowerCase() === p.pokemonName.toLowerCase() ||
        pk.name.es.toLowerCase() === p.pokemonName.toLowerCase()
      ) ?? null

      // Find item by English name
      const itemEntry = ALL_ITEMS.find(it =>
        it.nameEn.toLowerCase() === p.item.toLowerCase()
      )
      const itemSlug    = itemEntry?.nameApi ?? ''
      const itemDisplay = itemEntry?.nameEs  ?? p.item

      // Find ability slug (convert "Rough Skin" → "rough-skin")
      const abilitySlug = p.ability.toLowerCase().replace(/\s+/g, '-')

      const sp = {
        hp:    evToSp(p.evs.hp),
        atk:   evToSp(p.evs.atk),
        def:   evToSp(p.evs.def),
        spAtk: evToSp(p.evs.spAtk),
        spDef: evToSp(p.evs.spDef),
        spe:   evToSp(p.evs.spe),
      }

      return {
        ...emptyMySlot(),
        pokemon,
        item:     itemDisplay,
        itemSlug,
        ability:  abilitySlug,
        nature:   p.nature || 'Hardy',
        sp,
        moves:    p.moves,
      }
    })

    onImport(slots)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary max-h-[80vh] flex flex-col p-4 gap-4 animate-slide-up"
        style={{ borderTop: '2px solid #ff2244' }}>

        {/* Handle */}
        <div className="w-10 h-1 bg-bg-highlight mx-auto" />

        <div className="flex items-center justify-between">
          <p className="font-sans text-text-primary text-[9px] uppercase">{t('teamEditor.importPaste')}</p>
          <button onClick={onClose} className="font-mono text-text-muted text-xl p-1">✕</button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={"Pikachu @ Light Ball\nAbility: Static\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Thunderbolt\n- Surf\n- Dazzling Gleam\n- Hidden Power Fire"}
          className="flex-1 min-h-[220px] resize-none bg-bg-elevated p-3 text-text-primary
                     text-xs font-mono leading-relaxed placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }}
        />

        {error && (
          <p className="font-mono text-debuff text-[9px] text-center normal-case">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase active:bg-bg-highlight transition-colors"
            style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}
          >
            {t('teams.cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase disabled:opacity-40 transition-colors"
            style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                     boxShadow: '3px 3px 0 #cc1133' }}
          >
            {t('teams.importBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla principal ─────────────────────────────────────────────────────────

export default function TeamEditorScreen() {
  const navigate          = useNavigate()
  const { t, i18n }       = useTranslation()
  const lang              = i18n.language
  const { mySlots, updateMySlot, setMySlots, saveTeam } = useBattle()
  const [saveState,       setSaveState]       = useState<'idle' | 'saving' | 'ok' | 'err'>('idle')
  const [saveMsg,         setSaveMsg]         = useState('')
  const [showPokepaste,   setShowPokepaste]   = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { session } = useAuth()
  const [showLoginSheet, setShowLoginSheet] = useState(false)
  // Track which slots are expanded (default: all collapsed if slot has pokemon, expanded if empty)
  const [expanded, setExpanded] = useState<boolean[]>(() =>
    Array(6).fill(false)
  )

  function collapse(i: number) {
    setExpanded(prev => prev.map((v, j) => j === i ? false : v))
  }
  function expand(i: number) {
    setExpanded(prev => prev.map((v, j) => j === i ? true : v))
  }

  async function handleSave() {
    if (!session) {
      setShowLoginSheet(true)
      return
    }
    setSaveState('saving')
    const result = await saveTeam()
    setSaveState(result.ok ? 'ok' : 'err')
    setSaveMsg(result.msg)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveState('idle'), 2500)
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">

      {/* Header con botón guardar sticky */}
      <header className="flex items-center gap-3 px-4 py-3 shrink-0 bg-bg-primary sticky top-0 z-10"
        style={{ borderBottom: '2px solid #ff2244' }}>
        <button onClick={() => navigate('/teams')}
          className="font-mono text-text-muted text-xl p-1 min-w-[44px]">←</button>
        <h1 className="font-sans text-text-primary text-[9px] uppercase flex-1">{t('teamEditor.title')}</h1>
        <button
          onClick={() => setShowPokepaste(true)}
          className="px-3 py-2.5 rounded font-sans text-[8px] uppercase min-h-[44px] transition-colors mr-1"
          style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                   boxShadow: '2px 2px 0 #cc1133' }}
        >
          {t('teamEditor.importPaste')}
        </button>
        <button
          onClick={handleSave}
          disabled={saveState === 'saving'}
          className="px-4 py-2.5 rounded font-sans text-[8px] uppercase min-h-[44px] min-w-[100px]
                     transition-all disabled:opacity-50"
          style={saveState === 'ok'
            ? { border: '2px solid #00ff88', color: '#00ff88', background: 'rgba(0,255,136,0.1)' }
            : saveState === 'err'
            ? { border: '2px solid #ff2244', color: '#ff2244', background: 'rgba(255,34,68,0.1)' }
            : saveState === 'saving'
            ? { border: '1px solid #242424', color: '#999999', background: '#181818' }
            : { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa', boxShadow: '2px 2px 0 #004488' }}>
          {saveState === 'ok'    ? t('teamEditor.saved')
           : saveState === 'err'    ? t('teamEditor.saveErr')
           : saveState === 'saving' ? t('teamEditor.saving')
           : t('teamEditor.save')}
        </button>
      </header>

      {/* Mensaje de estado del guardado */}
      {saveState !== 'idle' && saveState !== 'saving' && saveMsg && (
        <div className={`px-4 py-2 font-mono text-[9px] text-center normal-case
          ${saveState === 'ok' ? 'bg-boost/10 text-boost' : 'bg-debuff/10 text-debuff'}`}>
          {saveMsg}
        </div>
      )}

      {/* Lista de slots */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {mySlots.map((slot, i) => {
          const megaForm   = slot.pokemon && slot.itemSlug
            ? getMegaForm(slot.pokemon, slot.itemSlug, ALL_POKEMON_ALL) : null
          const isMega     = megaForm !== null
          const isZA       = isMega && isZAMegaStone(slot.itemSlug ?? '')
          const activeTypes  = isMega ? megaForm!.types : slot.pokemon?.types ?? []
          const activeSprite = isMega ? megaForm!.sprites.normal : slot.pokemon?.sprites.normal ?? null
          const baseFallback = slot.pokemon?.sprites.normal ?? null

          return expanded[i] ? (
            <SlotEditor key={i} slot={slot} slotIdx={i} lang={lang}
              onChange={s => updateMySlot(i, s)}
              onCollapse={() => collapse(i)} />
          ) : (
            <SlotSummary key={i} slot={slot} slotIdx={i} lang={lang}
              isMega={isMega} isZA={isZA} activeTypes={activeTypes} activeSprite={activeSprite}
              baseFallbackSprite={baseFallback}
              onExpand={() => expand(i)} />
          )
        })}
        <div className="h-2" />
      </div>

      {/* Ad banner above footer */}
      <div className="px-4 py-2 shrink-0" style={{ borderTop: '1px solid #181818' }}>
        <AdBanner className="w-full" />
      </div>

      <PixelNav />

      {/* Pokepaste import modal */}
      {showPokepaste && (
        <PokepasteModal
          onClose={() => setShowPokepaste(false)}
          onImport={slots => {
            const padded = slots.concat(
              Array.from({ length: Math.max(0, 6 - slots.length) }, emptyMySlot)
            )
            setMySlots(padded)
            setExpanded(Array(6).fill(false))
          }}
        />
      )}

      {showLoginSheet && (
        <AuthModal onClose={() => setShowLoginSheet(false)} />
      )}
    </div>
  )
}
