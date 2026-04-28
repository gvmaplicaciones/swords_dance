// src/screens/OneVsOneScreen.tsx
// Modo 1v1 rápido — pantalla partida, buscador libre para ambos lados + editor completo de set

import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle, type MySlot, emptyRivalSlot } from '../store/BattleContext'
import type { PokemonData } from '../types/pokemon'
import type { SmogonSet } from '../lib/smogon'
import type { SPSpread } from '../lib/statCalc'
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import naturesData from '../i18n/natures.json'
import { searchMoves, getMoveData } from '../lib/moveDb'
import { calcBaseStat } from '../lib/statCalc'
import { createDefaultBattleState } from '../lib/battleState'
import { SearchableSelect, type SelectOption } from '../components/SearchableSelect'
import { getAbilityName } from '../lib/abilities'
import PixelNav from '../components/PixelNav'
import { useAuth } from '../hooks/useAuth'
import AuthModal from '../components/AuthModal'
import { saveRivalPreset, loadRivalPresets, deleteRivalPreset, type RivalPreset } from '../lib/rivalPresetsDb'

const ALL_POKEMON = (pokemonData as PokemonData[]).filter(p => !p.isMega)

type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ALL_ITEMS = itemsData as ItemEntry[]

const NATURES_DB = naturesData as Record<string, {
  en: string; es: string; ja: string; up: string | null; down: string | null
}>

const STAT_DISPLAY: Record<string, string> = {
  atk: 'ATK', def: 'DEF', spAtk: 'SpA', spDef: 'SpD', spe: 'SPE',
}

const SP_KEYS: { key: keyof SPSpread; isHP: boolean }[] = [
  { key: 'hp',    isHP: true  },
  { key: 'atk',   isHP: false },
  { key: 'def',   isHP: false },
  { key: 'spAtk', isHP: false },
  { key: 'spDef', isHP: false },
  { key: 'spe',   isHP: false },
]

// ── LocalSet ──────────────────────────────────────────────────────────────────

interface LocalSet {
  ability:  string
  item:     string
  itemSlug: string
  nature:   string
  sp:       SPSpread
  moves:    string[]
}

function defaultSet(): LocalSet {
  return {
    ability: '', item: '', itemSlug: '', nature: 'Hardy',
    sp: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 },
    moves: ['', '', '', ''],
  }
}

