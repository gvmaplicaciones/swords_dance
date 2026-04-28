// src/screens/BattleScreen.tsx

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle, type RivalSlot, emptyRivalSlot } from '../store/BattleContext'
import type { SmogonSet } from '../lib/smogon'
import type { SPSpread } from '../lib/statCalc'
import { getMoveData, searchMoves } from '../lib/moveDb'
import type { PokemonData } from '../types/pokemon'
import { createDefaultBattleState, type StatBoosts } from '../lib/battleState'
import { hasCounterAdvantage } from '../lib/typeMatchup'
import pokemonDataRaw from '../data/pokemon.json'
import itemsData from '../data/items.json'
import PixelNav from '../components/PixelNav'
import { useAuth } from '../hooks/useAuth'
import AuthModal from '../components/AuthModal'
import { saveRivalPreset, loadRivalPresets, deleteRivalPreset } from '../lib/rivalPresetsDb'
import type { RivalPreset } from '../lib/rivalPresetsDb'
import { getAbilityName } from '../lib/abilities'
import naturesData from '../i18n/natures.json'

const ALL_POKEMON = (pokemonDataRaw as PokemonData[]).filter(p => !p.isMega)

function matchupBorderStyle(tier: 'good' | 'neutral' | 'bad' | 'none') {
  switch (tier) {
    case 'good':    return { borderColor: '#00ff88', boxShadow: '0 0 6px rgba(0,255,136,0.4)' }
    case 'neutral': return { borderColor: '#ffe000', boxShadow: '0 0 6px rgba(255,224,0,0.35)' }
    case 'bad':     return { borderColor: '#242424', boxShadow: 'none' }
    default:        return {}
  }
}

const NATURES_LIST = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Jolly','Naive','Serious',
  'Modest','Mild','Quiet','Rash','Bashful',
  'Calm','Gentle','Sassy','Careful','Quirky',
]

const SP_KEYS: { key: keyof SPSpread; label: string }[] = [
  { key: 'hp',    label: 'HP'  },
  { key: 'atk',   label: 'ATK' },
  { key: 'def',   label: 'DEF' },
  { key: 'spAtk', label: 'SpA' },
  { key: 'spDef', label: 'SpD' },
  { key: 'spe',   label: 'SPE' },
]

