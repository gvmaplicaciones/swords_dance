// src/store/BattleContext.tsx
// Contexto global para sesión de batalla: mi equipo + equipo rival
// Persiste en localStorage para sobrevivir navegaciones.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { PokemonData } from '../types/pokemon'
import type { PokemonBattleState } from '../lib/battleState'
import { createDefaultBattleState } from '../lib/battleState'
import type { SmogonSet } from '../lib/smogon'
import { loadSmogon, getSmogonSet, toSmogonName, isSmogonBundled } from '../lib/smogon'
import { initClaudeSets, getClaudeSet } from '../lib/setsDb'
import type { SPSpread } from '../lib/statCalc'
import { supabase } from '../lib/supabase'
import { preloadAbilities } from '../lib/abilities'

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface RivalSlot {
  pokemon:     PokemonData | null
  smogonSet:   SmogonSet  | null
  battleState: PokemonBattleState
}

export interface MySlot {
  pokemon:     PokemonData | null
  item:        string    // display name e.g. "Choice Scarf"
  itemSlug:    string    // sprite filename e.g. "choice-scarf"
  ability:     string    // slug e.g. "rough-skin"
  nature:      string    // "Jolly"
  sp:          SPSpread
  moves:       string[]  // 4 move names (display en el idioma activo)
  battleState: PokemonBattleState
}

export function emptyMySlot(): MySlot {
  return {
    pokemon: null, item: '', itemSlug: '', ability: '', nature: 'Hardy',
    sp: { hp:0, atk:0, def:0, spAtk:0, spDef:0, spe:0 }, moves: [],
    battleState: createDefaultBattleState(0),
  }
}

export function emptyRivalSlot(): RivalSlot {
  return { pokemon: null, smogonSet: null, battleState: createDefaultBattleState(0) }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface BattleCtx {
  rivalSlots:   RivalSlot[]
  setRivalSlots: (slots: RivalSlot[]) => void
  updateRivalState: (idx: number, s: PokemonBattleState) => void

  mySlots:  MySlot[]
  setMySlots: (slots: MySlot[]) => void
  updateMySlot: (idx: number, slot: MySlot) => void
  updateMyBattleState: (idx: number, s: PokemonBattleState) => void

  smogonReady:  boolean
  smogonError:  boolean
  preloadSmogonSet: (pokemon: PokemonData) => SmogonSet | null

  saveTeam: () => Promise<{ ok: boolean; msg: string }>
}

const Ctx = createContext<BattleCtx | null>(null)

export function useBattle() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBattle must be inside BattleProvider')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

const RIVAL_KEY  = 'sd_rival_slots'
const MY_KEY     = 'sd_my_slots'

function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}

const DEFAULT_RIVAL: RivalSlot[] = Array.from({ length: 4 }, emptyRivalSlot)
const DEFAULT_MY:    MySlot[]    = Array.from({ length: 6 }, emptyMySlot)

export function BattleProvider({ children }: { children: React.ReactNode }) {
  const [rivalSlots, setRivalSlotsRaw] = useState<RivalSlot[]>(() => {
    const loaded = load(RIVAL_KEY, DEFAULT_RIVAL)
    const normalized = loaded.slice(0, 4)
    while (normalized.length < 4) normalized.push(emptyRivalSlot())
    return normalized
  })
  const [mySlots, setMySlotsRaw] = useState<MySlot[]>(
    () => load(MY_KEY, DEFAULT_MY)
  )

  // Smogon: si está bundled ya está listo sin fetch
  const [smogonData, setSmogonData] = useState<Awaited<ReturnType<typeof loadSmogon>>>(null)
  const [smogonReady, setSmogonReady] = useState(() => isSmogonBundled())
  const [smogonError, setSmogonError] = useState(false)

  useEffect(() => {
    // Iniciar carga en background
    preloadAbilities()
    initClaudeSets()

    if (isSmogonBundled()) return  // ya está listo
    loadSmogon().then(data => {
      setSmogonData(data)
      setSmogonReady(true)
      if (!data) setSmogonError(true)
    })
  }, [])

  // Persistir rival slots
  function setRivalSlots(slots: RivalSlot[]) {
    setRivalSlotsRaw(slots)
    try { localStorage.setItem(RIVAL_KEY, JSON.stringify(slots)) } catch {}
  }

  function updateRivalState(idx: number, s: PokemonBattleState) {
    setRivalSlots(rivalSlots.map((sl, i) => i === idx ? { ...sl, battleState: s } : sl))
  }

  function setMySlots(slots: MySlot[]) {
    setMySlotsRaw(slots)
    try { localStorage.setItem(MY_KEY, JSON.stringify(slots)) } catch {}
  }

  function updateMySlot(idx: number, slot: MySlot) {
    setMySlots(mySlots.map((sl, i) => i === idx ? slot : sl))
  }

  function updateMyBattleState(idx: number, s: PokemonBattleState) {
    setMySlots(mySlots.map((sl, i) => i === idx ? { ...sl, battleState: s } : sl))
  }

  const preloadSmogonSet = useCallback((pokemon: PokemonData): SmogonSet | null => {
    // 1. Sets generados por Claude (máxima prioridad — específicos para Champions)
    const claudeSet = getClaudeSet(pokemon.id)
    if (claudeSet) return claudeSet

    // 2. Sets de Smogon/Pikalytics como fallback
    const name = toSmogonName(pokemon.name.en, pokemon.id, pokemon.isMega)
    return getSmogonSet(smogonData, name)
  }, [smogonData])

  /** Guarda el equipo en Supabase. Requiere sesión activa. */
  async function saveTeam(): Promise<{ ok: boolean; msg: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { ok: false, msg: 'Inicia sesión para guardar en la nube.' }
      }
      const payload = mySlots.map((slot, i) => ({
        user_id:    user.id,
        slot_index: i,
        pokemon_id: slot.pokemon?.id ?? null,
        item:       slot.item,
        item_slug:  slot.itemSlug,
        ability:    slot.ability,
        nature:     slot.nature,
        sp_spread:  slot.sp,
        moves:      slot.moves,
      }))
      const { error } = await supabase.from('user_teams').upsert(payload, {
        onConflict: 'user_id,slot_index',
      })
      if (error) return { ok: false, msg: error.message }
      return { ok: true, msg: '¡Guardado en la nube!' }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, msg: `Error: ${msg}` }
    }
  }

  return (
    <Ctx.Provider value={{
      rivalSlots, setRivalSlots, updateRivalState,
      mySlots, setMySlots, updateMySlot, updateMyBattleState,
      smogonReady, smogonError, preloadSmogonSet, saveTeam,
    }}>
      {children}
    </Ctx.Provider>
  )
}
