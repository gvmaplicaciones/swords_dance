// src/lib/teamsDb.ts
// CRUD local de equipos — localStorage, sin auth

import type { MySlot } from '../store/BattleContext'
import { createDefaultBattleState } from './battleState'

export interface Team {
  id:    string
  name:  string
  slots: MySlot[]
}

const TEAMS_KEY     = 'sd_teams'
const ACTIVE_ID_KEY = 'sd_active_team_id'

function makeEmptySlots(): MySlot[] {
  return Array.from({ length: 6 }, () => ({
    pokemon: null,
    item: '', itemSlug: '', ability: '', nature: 'Hardy',
    sp: { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 },
    moves: [],
    battleState: createDefaultBattleState(0),
  }))
}

export function makeTeam(name: string, slots?: MySlot[]): Team {
  return {
    id:    Date.now().toString() + Math.random().toString(36).slice(2, 6),
    name,
    slots: slots ?? makeEmptySlots(),
  }
}

export function loadTeams(): Team[] {
  try { const v = localStorage.getItem(TEAMS_KEY); return v ? JSON.parse(v) : [] }
  catch { return [] }
}

export function saveTeams(teams: Team[]): void {
  try { localStorage.setItem(TEAMS_KEY, JSON.stringify(teams)) } catch {}
}

export function loadActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_ID_KEY) }
  catch { return null }
}

export function saveActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id)
    else localStorage.removeItem(ACTIVE_ID_KEY)
  } catch {}
}
