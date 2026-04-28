// src/lib/analytics.ts
// GA4 event tracking helpers
// Initialize GA4 by adding gtag.js to index.html with your Measurement ID

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function track(eventName: string, params?: Record<string, unknown>) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params)
    }
  } catch {
    // Silently ignore analytics errors
  }
}

export const analytics = {
  scanCompleted:      (pokemonCount: number) =>
    track('scan_completed', { pokemon_count: pokemonCount }),

  vsOpened:           (myPokemon: string, rivalPokemon: string) =>
    track('vs_opened', { my_pokemon: myPokemon, rival_pokemon: rivalPokemon }),

  damageCalculated:   (moveName: string, verdict: string, minPct: number, maxPct: number) =>
    track('damage_calculated', { move: moveName, verdict, min_pct: minPct, max_pct: maxPct }),

  premiumPurchased:   (plan: 'monthly' | 'yearly') =>
    track('premium_purchased', { plan }),

  premiumPageViewed:  () =>
    track('premium_page_viewed'),

  teamSaved:          () =>
    track('team_saved'),
}