function fromSmogonSet(s: SmogonSet): LocalSet {
  return {
    ability:  s.ability,
    item:     s.item,
    itemSlug: s.itemSlug,
    nature:   s.nature,
    sp:       s.sp,
    moves:    [...s.moves, '', '', '', ''].slice(0, 4),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pokeName(p: PokemonData, lang: string): string {
  return lang === 'ja' ? p.name.ja : lang === 'en' ? p.name.en : p.name.es
}

function natLabel(key: string, lang: string): string {
  const n = (naturesData as Record<string, { es: string; en: string; ja: string }>)[key]
  return n ? (lang === 'ja' ? n.ja : lang === 'en' ? n.en : n.es) : key
}

function itemDisplayName(it: ItemEntry, lang: string): string {
  return lang === 'es' ? it.nameEs : it.nameEn
}

function moveDisplayName(m: ReturnType<typeof getMoveData>, lang: string): string {
  if (!m) return ''
  return lang === 'ja' ? (m.nameJa || m.nameEn) : lang === 'en' ? m.nameEn : (m.nameEs || m.nameEn)
}

function slugToItemName(slug: string, lang: string): string {
  if (!slug) return ''
  const it = ALL_ITEMS.find(i => i.nameApi === slug)
  return it ? itemDisplayName(it, lang) : slug
}

function searchPokemon(query: string, lang: string): PokemonData[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, '')
  const hasLatin = q.length > 0
  return ALL_POKEMON.filter(p => {
    const en = p.name.en.toLowerCase().replace(/[^a-z0-9]/g, '')
    const es = p.name.es.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (lang === 'ja') {
      if (!hasLatin) return p.name.ja.includes(query.trim())
      return p.name.ja.includes(query.trim()) || en.startsWith(q) || en.includes(q)
    }
    return en.startsWith(q) || es.startsWith(q) || en.includes(q) || es.includes(q)
  }).slice(0, 20)
}

function natureSublabel(key: string): string {
  const n = NATURES_DB[key]
  if (!n || (!n.up && !n.down)) return 'Neutral'
  return `↑${STAT_DISPLAY[n.up!] ?? n.up} ↓${STAT_DISPLAY[n.down!] ?? n.down}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ItemSprite({ slug, size = 28 }: { slug: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (!slug || err) return null
  return (
    <img src={`/assets/items/${slug}.png`} alt="" onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }} />
  )
}

function MoveSelect({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const options = useMemo<SelectOption[]>(
    () => searchMoves('', lang, 500).map(m => ({
      value:    m.nameEn,
      label:    moveDisplayName(m, lang) || m.nameEn,
      sublabel: `${m.power > 0 ? m.power : '—'} · ${m.type}`,
    })), [lang]
  )

  function handleSearch(q: string): SelectOption[] {
    if (!q.trim()) return []
    return searchMoves(q, lang, 60).map(m => ({
      value:    m.nameEn,
      label:    moveDisplayName(m, lang) || m.nameEn,
      sublabel: `${m.power > 0 ? m.power : '—'} · ${m.type}`,
    }))
  }

  function renderTrigger(_opt: SelectOption | null) {
    if (!value) return <span className="text-text-muted text-sm flex-1">{placeholder ?? t('oneVsOne.movePlaceholder')}</span>
    const m = getMoveData(value)
    if (!m) return <span className="text-text-primary text-sm flex-1 truncate">{value}</span>
    return (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-text-primary text-sm font-semibold truncate flex-1">{moveDisplayName(m, lang) || value}</span>
        {m.power > 0 && <span className="text-text-muted text-xs shrink-0">{m.power}</span>}
      </div>
    )
  }

  return (
    <SearchableSelect
      options={options} value={value} onChange={onChange}
      placeholder={t('oneVsOne.searchMove')} emptyLabel={placeholder ?? t('oneVsOne.movePlaceholder')}
      onSearch={handleSearch} renderTrigger={renderTrigger}
    />
  )
}

function MiniCard({ pokemon, set, accent, onClear, onEdit }: {
  pokemon: PokemonData; set: LocalSet; accent: string
  onClear: () => void; onEdit: () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const filledMoves = set.moves.filter(Boolean)
  const typesStr = pokemon.types.map(tp => t(`types.${tp}`, tp)).join(' / ')
  const natureStr = natLabel(set.nature, lang)
  const itemStr = slugToItemName(set.itemSlug, lang) || set.item
  return (
    <div className="flex-1 px-3 py-2 flex flex-col gap-2 overflow-hidden">
      <div className="flex items-center gap-2">
        <img src={pokemon.sprites.normal ?? ''} alt={pokeName(pokemon, lang)}
          className="w-10 h-10 object-contain shrink-0" style={{ imageRendering: 'pixelated' }} />
        <div className="flex-1 min-w-0">
          <p className="font-sans text-[9px] uppercase text-text-primary leading-none">{pokeName(pokemon, lang)}</p>
          <p className="font-mono text-[8px] text-text-muted normal-case">{typesStr}</p>
          {(itemStr || set.nature !== 'Hardy') && (
            <p className="font-mono text-[8px] text-text-muted normal-case">
              {itemStr || '—'} · {natureStr}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit}
            className="font-sans text-[8px] uppercase px-2 py-1 rounded min-h-[36px]"
            style={{ border: `1px solid ${accent}`, color: accent }}>
            {t('oneVsOne.editBtn')}
          </button>
          <button onClick={onClear}
            className="font-sans text-[8px] uppercase px-2 py-1 rounded min-h-[36px]"
            style={{ border: '1px solid #444', color: '#888' }}>
            {t('oneVsOne.clearBtn')}
          </button>
        </div>
      </div>
      {filledMoves.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {filledMoves.slice(0, 4).map((m, i) => {
            const data = getMoveData(m)
            return (
              <div key={i} className="flex items-center justify-between bg-bg-elevated px-2 py-1 rounded"
                style={{ border: '1px solid #181818' }}>
                <span className="font-mono text-[8px] text-text-secondary truncate normal-case">
                  {data ? moveDisplayName(data, lang) : m}
                </span>
                {data?.power && data.power > 0 && (
                  <span className="font-mono text-[8px] text-text-muted shrink-0 ml-1">{data.power}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Save Preset Sheet ─────────────────────────────────────────────────────────

function SavePresetSheet({ pokemonId, ability, item, itemSlug, nature, sp, moves, accent, onClose }: {
  pokemonId: number; ability: string; item: string; itemSlug: string
  nature: string; sp: SPSpread; moves: string[]; accent: string; onClose: () => void
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
      moves: moves.filter(Boolean),
      note,
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col p-4 gap-3 animate-slide-up"
        style={{ borderTop: `2px solid ${accent}` }}>
        <div className="w-10 h-1 bg-bg-highlight mx-auto" />
        <p className="font-sans text-text-primary text-[9px] uppercase">{t('oneVsOne.savePresetTitle')}</p>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder={t('oneVsOne.presetName')} maxLength={40}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }} />
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={t('oneVsOne.presetNote')} maxLength={80}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }} />
        {error && <p className="font-mono text-debuff text-[9px] normal-case">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded font-sans text-[8px] uppercase"
            style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}>
            {t('oneVsOne.cancel')}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase disabled:opacity-50"
            style={{ border: `2px solid ${accent}`, color: accent, background: '#080808',
                     boxShadow: `3px 3px 0 ${accent}88` }}>
            {saving ? '...' : t('oneVsOne.saveBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Presets Sheet ─────────────────────────────────────────────────────────────

function PresetsSheet({ pokemonId, accent, onLoad, onClose }: {
  pokemonId: number; accent: string; onLoad: (p: RivalPreset) => void; onClose: () => void
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
    <div className="absolute inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
        style={{ maxHeight: '70vh', borderTop: `2px solid ${accent}` }}>
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #181818' }}>
          <p className="font-sans text-text-primary text-[9px] uppercase">{t('oneVsOne.myPresets')}</p>
          <button onClick={onClose} className="font-mono text-text-muted text-xl p-1">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {loading ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case animate-pulse">
              {t('oneVsOne.loading')}
            </p>
          ) : presets.length === 0 ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
              {t('oneVsOne.noPresetsForPoke')}
            </p>
          ) : presets.map(preset => {
            const natStr   = natLabel(preset.nature, lang)
            const movesStr = preset.moves.filter(Boolean).map(m => {
              const data = getMoveData(m)
              return data ? moveDisplayName(data, lang) : m
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

// ── Set Editor ────────────────────────────────────────────────────────────────

function SetEditor({ pokemon, set, onChange, onClose, accent, pokemonId }: {
  pokemon: PokemonData; set: LocalSet
  onChange: (s: LocalSet) => void; onClose: () => void; accent: string
  isRival?: boolean; pokemonId?: number
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { preloadSmogonSet, smogonReady } = useBattle()
  const { session } = useAuth()

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
      ability:  preset.ability,
      item:     preset.item,
      itemSlug: preset.item_slug,
      nature:   preset.nature,
      sp:       preset.sp_spread,
      moves:    [...preset.moves, '', '', '', ''].slice(0, 4),
    })
  }

  const itemOptions = useMemo<SelectOption[]>(() =>
    ALL_ITEMS.map(it => ({
      value: it.nameApi,
      label: itemDisplayName(it, lang),
      icon:  <ItemSprite slug={it.nameApi} size={28} />,
    })), [lang]
  )

  const natureOptions = useMemo<SelectOption[]>(() =>
    Object.entries(NATURES_DB).map(([key]) => ({
      value:    key,
      label:    natLabel(key, lang),
      sublabel: natureSublabel(key),
    })), [lang]
  )

  const liveStats = useMemo(() => {
    const bs = pokemon.baseStats
    return {
      hp:    calcBaseStat(bs.hp,    set.sp.hp,    'hp',    set.nature, true),
      atk:   calcBaseStat(bs.atk,   set.sp.atk,   'atk',   set.nature, false),
      def:   calcBaseStat(bs.def,   set.sp.def,   'def',   set.nature, false),
      spAtk: calcBaseStat(bs.spAtk, set.sp.spAtk, 'spAtk', set.nature, false),
      spDef: calcBaseStat(bs.spDef, set.sp.spDef, 'spDef', set.nature, false),
      spe:   calcBaseStat(bs.spe,   set.sp.spe,   'spe',   set.nature, false),
    }
  }, [pokemon, set.sp, set.nature])

  const currentNature = NATURES_DB[set.nature]
  const totalSP = Object.values(set.sp).reduce((a, b) => a + b, 0)

  function loadSmogon() {
    const s = preloadSmogonSet(pokemon)
    if (s) onChange(fromSmogonSet(s))
  }

  function updateMoves(i: number, v: string) {
    const moves = [...set.moves]
    while (moves.length < 4) moves.push('')
    moves[i] = v
    onChange({ ...set, moves })
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
        style={{ maxHeight: '90vh', borderTop: `2px solid ${accent}` }}>

        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>

        <div className="px-4 pb-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src={pokemon.sprites.normal ?? ''} alt=""
              className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
            <span className="font-sans text-[9px] uppercase text-text-primary">{pokeName(pokemon, lang)}</span>
          </div>
          <button onClick={onClose} className="font-mono text-text-muted text-xl p-1 min-w-[44px] text-right">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">

          <button onClick={loadSmogon} disabled={!smogonReady}
            className="w-full py-3.5 rounded font-sans text-[8px] uppercase
                       disabled:opacity-40 transition-colors min-h-[56px]"
            style={{ border: '2px solid #4fc3f7', color: '#4fc3f7',
                     background: '#0066aa', boxShadow: '3px 3px 0 #004488' }}>
            {smogonReady ? t('oneVsOne.loadSet') : t('oneVsOne.loadingSets')}
          </button>

          {pokemonId !== undefined && (
            <div className="flex gap-2">
              <button onClick={() => triggerPreset('presets')}
                className="flex-1 py-3 rounded font-sans text-[8px] uppercase transition-colors min-h-[44px]"
                style={{ border: `1px solid ${accent}`, color: accent, background: '#181818' }}>
                {t('oneVsOne.myPresets')}
              </button>
              <button onClick={() => triggerPreset('save')}
                className="flex-1 py-3 rounded font-sans text-[8px] uppercase transition-colors min-h-[44px]"
                style={{ border: `2px solid ${accent}`, color: accent, background: '#080808',
                         boxShadow: `3px 3px 0 ${accent}88` }}>
                {t('oneVsOne.savePreset')}
              </button>
            </div>
          )}

          <div className="space-y-1">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('oneVsOne.item')}</p>
            <SearchableSelect
              options={itemOptions} value={set.itemSlug}
              onChange={(apiName, opt) => onChange({ ...set, item: opt.label, itemSlug: apiName })}
              emptyLabel={t('oneVsOne.noItem')}
              renderTrigger={opt => (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {opt
                    ? <><ItemSprite slug={opt.value} size={28} />
                        <span className="text-text-primary text-sm font-semibold truncate">{opt.label}</span></>
                    : <span className="text-text-muted text-sm">{t('oneVsOne.noItem')}</span>}
                </div>
              )}
            />
          </div>

          <div className="space-y-2">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('oneVsOne.ability')}</p>
            <div className="flex flex-wrap gap-2">
              {pokemon.abilities.map(a => {
                const isActive = set.ability === a.name ||
                  set.ability.replace(/-/g, '') === a.name.replace(/-/g, '')
                return (
                  <button key={a.name}
                    onClick={() => onChange({ ...set, ability: a.name })}
                    className="px-4 py-3 rounded font-mono text-xs min-h-[48px] transition-colors flex-1 normal-case"
                    style={isActive
                      ? { border: `2px solid ${accent}`, color: accent, background: '#003344' }
                      : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}>
                    {getAbilityName(a.name, lang)}
                    {a.hidden && <span className="ml-1 opacity-60 text-[9px]">★</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('oneVsOne.nature')}</p>
            <SearchableSelect
              options={natureOptions} value={set.nature}
              onChange={v => onChange({ ...set, nature: v })}
              placeholder={t('oneVsOne.nature')} emptyLabel={t('oneVsOne.nature')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="font-sans text-[8px] uppercase text-text-muted">{t('oneVsOne.statPoints')}</p>
              <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded-lg
                ${totalSP > 66
                  ? 'bg-debuff/20 text-debuff'
                  : totalSP === 66
                  ? 'bg-boost/20 text-boost'
                  : 'bg-bg-elevated text-text-secondary'}`}>
                {totalSP}/66
              </span>
            </div>
            {SP_KEYS.map(({ key, isHP }) => {
              const val  = set.sp[key]
              const stat = liveStats[key]
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
                      <span className={`text-sm font-mono font-bold w-12 text-right
                        ${isUp ? 'text-boost' : isDown ? 'text-debuff' : 'text-text-primary'}`}>
                        → {stat}
                      </span>
                    </div>
                  </div>
                  <input type="range" min={0} max={32} value={val}
                    onChange={e => onChange({ ...set, sp: { ...set.sp, [key]: +e.target.value } })}
                    className="w-full h-2 cursor-pointer"
                    style={{ accentColor: isUp ? '#00ff88' : isDown ? '#ff4466' : '#00d4ff' }}
                  />
                </div>
              )
            })}
          </div>

          <div className="space-y-2">
            <p className="font-sans text-[8px] uppercase text-text-muted">{t('oneVsOne.moves')}</p>
            {[0, 1, 2, 3].map(i => (
              <MoveSelect key={i}
                value={set.moves[i] ?? ''}
                onChange={v => updateMoves(i, v)}
                placeholder={t('battleScreen.moveSlot', { n: i + 1 })}
              />
            ))}
          </div>

        </div>
      </div>

      {pokemonId !== undefined && showSavePreset && (
        <SavePresetSheet
          pokemonId={pokemonId}
          ability={set.ability} item={set.item} itemSlug={set.itemSlug}
          nature={set.nature} sp={set.sp} moves={set.moves.filter(Boolean)}
          accent={accent}
          onClose={() => setShowSavePreset(false)}
        />
      )}
      {pokemonId !== undefined && showPresets && (
        <PresetsSheet
          pokemonId={pokemonId}
          accent={accent}
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

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function OneVsOneScreen() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { mySlots, rivalSlots, setRivalSlots, preloadSmogonSet, updateMySlot } = useBattle()

  const [myPokemon, setMyPokemon] = useState<PokemonData | null>(
    () => mySlots[0]?.pokemon ?? null
  )
  const [mySet, setMySet] = useState<LocalSet>(() => {
    const s = mySlots[0]
    return s?.pokemon
      ? { ability: s.ability, item: s.item, itemSlug: s.itemSlug,
          nature: s.nature, sp: s.sp,
          moves: [...s.moves, '', '', '', ''].slice(0, 4) }
      : defaultSet()
  })
  const [myQuery, setMyQuery] = useState(() =>
    mySlots[0]?.pokemon ? pokeName(mySlots[0].pokemon, lang) : ''
  )

  const [rivalPokemon, setRivalPokemon] = useState<PokemonData | null>(
    () => rivalSlots[0]?.pokemon ?? null
  )
  const [rivalSet, setRivalSet] = useState<LocalSet>(
    () => rivalSlots[0]?.smogonSet ? fromSmogonSet(rivalSlots[0].smogonSet) : defaultSet()
  )
  const [rivalQuery, setRivalQuery] = useState(() =>
    rivalSlots[0]?.pokemon ? pokeName(rivalSlots[0].pokemon, lang) : ''
  )

  const [editing, setEditing] = useState<'my' | 'rival' | null>(null)

  const myResults    = useMemo(() => searchPokemon(myQuery, lang),    [myQuery, lang])
  const rivalResults = useMemo(() => searchPokemon(rivalQuery, lang), [rivalQuery, lang])

  function pickMy(p: PokemonData) {
    setMyPokemon(p)
    setMyQuery(pokeName(p, lang))
    const s = preloadSmogonSet(p)
    setMySet(s ? fromSmogonSet(s) : defaultSet())
  }

  function pickRival(p: PokemonData) {
    setRivalPokemon(p)
    setRivalQuery(pokeName(p, lang))
    const s = preloadSmogonSet(p)
    setRivalSet(s ? fromSmogonSet(s) : defaultSet())
  }

  function clearMy()    { setMyPokemon(null);    setMySet(defaultSet());    setMyQuery('') }
  function clearRival() { setRivalPokemon(null); setRivalSet(defaultSet()); setRivalQuery('') }

  const canGo = myPokemon !== null && rivalPokemon !== null

  function goToVS() {
    if (!myPokemon || !rivalPokemon) return

    updateMySlot(0, {
      pokemon:     myPokemon,
      item:        mySet.item,
      itemSlug:    mySet.itemSlug,
      ability:     mySet.ability,
      nature:      mySet.nature,
      sp:          mySet.sp,
      moves:       mySet.moves,
      battleState: createDefaultBattleState(myPokemon.id),
    } as MySlot)

    const smogonSet: SmogonSet = {
      ability:        rivalSet.ability,
      abilityDisplay: getAbilityName(rivalSet.ability),
      item:           rivalSet.item,
      itemSlug:       rivalSet.itemSlug,
      nature:         rivalSet.nature,
      sp:             rivalSet.sp,
      moves:          rivalSet.moves.filter(Boolean),
      moveUsages:     [1, 1, 1, 1],
      itemUsage:      1,
      abilityUsage:   1,
    }

    const updated = [...rivalSlots]
    updated[0] = { pokemon: rivalPokemon, smogonSet, battleState: createDefaultBattleState(rivalPokemon.id) }
    for (let i = 1; i < updated.length; i++) updated[i] = emptyRivalSlot()
    setRivalSlots(updated)

    navigate('/vs', { state: { myIdx: 0, rivalIdx: 0 } })
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary relative">

      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '2px solid #ff2244' }}>
        <button onClick={() => navigate(-1)} className="font-mono text-text-muted text-xl p-1 min-w-[44px]">←</button>
        <span className="font-sans text-[9px] uppercase"
          style={{ color: '#ff2244', textShadow: '0 0 8px rgba(255,34,68,0.5)' }}>
          {t('oneVsOne.title')}
        </span>
        <div className="w-11" />
      </header>

      <div className="flex-1 flex flex-col overflow-hidden"
        style={{ background: '#04080f', borderBottom: '1px solid #1a3a5a' }}>
        <p className="font-sans text-[8px] uppercase px-3 py-2 shrink-0"
          style={{ color: '#4fc3f7', textShadow: '0 0 6px rgba(79,195,247,0.4)' }}>
          {t('oneVsOne.myPoke')}
        </p>
        {myPokemon ? (
          <MiniCard pokemon={myPokemon} set={mySet} accent="#4fc3f7"
            onClear={clearMy} onEdit={() => setEditing('my')} />
        ) : (
          <div className="flex-1 px-3 pb-2 flex flex-col gap-2 overflow-hidden">
            <input type="text" value={myQuery}
              onChange={e => setMyQuery(e.target.value)}
              placeholder={t('oneVsOne.selectPokemon')}
              className="w-full bg-bg-elevated font-mono text-text-primary text-sm
                         placeholder-text-muted px-4 py-3 focus:outline-none rounded min-h-[48px] shrink-0"
              style={{ border: '2px solid #4fc3f7' }}
            />
            {myResults.length > 0 && (
              <div className="flex-1 overflow-y-auto rounded" style={{ border: '1px solid #1a3a5a' }}>
                {myResults.map(p => (
                  <button key={p.id} onClick={() => pickMy(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                               active:bg-bg-elevated transition-colors min-h-[48px]"
                    style={{ borderBottom: '1px solid #242424' }}>
                    <img src={p.sprites.normal ?? ''} alt={pokeName(p, lang)}
                      className="w-8 h-8 object-contain shrink-0"
                      style={{ imageRendering: 'pixelated' }} />
                    <div>
                      <p className="font-sans text-text-primary text-[9px] uppercase">{pokeName(p, lang)}</p>
                      <p className="font-mono text-text-muted text-[9px] normal-case">
                        {p.types.map(tp => t(`types.${tp}`, tp)).join(' / ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center items-center py-2 bg-bg-primary shrink-0"
        style={{ borderBottom: '1px solid #181818' }}>
        {canGo ? (
          <button onClick={goToVS}
            className="px-8 py-3 font-sans text-[10px] uppercase rounded min-h-[48px]"
            style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                     boxShadow: '3px 3px 0 #cc1133, 0 0 10px rgba(255,34,68,0.35)' }}>
            {t('oneVsOne.goCalc')}
          </button>
        ) : (
          <span className="font-mono text-text-muted text-[9px] text-center px-4 normal-case">
            {!myPokemon && !rivalPokemon
              ? t('oneVsOne.selectBoth')
              : !myPokemon
              ? t('oneVsOne.selectMy')
              : t('oneVsOne.selectRival')}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0404' }}>
        <p className="font-sans text-[8px] uppercase px-3 py-2 shrink-0"
          style={{ color: '#ff2244', textShadow: '0 0 6px rgba(255,34,68,0.4)' }}>
          {t('oneVsOne.rivalPoke')}
        </p>
        {rivalPokemon ? (
          <MiniCard pokemon={rivalPokemon} set={rivalSet} accent="#ff2244"
            onClear={clearRival} onEdit={() => setEditing('rival')} />
        ) : (
          <div className="flex-1 px-3 pb-2 flex flex-col gap-2 overflow-hidden">
            <input type="text" value={rivalQuery}
              onChange={e => setRivalQuery(e.target.value)}
              placeholder={t('oneVsOne.searchRival')}
              className="w-full bg-bg-elevated font-mono text-text-primary text-sm
                         placeholder-text-muted px-4 py-3 focus:outline-none rounded min-h-[48px] shrink-0"
              style={{ border: '2px solid #ff2244' }}
            />
            {rivalResults.length > 0 && (
              <div className="flex-1 overflow-y-auto rounded" style={{ border: '1px solid #2a1010' }}>
                {rivalResults.map(p => (
                  <button key={p.id} onClick={() => pickRival(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                               active:bg-bg-elevated transition-colors min-h-[48px]"
                    style={{ borderBottom: '1px solid #242424' }}>
                    <img src={p.sprites.normal ?? ''} alt={pokeName(p, lang)}
                      className="w-8 h-8 object-contain shrink-0"
                      style={{ imageRendering: 'pixelated' }} />
                    <div>
                      <p className="font-sans text-text-primary text-[9px] uppercase">{pokeName(p, lang)}</p>
                      <p className="font-mono text-text-muted text-[9px] normal-case">
                        {p.types.map(tp => t(`types.${tp}`, tp)).join(' / ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PixelNav />

      {editing !== null && (
        <SetEditor
          pokemon={editing === 'my' ? myPokemon! : rivalPokemon!}
          set={editing === 'my' ? mySet : rivalSet}
          onChange={editing === 'my' ? setMySet : setRivalSet}
          onClose={() => setEditing(null)}
          accent={editing === 'my' ? '#4fc3f7' : '#ff2244'}
          isRival={editing === 'rival'}
          pokemonId={editing === 'my' ? myPokemon?.id : rivalPokemon?.id}
        />
      )}

    </div>
  )
}
