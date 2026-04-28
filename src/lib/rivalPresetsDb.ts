// src/lib/rivalPresetsDb.ts
// CRUD de presets de sets rivales en Supabase.
// El userId siempre se deriva de la sesión activa — nunca se acepta como parámetro externo.

import { supabase } from './supabase'
import type { SPSpread } from './statCalc'

export interface RivalPreset {
  id:         string
  user_id:    string
  name:       string
  pokemon_id: number
  item:       string
  item_slug:  string
  ability:    string
  nature:     string
  sp_spread:  SPSpread
  moves:      string[]
  note:       string
  created_at: string
}

function validateSP(sp: SPSpread): string | null {
  for (const [key, val] of Object.entries(sp)) {
    if (val < 0 || val > 32) return `SP de ${key} fuera de rango (0–32)`
  }
  const total = (Object.values(sp) as number[]).reduce((a, b) => a + b, 0)
  if (total > 66) return `Total de SP supera 66 (${total})`
  return null
}

async function getAuthenticatedUserId(): Promise<{ userId: string | null; error: string | null }> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { userId: null, error: 'No hay sesión activa.' }
  return { userId: user.id, error: null }
}

export async function saveRivalPreset(params: {
  name:      string
  pokemonId: number
  item:      string
  itemSlug:  string
  ability:   string
  nature:    string
  sp:        SPSpread
  moves:     string[]
  note:      string
}): Promise<{ error: string | null }> {
  const { userId, error: authError } = await getAuthenticatedUserId()
  if (!userId) return { error: authError }

  const spError = validateSP(params.sp)
  if (spError) return { error: spError }

  const { error } = await supabase.from('rival_presets').insert({
    user_id:    userId,
    name:       params.name.trim() || 'Sin nombre',
    pokemon_id: params.pokemonId,
    item:       params.item,
    item_slug:  params.itemSlug,
    ability:    params.ability,
    nature:     params.nature,
    sp_spread:  params.sp,
    moves:      params.moves,
    note:       params.note,
  })
  return { error: error?.message ?? null }
}

export async function loadRivalPresets(): Promise<{ data: RivalPreset[]; error: string | null }> {
  const { userId, error: authError } = await getAuthenticatedUserId()
  if (!userId) return { data: [], error: authError }

  const { data, error } = await supabase
    .from('rival_presets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data: (data ?? []) as RivalPreset[], error: error?.message ?? null }
}

export async function deleteRivalPreset(id: string): Promise<{ error: string | null }> {
  const { userId, error: authError } = await getAuthenticatedUserId()
  if (!userId) return { error: authError }

  const { error } = await supabase
    .from('rival_presets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  return { error: error?.message ?? null }
}
