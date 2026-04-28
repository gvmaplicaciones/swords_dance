import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBattle, emptyMySlot } from '../store/BattleContext'
import type { MySlot } from '../store/BattleContext'
import type { PokemonData } from '../types/pokemon'
import pokemonData from '../data/pokemon.json'
import itemsData   from '../data/items.json'
import { loadTeams, saveTeams, loadActiveId, saveActiveId, makeTeam } from '../lib/teamsDb'
import type { Team } from '../lib/teamsDb'
import PixelNav from '../components/PixelNav'

const ALL_POKEMON = pokemonData as PokemonData[]

type ItemEntry = { nameApi: string; nameEn: string; nameEs: string }
const ALL_ITEMS = itemsData as ItemEntry[]

// ── Pokepaste parser ───────────────────────────────────────────────────────────

interface ParsedSlot {
  pokemonName: string
  item:        string
  ability:     string
  nature:      string
  evs:         { hp:number; atk:number; def:number; spAtk:number; spDef:number; spe:number }
  moves:       string[]
}

function parsePokepaste(text: string): ParsedSlot[] {
  const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim())
  const results: ParsedSlot[] = []

  for (const block of blocks.slice(0, 6)) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) continue

    const firstLine = lines[0]
    let pokemonName = firstLine
    let item = ''

    if (firstLine.includes('@')) {
      const [namePart, itemPart] = firstLine.split('@').map(s => s.trim())
      item = itemPart ?? ''
      pokemonName = namePart.replace(/\s*\([^)]+\)/, '').trim()
    } else {
      pokemonName = firstLine.replace(/\s*\([^)]+\)/, '').trim()
    }

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
          const val  = parseInt(m[1])
          const stat = m[2].trim().toLowerCase()
          if (stat === 'hp')                                         evs.hp    = val
          else if (stat === 'atk')                                   evs.atk   = val
          else if (stat === 'def')                                   evs.def   = val
          else if (stat === 'spa' || stat === 'spatk' || stat === 'sp. atk') evs.spAtk = val
          else if (stat === 'spd' || stat === 'spdef' || stat === 'sp. def') evs.spDef = val
          else if (stat === 'spe')                                   evs.spe   = val
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

function parsedToSlots(parsed: ParsedSlot[]): MySlot[] {
  return parsed.map(p => {
    const pokemon = ALL_POKEMON.find(pk =>
      pk.name.en.toLowerCase() === p.pokemonName.toLowerCase() ||
      pk.name.es.toLowerCase() === p.pokemonName.toLowerCase()
    ) ?? null

    const itemEntry   = ALL_ITEMS.find(it => it.nameEn.toLowerCase() === p.item.toLowerCase())
    const itemSlug    = itemEntry?.nameApi ?? ''
    const itemDisplay = itemEntry?.nameEs  ?? p.item
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
      item: itemDisplay,
      itemSlug,
      ability: abilitySlug,
      nature: p.nature || 'Hardy',
      sp,
      moves: p.moves,
    }
  })
}

// ── PokepasteSheet ────────────────────────────────────────────────────────────

