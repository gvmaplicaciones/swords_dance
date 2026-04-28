import { supabase } from './supabase'

interface AbilityEntry {
  name_en: string | null
  name_es: string | null
  name_ja: string | null
}

const _cache = new Map<string, AbilityEntry>()
let _loaded = false
let _loadPromise: Promise<void> | null = null

export async function preloadAbilities(): Promise<void> {
  if (_loaded) return
  if (_loadPromise) return _loadPromise
  _loadPromise = (async () => {
    const { data, error } = await supabase
      .from('abilities')
      .select('slug,name_en,name_es,name_ja')
    if (!error && data) {
      for (const row of data) {
        _cache.set(row.slug, {
          name_en: row.name_en,
          name_es: row.name_es,
          name_ja: row.name_ja,
        })
      }
    }
    _loaded = true
  })()
  return _loadPromise
}

function slugFallback(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function getAbilityName(slug: string, lang = 'es'): string {
  if (!slug) return ''
  const entry = _cache.get(slug)
  if (!entry) return slugFallback(slug)
  if (lang === 'es') return entry.name_es ?? entry.name_en ?? slugFallback(slug)
  if (lang === 'ja') return entry.name_ja ?? entry.name_en ?? slugFallback(slug)
  return entry.name_en ?? slugFallback(slug)
}