function slugToDisplay(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function pokeName(p: PokemonData, lang: string): string {
  return lang === 'ja' ? p.name.ja : lang === 'en' ? p.name.en : p.name.es
}

function natLabel(key: string, lang: string): string {
  const n = (naturesData as Record<string, { es: string; en: string; ja: string }>)[key]
  return n ? (lang === 'ja' ? n.ja : lang === 'en' ? n.en : n.es) : key
}

function itemDisplayName(it: { nameEn: string; nameEs: string }, lang: string): string {
  return lang === 'es' ? it.nameEs : it.nameEn
}

function moveDisplayName(m: ReturnType<typeof getMoveData> | null | undefined, lang: string): string {
  if (!m) return ''
  return lang === 'ja' ? (m.nameJa || m.nameEn) : lang === 'en' ? m.nameEn : (m.nameEs || m.nameEn)
}

// ── Minicard ──────────────────────────────────────────────────────────────────

function PokéCard({
  slot, selected, onSelect, side, tier = 'none', lang,
}: {
  slot: { pokemon: PokemonData | null; smogonSet?: { itemSlug?: string } | null; battleState?: { boosts: StatBoosts; status: string } }
  selected: boolean
  onSelect: () => void
  side: 'my' | 'rival'
  tier?: 'good' | 'neutral' | 'bad' | 'none'
  lang: string
}) {
  const { pokemon, smogonSet, battleState } = slot
  const hasBoost  = battleState ? (Object.values(battleState.boosts) as number[]).some(v => v !== 0) : false
  const hasStatus = battleState ? battleState.status !== 'none' : false

  const borderStyle = selected
    ? { borderColor: side === 'my' ? '#4fc3f7' : '#ff2244',
        boxShadow:   side === 'my' ? '0 0 8px rgba(79,195,247,0.5)' : '0 0 8px rgba(255,34,68,0.5)' }
    : side === 'my' && tier !== 'none'
      ? matchupBorderStyle(tier)
      : side === 'my'
        ? { borderColor: '#1a3a5a' }
        : { borderColor: '#3a1a1a' }

  const bgColor = selected
    ? (side === 'my' ? 'rgba(79,195,247,0.08)' : 'rgba(255,34,68,0.08)')
    : 'rgba(0,0,0,0.25)'

  return (
    <button
      onClick={onSelect}
      className="relative flex flex-col items-center justify-center gap-0.5 p-2 rounded
                 transition-all active:scale-95 aspect-square"
      style={{ border: '2px solid', background: bgColor, ...borderStyle }}
    >
      {pokemon ? (
        <>
          <div className="relative w-full flex items-center justify-center flex-1">
            <img
              src={pokemon.sprites.normal ?? ''}
              alt={pokeName(pokemon, lang)}
              className="w-11 h-11 object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
            {smogonSet?.itemSlug && (
              <img
                src={`/assets/items/${smogonSet.itemSlug}.png`}
                alt=""
                className="absolute bottom-0 left-0 w-5 h-5 object-contain"
              />
            )}
          </div>
          <span className="font-sans text-[7px] text-white/80 uppercase truncate w-full text-center leading-none">
            {pokeName(pokemon, lang)}
          </span>
          {(hasBoost || hasStatus) && (
            <div className="flex gap-0.5 absolute top-1 right-1">
              {hasBoost  && <span className="font-mono text-[8px] text-boost leading-none">↑</span>}
              {hasStatus && <span className="font-mono text-[8px] text-burn leading-none">●</span>}
            </div>
          )}
        </>
      ) : (
        <span className="font-mono text-white/20 text-2xl">—</span>
      )}
    </button>
  )
}


// ── Add rival bottom-sheet ────────────────────────────────────────────────────

function AddRivalSheet({
  slotIdx,
  onClose,
}: {
  slotIdx: number
  onClose: () => void
}) {
  const { rivalSlots, setRivalSlots, preloadSmogonSet } = useBattle()
  const { session } = useAuth()
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  const [tab,            setTab]            = useState<'search' | 'presets'>('search')
  const [query,          setQuery]          = useState('')
  const [presets,        setPresets]        = useState<RivalPreset[]>([])
  const [presetsLoading, setPresetsLoading] = useState(false)
  const [presetsError,   setPresetsError]   = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (tab !== 'presets' || !session) return
    setPresetsLoading(true)
    setPresetsError('')
    loadRivalPresets().then(({ data, error }) => {
      if (error) setPresetsError(error)
      else setPresets(data)
      setPresetsLoading(false)
    })
  }, [tab, session])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_POKEMON.slice(0, 40)
    return ALL_POKEMON.filter(p =>
      p.name.es.toLowerCase().includes(q) ||
      p.name.en.toLowerCase().includes(q) ||
      p.name.ja.toLowerCase().includes(q)
    ).slice(0, 40)
  }, [query])

  function handlePick(p: PokemonData) {
    const updated = [...rivalSlots]
    updated[slotIdx] = {
      pokemon:     p,
      smogonSet:   preloadSmogonSet(p),
      battleState: createDefaultBattleState(p.id),
    }
    setRivalSlots(updated)
    onClose()
  }

  function handlePickPreset(preset: RivalPreset) {
    const pokemon = ALL_POKEMON.find(p => p.id === preset.pokemon_id)
    if (!pokemon) return
    const smogonSet: SmogonSet = {
      ability:        preset.ability,
      abilityDisplay: slugToDisplay(preset.ability),
      item:           preset.item,
      itemSlug:       preset.item_slug,
      nature:         preset.nature,
      sp:             preset.sp_spread,
      moves:          preset.moves,
      moveUsages:     [],
      itemUsage:      0,
      abilityUsage:   0,
    }
    const updated = [...rivalSlots]
    updated[slotIdx] = { pokemon, smogonSet, battleState: createDefaultBattleState(pokemon.id) }
    setRivalSlots(updated)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
           style={{ maxHeight: '75vh', borderTop: '2px solid #ff2244' }}>

        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>

        <div className="flex shrink-0 mx-4 mb-2 gap-0"
          style={{ border: '2px solid #242424', borderRadius: '4px' }}>
          {(['search', 'presets'] as const).map(tab2 => (
            <button
              key={tab2}
              onClick={() => setTab(tab2)}
              className="flex-1 py-2 font-sans text-[8px] uppercase transition-colors"
              style={{
                background: tab === tab2 ? '#ff2244' : '#181818',
                color:      tab === tab2 ? '#ffffff' : '#888888',
              }}
            >
              {tab2 === 'search' ? t('battleScreen.search') : t('battleScreen.myPresets')}
            </button>
          ))}
        </div>

        {tab === 'search' && (
          <>
            <div className="px-4 pb-2 shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('battleScreen.searchPokemon')}
                className="w-full bg-bg-elevated font-mono text-text-primary text-sm
                           placeholder-text-muted px-4 py-3 focus:outline-none min-h-[48px] rounded"
                style={{ border: '2px solid #242424' }}
              />
            </div>
            <div className="overflow-y-auto flex-1 pb-4">
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left
                             active:bg-bg-elevated transition-colors min-h-[56px]"
                  style={{ borderBottom: '1px solid rgba(36,36,36,0.4)' }}
                >
                  {p.sprites.normal ? (
                    <img src={p.sprites.normal} alt="" className="w-10 h-10 object-contain shrink-0"
                      style={{ imageRendering: 'pixelated' }} />
                  ) : (
                    <span className="w-10 h-10 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans text-text-primary text-[9px] uppercase truncate">
                      {pokeName(p, lang)}
                    </span>
                    <span className="block font-mono text-text-muted text-[9px] normal-case truncate">
                      {p.types.join(' / ')}
                    </span>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
                  {t('battleScreen.noResults')}
                </p>
              )}
            </div>
          </>
        )}

        {tab === 'presets' && (
          <div className="overflow-y-auto flex-1 pb-4">
            {!session ? (
              <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
                {t('battleScreen.signInPresets')}
              </p>
            ) : presetsLoading ? (
              <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case animate-pulse">
                {t('battleScreen.loading')}
              </p>
            ) : presetsError ? (
              <p className="font-mono text-debuff text-[9px] text-center py-8 normal-case">
                {t('battleScreen.presetsError')}
              </p>
            ) : presets.length === 0 ? (
              <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
                {t('battleScreen.noPresetsYet')}
              </p>
            ) : (
              presets.map(preset => {
                const pokemon = ALL_POKEMON.find(p => p.id === preset.pokemon_id)
                return (
                  <button
                    key={preset.id}
                    onClick={() => handlePickPreset(preset)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left
                               active:bg-bg-elevated transition-colors min-h-[56px]"
                    style={{ borderBottom: '1px solid rgba(36,36,36,0.4)' }}
                  >
                    {pokemon?.sprites.normal ? (
                      <img src={pokemon.sprites.normal} alt="" className="w-9 h-9 object-contain shrink-0"
                        style={{ imageRendering: 'pixelated' }} />
                    ) : (
                      <span className="w-9 h-9 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-sans text-text-primary text-[9px] uppercase truncate">
                        {preset.name}
                      </span>
                      <span className="block font-mono text-text-muted text-[8px] normal-case truncate">
                        {pokemon ? pokeName(pokemon, lang) : `#${preset.pokemon_id}`} · {natLabel(preset.nature, lang)}
                      </span>
                      {preset.note ? (
                        <span className="block font-mono text-text-muted text-[8px] normal-case truncate opacity-70">
                          {preset.note}
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Save Preset Sheet ─────────────────────────────────────────────────────────

function SavePresetSheet({
  pokemonId,
  ability, item, itemSlug, nature, sp, moves,
  onClose,
}: {
  pokemonId: number
  ability:   string
  item:      string
  itemSlug:  string
  nature:    string
  sp:        import('../lib/statCalc').SPSpread
  moves:     (string | null)[]
  onClose:   () => void
}) {
  const { t } = useTranslation()
  const [name,   setName]   = useState('')
  const [note,   setNote]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    setSaving(true)
    setError('')
    const result = await saveRivalPreset({
      name:      name.trim() || 'Sin nombre',
      pokemonId,
      item, itemSlug, ability, nature, sp,
      moves:     moves.filter(Boolean) as string[],
      note,
    })
    setSaving(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col p-4 gap-3 animate-slide-up"
        style={{ borderTop: '2px solid #ff2244' }}>
        <div className="w-10 h-1 bg-bg-highlight mx-auto" />
        <p className="font-sans text-text-primary text-[9px] uppercase">{t('battleScreen.savePresetTitle')}</p>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('battleScreen.presetName')}
          maxLength={40}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }}
        />
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={t('battleScreen.presetNote')}
          maxLength={80}
          className="w-full bg-bg-elevated px-3 py-3 font-mono text-text-primary text-xs
                     placeholder:text-text-muted/50 focus:outline-none"
          style={{ border: '2px solid #242424', borderRadius: '4px' }}
        />
        {error && <p className="font-mono text-debuff text-[9px] normal-case">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase"
            style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}
          >{t('battleScreen.cancel')}</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded font-sans text-[8px] uppercase disabled:opacity-50"
            style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                     boxShadow: '3px 3px 0 #cc1133' }}
          >{saving ? '...' : t('battleScreen.saveBtn')}</button>
        </div>
      </div>
    </div>
  )
}

// ── Presets Sheet ─────────────────────────────────────────────────────────────

function PresetsSheet({
  pokemonId,
  onLoad,
  onClose,
}: {
  pokemonId: number
  onLoad:    (preset: RivalPreset) => void
  onClose:   () => void
}) {
  const { session } = useAuth()
  const { t } = useTranslation()
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
    <div className="absolute inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary flex flex-col animate-slide-up"
        style={{ maxHeight: '70vh', borderTop: '2px solid #ff2244' }}>
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid #181818' }}>
          <p className="font-sans text-text-primary text-[9px] uppercase">{t('battleScreen.myPresets')}</p>
          <button onClick={onClose} className="font-mono text-text-muted text-xl p-1">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 pb-4">
          {loading ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case animate-pulse">
              {t('battleScreen.loading')}
            </p>
          ) : presets.length === 0 ? (
            <p className="font-mono text-text-muted text-[9px] text-center py-8 normal-case">
              {t('battleScreen.noPresetsForPoke')}
            </p>
          ) : (
            presets.map(preset => (
              <div key={preset.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid rgba(36,36,36,0.5)' }}>
                <button onClick={() => { onLoad(preset); onClose() }} className="flex-1 text-left min-h-[44px]">
                  <p className="font-sans text-text-primary text-[9px] uppercase">{preset.name}</p>
                  {preset.note && (
                    <p className="font-mono text-text-muted text-[8px] normal-case mt-0.5">{preset.note}</p>
                  )}
                  <p className="font-mono text-text-muted text-[8px] normal-case mt-0.5">
                    {preset.nature} · {preset.moves.filter(Boolean).join(', ')}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(preset.id)}
                  className="font-mono text-text-muted text-sm p-2 min-w-[40px] min-h-[40px]
                             flex items-center justify-center active:text-debuff transition-colors"
                >✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Edit rival bottom-sheet ───────────────────────────────────────────────────

function EditRivalSheet({
  slotIdx,
  onClose,
  onRemove,
}: {
  slotIdx: number
  onClose: () => void
  onRemove: () => void
}) {
  const { rivalSlots, setRivalSlots } = useBattle()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const slot = rivalSlots[slotIdx]
  const p    = slot.pokemon!
  const ex   = slot.smogonSet

  const [ability,  setAbility]  = useState(ex?.ability  ?? p.abilities[0]?.name ?? '')
  const [itemSlug, setItemSlug] = useState(ex?.itemSlug ?? '')
  const [itemName, setItemName] = useState(ex?.item     ?? '')
  const [nature,   setNature]   = useState(ex?.nature   ?? 'Hardy')
  const [moves,    setMoves]    = useState<(string | null)[]>(() => {
    const m = ex?.moves ?? []
    return [m[0] ?? null, m[1] ?? null, m[2] ?? null, m[3] ?? null]
  })
  const [sp, setSp] = useState<SPSpread>(
    ex?.sp ?? { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 }
  )

  const [itemQuery,    setItemQuery]    = useState('')
  const [showItemList, setShowItemList] = useState(false)
  const [activeMove,   setActiveMove]   = useState<number | null>(null)
  const [moveQuery,    setMoveQuery]    = useState('')
  const moveInputRef = useRef<HTMLInputElement>(null)

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

  function triggerPresetAction(action: 'save' | 'presets') {
    if (!session) { setPendingAction(action); setShowAuthModal(true) }
    else if (action === 'save')    setShowSavePreset(true)
    else                           setShowPresets(true)
  }

  function loadPreset(preset: RivalPreset) {
    setAbility(preset.ability)
    setItemSlug(preset.item_slug)
    setItemName(preset.item)
    setNature(preset.nature)
    setSp(preset.sp_spread)
    setMoves([preset.moves[0] ?? null, preset.moves[1] ?? null, preset.moves[2] ?? null, preset.moves[3] ?? null])
  }

  const spTotal = (Object.values(sp) as number[]).reduce((a, b) => a + b, 0)

  const filteredItems = useMemo(() => {
    const q     = itemQuery.toLowerCase()
    const items = itemsData as { nameApi: string; nameEn: string; nameEs: string }[]
    if (!q) return items.slice(0, 50)
    return items.filter(it =>
      it.nameEs.toLowerCase().includes(q) || it.nameEn.toLowerCase().includes(q)
    ).slice(0, 50)
  }, [itemQuery])

  const filteredMoves = useMemo(() =>
    moveQuery.trim() ? searchMoves(moveQuery, lang, 30) : [],
  [moveQuery, lang])

  function setSingleSp(key: keyof SPSpread, val: number) {
    const other = (Object.keys(sp) as (keyof SPSpread)[])
      .filter(k => k !== key)
      .reduce((a, k) => a + sp[k], 0)
    const capped = Math.min(val, Math.max(0, 66 - other))
    setSp(prev => ({ ...prev, [key]: capped }))
  }

  function openMoveSearch(i: number) {
    setActiveMove(i)
    setMoveQuery('')
    setTimeout(() => moveInputRef.current?.focus(), 80)
  }

  function pickMove(i: number, nameEn: string) {
    setMoves(prev => { const n = [...prev]; n[i] = nameEn; return n })
    setActiveMove(null)
    setMoveQuery('')
  }

  function clearMove(i: number) {
    setMoves(prev => { const n = [...prev]; n[i] = null; return n })
  }

  function handleSave() {
    const newSmogon: SmogonSet = {
      ability,
      abilityDisplay: slugToDisplay(ability),
      item:           itemName,
      itemSlug,
      nature,
      sp,
      moves:          moves.filter(Boolean) as string[],
      moveUsages:     [],
      itemUsage:      0,
      abilityUsage:   0,
    }
    const updated = [...rivalSlots]
    updated[slotIdx] = { ...updated[slotIdx], smogonSet: newSmogon }
    setRivalSlots(updated)
    onClose()
  }

  function handleRemove() {
    onRemove()
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div
        className="relative bg-bg-secondary flex flex-col animate-slide-up"
        style={{ maxHeight: '92vh', borderTop: '2px solid #ff2244' }}
      >
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-bg-highlight" />
        </div>

        <div className="px-4 pb-2 flex items-center gap-3 shrink-0"
          style={{ borderBottom: '1px solid #181818' }}>
          {p.sprites.normal && (
            <img src={p.sprites.normal} alt="" className="w-10 h-10 object-contain shrink-0"
              style={{ imageRendering: 'pixelated' }} />
          )}
          <span className="font-sans text-text-primary text-[9px] uppercase flex-1">{pokeName(p, lang)}</span>
          <button
            onClick={handleRemove}
            className="px-3 py-2 font-sans text-[8px] uppercase rounded min-h-[40px] active:bg-debuff/20 mr-1"
            style={{ border: '1px solid rgba(255,34,68,0.4)', color: '#ff2244' }}
          >
            {t('battleScreen.remove')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 font-sans text-[8px] uppercase rounded min-h-[40px]"
            style={{ border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' }}
          >
            {t('battleScreen.save')}
          </button>
        </div>

        <div className="px-4 py-2 flex items-center gap-2 shrink-0"
          style={{ borderBottom: '1px solid #181818' }}>
          <button
            onClick={() => triggerPresetAction('save')}
            className="flex-1 py-2 rounded font-sans text-[8px] uppercase transition-colors active:opacity-70"
            style={{ border: '1px solid #242424', color: '#cccccc', background: '#181818' }}
          >{t('battleScreen.savePreset')}</button>
          <button
            onClick={() => triggerPresetAction('presets')}
            className="flex-1 py-2 rounded font-sans text-[8px] uppercase transition-colors active:opacity-70"
            style={{ border: '1px solid #242424', color: '#cccccc', background: '#181818' }}
          >{t('battleScreen.myPresetsBtn')}</button>
        </div>

        <div className="overflow-y-auto flex-1 pb-8">

          {/* Habilidad */}
          <section className="px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
            <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('battleScreen.ability')}</p>
            <div className="flex flex-wrap gap-2">
              {p.abilities.map(a => (
                <button
                  key={a.name}
                  onClick={() => setAbility(a.name)}
                  className="px-3 py-2 rounded text-[9px] font-mono transition-colors min-h-[40px]"
                  style={ability === a.name
                    ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' }
                    : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}
                >
                  {getAbilityName(a.name, lang)}{a.hidden ? ` ${t('teamEditor.hidden')}` : ''}
                </button>
              ))}
            </div>
          </section>

          {/* Objeto */}
          <section className="px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
            <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('battleScreen.item')}</p>
            <div className="flex items-center gap-2 mb-1.5">
              {itemSlug && (
                <img src={`/assets/items/${itemSlug}.png`} alt="" className="w-7 h-7 object-contain shrink-0"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              )}
              <input
                value={showItemList ? itemQuery : itemName}
                onChange={e => { setItemQuery(e.target.value); setShowItemList(true) }}
                onFocus={() => { setShowItemList(true); setItemQuery('') }}
                placeholder={t('battleScreen.noItem')}
                className="flex-1 bg-bg-elevated font-mono text-text-primary text-sm
                           placeholder-text-muted px-3 py-2.5 focus:outline-none min-h-[44px] rounded"
                style={{ border: '2px solid #242424' }}
              />
              {itemSlug && (
                <button
                  onClick={() => { setItemSlug(''); setItemName(''); setItemQuery(''); setShowItemList(false) }}
                  className="font-mono text-text-muted text-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
                >✕</button>
              )}
            </div>
            {showItemList && (
              <div className="max-h-40 overflow-y-auto rounded border border-bg-elevated bg-bg-elevated">
                {filteredItems.map(it => (
                  <button
                    key={it.nameApi}
                    onClick={() => {
                      setItemSlug(it.nameApi)
                      setItemName(itemDisplayName(it, lang))
                      setItemQuery('')
                      setShowItemList(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left
                               active:bg-bg-highlight min-h-[44px]"
                    style={{ borderBottom: '1px solid rgba(36,36,36,0.3)' }}
                  >
                    <img src={`/assets/items/${it.nameApi}.png`} alt="" className="w-6 h-6 object-contain shrink-0"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    <span className="font-mono text-text-primary text-sm normal-case">{itemDisplayName(it, lang)}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Movimientos */}
          <section className="px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
            <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('battleScreen.moves')}</p>
            {moves.map((m, i) => (
              <div key={i} className="mb-2 last:mb-0">
                {activeMove === i ? (
                  <div>
                    <input
                      ref={moveInputRef}
                      value={moveQuery}
                      onChange={e => setMoveQuery(e.target.value)}
                      placeholder={t('battleScreen.searchMove')}
                      className="w-full bg-bg-elevated font-mono text-text-primary text-sm
                                 placeholder-text-muted px-3 py-2.5 focus:outline-none min-h-[44px] rounded"
                      style={{ border: '2px solid #4fc3f7' }}
                    />
                    <div className="max-h-36 overflow-y-auto rounded border border-bg-elevated bg-bg-elevated mt-1">
                      {filteredMoves.map(mv => (
                        <button
                          key={mv.nameEn}
                          onClick={() => pickMove(i, mv.nameEn)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left
                                     active:bg-bg-highlight min-h-[44px]"
                          style={{ borderBottom: '1px solid rgba(36,36,36,0.3)' }}
                        >
                          <span className="font-mono text-text-primary text-sm normal-case">
                            {(lang === 'ja' ? mv.nameJa : lang === 'en' ? mv.nameEn : mv.nameEs) || mv.nameEn}
                          </span>
                          {mv.power > 0 && (
                            <span className="font-mono text-text-muted text-xs shrink-0">{mv.power}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveMove(null)}
                      className="font-mono text-text-muted text-xs mt-1 px-1 min-h-[32px] normal-case"
                    >{t('battleScreen.cancel')}</button>
                  </div>
                ) : (
                  <button
                    onClick={() => openMoveSearch(i)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5
                               bg-bg-elevated rounded text-left min-h-[44px] active:bg-bg-highlight transition-colors"
                    style={{ border: '1px solid #242424' }}
                  >
                    <span className={`font-mono text-sm normal-case ${m ? 'text-text-primary' : 'text-text-muted'}`}>
                      {m ? (moveDisplayName(getMoveData(m), lang) || m) : t('battleScreen.moveSlot', { n: i + 1 })}
                    </span>
                    {m && (
                      <span
                        role="button"
                        onClick={e => { e.stopPropagation(); clearMove(i) }}
                        className="font-mono text-text-muted text-xs px-2 min-h-[32px] flex items-center"
                      >✕</span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </section>

          {/* Spread SP */}
          <section className="px-4 py-3" style={{ borderBottom: '1px solid #181818' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-[8px] uppercase text-text-muted">{t('battleScreen.spSpread')}</p>
              <span className={`font-mono text-xs px-2 py-0.5 rounded
                ${spTotal > 66 ? 'bg-debuff/20 text-debuff' : 'bg-bg-elevated text-text-muted'}`}>
                {spTotal}/66
              </span>
            </div>
            {SP_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 mb-2 last:mb-0">
                <span className="font-mono text-text-muted text-xs w-7 text-right shrink-0">{label}</span>
                <input
                  type="range" min={0} max={32} value={sp[key]}
                  onChange={e => setSingleSp(key, Number(e.target.value))}
                  className="flex-1 h-1.5"
                  style={{ accentColor: '#ff2244' }}
                />
                <span className="font-mono text-text-primary text-xs w-4 text-right shrink-0">{sp[key]}</span>
              </div>
            ))}
          </section>

          {/* Naturaleza */}
          <section className="px-4 py-3">
            <p className="font-sans text-[8px] uppercase text-text-muted mb-2">{t('battleScreen.nature')}</p>
            <div className="flex flex-wrap gap-1.5">
              {NATURES_LIST.map(n => (
                <button
                  key={n}
                  onClick={() => setNature(n)}
                  className="px-2.5 py-1.5 rounded text-[9px] font-mono transition-colors min-h-[36px]"
                  style={nature === n
                    ? { border: '2px solid #4fc3f7', color: '#4fc3f7', background: '#0066aa' }
                    : { border: '1px solid #242424', color: '#cccccc', background: '#181818' }}
                >
                  {natLabel(n, lang)}
                </button>
              ))}
            </div>
          </section>

        </div>

        {showSavePreset && (
          <SavePresetSheet
            pokemonId={p.id}
            ability={ability}
            item={itemName}
            itemSlug={itemSlug}
            nature={nature}
            sp={sp}
            moves={moves}
            onClose={() => setShowSavePreset(false)}
          />
        )}
        {showPresets && (
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
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BattleScreen() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const { rivalSlots, setRivalSlots, mySlots, preloadSmogonSet, smogonReady } = useBattle()

  const [selectedMy,    setSelectedMy]    = useState<number | null>(null)
  const [selectedRival, setSelectedRival] = useState<number | null>(null)
  const [addingSlot,    setAddingSlot]    = useState<number | null>(null)
  const [editingSlot,   setEditingSlot]   = useState<number | null>(null)

  useState(() => {
    const incoming = location.state?.rivalTeam as PokemonData[] | undefined
    if (!incoming) return
    const newSlots: RivalSlot[] = incoming.slice(0, 4).map(p => ({
      pokemon:     p ?? null,
      smogonSet:   p && smogonReady ? preloadSmogonSet(p) : null,
      battleState: createDefaultBattleState(p?.id ?? 0),
    }))
    setRivalSlots(newSlots)
    window.history.replaceState({}, '')
  })

  function handleSelectMy(i: number) {
    setSelectedMy(prev => prev === i ? null : i)
  }
  function handleSelectRival(i: number) {
    if (!rivalSlots[i].pokemon) return
    setSelectedRival(prev => prev === i ? null : i)
  }

  const canVS = selectedMy !== null && selectedRival !== null

  function goVS() {
    if (!canVS) return
    navigate('/vs', { state: { myIdx: selectedMy, rivalIdx: selectedRival } })
  }

  function clearRival(i: number) {
    const updated = [...rivalSlots]
    updated[i] = emptyRivalSlot()
    setRivalSlots(updated)
    if (selectedRival === i) setSelectedRival(null)
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary relative">

      <header className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '2px solid #ff2244' }}>
        <button onClick={() => navigate('/')} className="font-mono text-text-muted p-1 text-xl min-w-[44px]">←</button>
        <h1 className="font-sans text-text-primary text-[9px] uppercase">{t('battleScreen.title')}</h1>
        <div className="min-w-[44px]" />
      </header>

      {/* MI EQUIPO */}
      <div className="flex-1 flex flex-col" style={{ background: '#04080f', borderBottom: '2px solid #1a3a5a' }}>
        <div className="px-3 py-1.5 flex items-center gap-2 shrink-0">
          <span className="font-sans text-[8px] uppercase tracking-widest"
            style={{ color: '#4fc3f7', textShadow: '0 0 6px rgba(79,195,247,0.4)' }}>
            {t('battleScreen.myTeam')}
          </span>
        </div>
        <div className="flex-1 px-3 grid grid-cols-3 gap-2 content-start">
          {mySlots.map((slot, i) => {
            let tier: 'good' | 'neutral' | 'bad' | 'none' = 'none'
            if (slot.pokemon && selectedRival !== null && rivalSlots[selectedRival]?.pokemon) {
              tier = hasCounterAdvantage(slot, rivalSlots[selectedRival]) ? 'good' : 'none'
            }
            return (
              <PokéCard
                key={i}
                slot={{
                  pokemon:     slot.pokemon,
                  smogonSet:   { itemSlug: slot.itemSlug },
                  battleState: slot.battleState,
                }}
                selected={selectedMy === i}
                onSelect={() => handleSelectMy(i)}
                side="my"
                tier={tier}
                lang={lang}
              />
            )
          })}
        </div>
      </div>

      {/* VS button */}
      <div className="flex justify-center items-center py-2 bg-bg-primary shrink-0"
        style={{ borderBottom: '1px solid #181818' }}>
        {canVS ? (
          <button
            onClick={goVS}
            className="px-8 py-3 font-sans text-[10px] uppercase rounded min-h-[48px]"
            style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                     boxShadow: '3px 3px 0 #cc1133, 0 0 10px rgba(255,34,68,0.35)' }}
          >
            {t('battleScreen.goCalc')}
          </button>
        ) : (
          <span className="font-mono text-text-muted text-[9px] text-center px-4 normal-case">
            {selectedMy === null && selectedRival === null
              ? t('battleScreen.selectBoth')
              : selectedMy === null
              ? t('battleScreen.selectMine')
              : t('battleScreen.selectRival')}
          </span>
        )}
      </div>

      {/* EQUIPO RIVAL */}
      <div className="flex-1 flex flex-col" style={{ background: '#0a0404' }}>
        <div className="px-3 py-1.5 flex items-center gap-2 shrink-0">
          <span className="font-sans text-[8px] uppercase tracking-widest"
            style={{ color: '#ff2244', textShadow: '0 0 6px rgba(255,34,68,0.4)' }}>
            {t('battleScreen.rivalTeam')}
          </span>
        </div>
        <div className="flex-1 px-3 pb-2 grid grid-cols-2 gap-2 content-start">
          {rivalSlots.map((slot, i) => {
            const isSelectedRival = selectedRival === i
            const outerStyle = slot.pokemon && isSelectedRival
              ? { border: '2px solid #ff2244', boxShadow: '0 0 8px rgba(255,34,68,0.4)', background: '#0a0404' }
              : { border: slot.pokemon ? '2px solid #3a1a1a' : '2px dashed #3a1a1a', background: '#0a0404' }
            return (
              <div
                key={i}
                className="flex flex-col rounded overflow-hidden min-h-[110px] h-full"
                style={outerStyle}
              >
                {slot.pokemon ? (
                  <>
                    <button
                      onClick={() => handleSelectRival(i)}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5 p-2 transition-all active:bg-red/10"
                    >
                      <img
                        src={slot.pokemon.sprites.normal ?? ''}
                        alt={pokeName(slot.pokemon, lang)}
                        className="w-12 h-12 object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                      <span className="font-sans text-[7px] text-white/80 uppercase truncate w-full text-center leading-none">
                        {pokeName(slot.pokemon, lang)}
                      </span>
                    </button>
                    <div className="flex shrink-0" style={{ borderTop: '1px solid #2a1010' }}>
                      <button
                        onClick={() => setEditingSlot(i)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 font-sans text-[8px] uppercase active:opacity-70"
                        style={{ background: '#0a0a0a', color: '#ff2244', borderRight: '1px solid #2a1010' }}
                      >
                        {t('battleScreen.edit')}
                      </button>
                      <button
                        onClick={() => clearRival(i)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 font-sans text-[8px] uppercase active:opacity-70"
                        style={{ background: '#ff2244', color: '#000000' }}
                      >
                        {t('battleScreen.delete')}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setAddingSlot(i)}
                    className="flex-1 flex items-center justify-center font-mono text-2xl active:opacity-80"
                    style={{ color: 'rgba(255,34,68,0.4)' }}
                  >
                    +
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <PixelNav />

      {addingSlot !== null && (
        <AddRivalSheet slotIdx={addingSlot} onClose={() => setAddingSlot(null)} />
      )}

      {editingSlot !== null && rivalSlots[editingSlot]?.pokemon && (
        <EditRivalSheet
          slotIdx={editingSlot}
          onClose={() => setEditingSlot(null)}
          onRemove={() => clearRival(editingSlot)}
        />
      )}
    </div>
  )
}