function PokepasteSheet({ onClose, onImport }: {
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
    onImport(parsedToSlots(parsed))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-bg-secondary max-h-[80vh] flex flex-col p-4 gap-4 animate-slide-up"
        style={{ borderTop: '2px solid #ff2244' }}>

        <div className="w-10 h-1 bg-bg-highlight mx-auto" />

        <div className="flex items-center justify-between">
          <p className="font-sans text-text-primary text-[9px] uppercase">{t('teams.pasteTitle')}</p>
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

// ── TeamCard ──────────────────────────────────────────────────────────────────

function TeamCard({ team, isActive, onActivate, onEdit, onBattle, onDelete }: {
  team:       Team
  isActive:   boolean
  onActivate: () => void
  onEdit:     () => void
  onBattle:   () => void
  onDelete:   () => void
}) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language

  return (
    <div
      className="rounded p-4 space-y-3"
      style={{
        border: isActive ? '2px solid #ff2244' : '2px solid #242424',
        background: '#121212',
        boxShadow: isActive ? '3px 3px 0 #cc1133' : '3px 3px 0 #181818',
      }}
    >
      <div className="flex items-center gap-2">
        <p className="font-sans text-text-primary text-[10px] uppercase flex-1 truncate">
          {team.name}
        </p>
        {isActive && (
          <span className="font-mono text-[8px] px-2 py-0.5 border border-red text-red bg-red/10 uppercase">
            {t('teams.active')}
          </span>
        )}
        <button
          onClick={onDelete}
          className="font-mono text-text-muted text-sm p-1 leading-none active:text-debuff transition-colors"
          title={t('teams.deleteTitle')}
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-1">
        {team.slots.map((slot, i) => (
          <div key={i} className="w-10 h-10 flex items-center justify-center">
            {slot.pokemon?.sprites.normal ? (
              <img
                src={slot.pokemon.sprites.normal}
                alt={lang === 'ja' ? slot.pokemon.name.ja : lang === 'en' ? slot.pokemon.name.en : slot.pokemon.name.es}
                className="w-9 h-9 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-8 h-8 rounded border border-dashed border-text-muted/30" />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {!isActive && (
          <button
            onClick={onActivate}
            className="px-3 py-2 rounded font-sans text-[8px] uppercase transition-colors active:scale-95"
            style={{ border: '1px solid #242424', color: '#999999', background: '#181818' }}
          >
            {t('teams.activate')}
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex-1 py-2 rounded font-sans text-[8px] uppercase transition-colors active:scale-95"
          style={{ border: '2px solid #242424', color: '#cccccc', background: '#181818',
                   boxShadow: '2px 2px 0 #181818' }}
        >
          {t('teams.edit')}
        </button>
        <button
          onClick={onBattle}
          className="flex-1 py-2 rounded font-sans text-[8px] uppercase transition-colors active:scale-95"
          style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                   boxShadow: '2px 2px 0 #cc1133' }}
        >
          {t('teams.battle')}
        </button>
      </div>
    </div>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TeamsScreen() {
  const navigate                = useNavigate()
  const { mySlots, setMySlots } = useBattle()
  const { t } = useTranslation()

  const [teams,    setTeams]    = useState<Team[]>(() => loadTeams())
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveId())
  const [showPaste, setShowPaste] = useState(false)

  useEffect(() => {
    let loaded = loadTeams()
    const id   = loadActiveId()

    const purged = loaded.filter(t => t.id === id || t.slots.some(s => s.pokemon))
    if (purged.length !== loaded.length) {
      saveTeams(purged)
      loaded = purged
    }

    if (!loaded.length) {
      if (mySlots.some(s => s.pokemon)) {
        const newTeam = makeTeam(t('teams.defaultTeamName'), [...mySlots])
        const updated = [newTeam]
        saveTeams(updated)
        saveActiveId(newTeam.id)
        setTeams(updated)
        setActiveId(newTeam.id)
      } else {
        setTeams([])
        setActiveId(null)
      }
      return
    }

    if (id) {
      const updated = loaded.map(t => t.id === id ? { ...t, slots: [...mySlots] } : t)
      saveTeams(updated)
      setTeams(updated)
    } else {
      setTeams(loaded)
    }
    setActiveId(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function activateTeam(id: string) {
    const withSaved = teams.map(t => t.id === activeId ? { ...t, slots: [...mySlots] } : t)
    const target    = withSaved.find(t => t.id === id)
    if (!target) return

    const filled = fillSlots(target.slots)
    saveTeams(withSaved)
    saveActiveId(id)
    setMySlots(filled)
    setTeams(withSaved)
    setActiveId(id)
  }

  function handleEdit(id: string) {
    activateTeam(id)
    navigate('/team')
  }

  function handleBattle(id: string) {
    activateTeam(id)
    navigate('/battle')
  }

  function deleteTeam(id: string) {
    const updated  = teams.filter(t => t.id !== id)
    let newActive  = activeId

    if (activeId === id) {
      newActive = updated[0]?.id ?? null
      if (newActive) {
        const target = updated.find(t => t.id === newActive)!
        setMySlots(fillSlots(target.slots))
      } else {
        setMySlots(fillSlots([]))
      }
    }

    saveTeams(updated)
    saveActiveId(newActive)
    setTeams(updated)
    setActiveId(newActive)
  }

  function handleNew() {
    if (activeId) {
      const updated = teams.map(t => t.id === activeId ? { ...t, slots: [...mySlots] } : t)
      saveTeams(updated)
      setTeams(updated)
    }

    const newTeam = makeTeam(t('teams.newTeamName'))
    const updated = [...teams, newTeam]
    saveTeams(updated)
    saveActiveId(newTeam.id)
    setMySlots(newTeam.slots)
    setTeams(updated)
    setActiveId(newTeam.id)
    navigate('/team')
  }

  function handlePasteImport(slots: MySlot[]) {
    if (activeId) {
      const updated = teams.map(t => t.id === activeId ? { ...t, slots: [...mySlots] } : t)
      saveTeams(updated)
      setTeams(updated)
    }

    const newTeam = makeTeam(t('teams.importedTeamName'), fillSlots(slots))
    const updated = [...teams, newTeam]
    saveTeams(updated)
    saveActiveId(newTeam.id)
    setMySlots(newTeam.slots)
    setTeams(updated)
    setActiveId(newTeam.id)
    navigate('/team')
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">

      <header
        className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '2px solid #ff2244' }}
      >
        <button onClick={() => navigate('/')} className="font-mono text-text-muted text-xl p-1 min-w-[44px]">
          ←
        </button>
        <h1 className="font-sans text-text-primary text-[9px] uppercase flex-1">{t('teams.title')}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {teams.length === 0 && (
          <p className="font-mono text-text-muted text-[9px] text-center normal-case py-8">
            {t('teams.empty')}
          </p>
        )}

        {teams.map(team => (
          <TeamCard
            key={team.id}
            team={team}
            isActive={team.id === activeId}
            onActivate={() => activateTeam(team.id)}
            onEdit={() => handleEdit(team.id)}
            onBattle={() => handleBattle(team.id)}
            onDelete={() => deleteTeam(team.id)}
          />
        ))}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleNew}
            className="flex-1 py-4 rounded font-sans text-[9px] uppercase transition-colors active:scale-95"
            style={{ border: '2px solid #ff2244', color: '#ff2244', background: '#080808',
                     boxShadow: '3px 3px 0 #cc1133' }}
          >
            {t('teams.newTeam')}
          </button>
          <button
            onClick={() => setShowPaste(true)}
            className="flex-1 py-4 rounded font-sans text-[9px] uppercase transition-colors active:scale-95"
            style={{ border: '2px solid #242424', color: '#cccccc', background: '#181818',
                     boxShadow: '3px 3px 0 #181818' }}
          >
            {t('teams.importPaste')}
          </button>
        </div>

      </div>

      <PixelNav />

      {showPaste && (
        <PokepasteSheet
          onClose={() => setShowPaste(false)}
          onImport={handlePasteImport}
        />
      )}

    </div>
  )
}

function fillSlots(slots: MySlot[]): MySlot[] {
  const filled = [...slots]
  while (filled.length < 6) filled.push(emptyMySlot())
  return filled.slice(0, 6)
}
