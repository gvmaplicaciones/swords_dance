# SwordsDance.app — Especificaciones MVP v5
*Documento preparado para Claude Code — incluye instrucciones técnicas completas*

---

## Visión del producto

Asistente de batalla para Pokémon Champions. El usuario apunta el móvil a la pantalla de la Switch y encuadra los 6 Pokémon rivales dentro de unos marcos guía. Al capturar, la app identifica cada Pokémon combinando reconocimiento de sprite y detección de tipo por color, devolviendo fichas con stats y sets competitivos. Durante la batalla, un panel de combate en vivo permite actualizar el estado real de cada Pokémon (Mega Evolución, boosts de stats, clima, estado) para mantener los cálculos siempre precisos.

**Propuesta de valor core:** información del rival en menos de 15 segundos, panel de combate en vivo usable con una mano, sin coste por uso, sin APIs externas en runtime.

---

## Stack tecnológico

- **Frontend:** React + Vite + Tailwind CSS
- **Deploy:** Vercel
- **Auth + DB:** Supabase (Google OAuth + PostgreSQL)
- **Reconocimiento:** @techstark/opencv-js (template matching local)
- **Datos Pokémon:** JSON estático generado desde PokeAPI (sin llamadas en runtime)
- **i18n:** i18next
- **PWA:** vite-plugin-pwa

---

## Design System — Paleta de colores

Extraída directamente del logo oficial de SwordsDance.app.

### Colores base
```css
:root {
  /* Fondos */
  --bg-primary:    #0a1628;   /* navy muy oscuro — fondo principal */
  --bg-secondary:  #0f1b2d;   /* navy oscuro — fondo de tarjetas */
  --bg-elevated:   #1a2d4a;   /* navy medio — elementos elevados */
  --bg-highlight:  #2a3f5a;   /* navy claro — hover, selección */

  /* Acento principal — cian eléctrico del logo */
  --cyan-bright:   #00d4ff;   /* cian eléctrico — bordes, iconos activos, glow */
  --cyan-mid:      #0099cc;   /* cian medio — elementos secundarios */
  --cyan-dark:     #0066aa;   /* cian oscuro — backgrounds de acento */
  --cyan-glow:     rgba(0, 212, 255, 0.25); /* glow difuso */

  /* Texto */
  --text-primary:  #e8f4ff;   /* blanco azulado — texto principal */
  --text-secondary:#8ab4cc;   /* azul grisáceo — texto secundario */
  --text-muted:    #4a6a88;   /* azul oscuro — texto desactivado */

  /* Semánticos (batalla) */
  --color-boost:   #00ff88;   /* verde — boost positivo */
  --color-debuff:  #ff4466;   /* rojo — debuff negativo */
  --color-neutral: #8ab4cc;   /* gris azulado — sin boost */
  --color-burn:    #ff6633;   /* naranja — quemado */
  --color-para:    #ffcc00;   /* amarillo — paralizado */
  --color-poison:  #cc44ff;   /* morado — envenenado */
  --color-sleep:   #6688aa;   /* azul gris — dormido */
  --color-freeze:  #aaddff;   /* azul claro — congelado */

  /* Bordes */
  --border-default: rgba(0, 212, 255, 0.2);
  --border-active:  rgba(0, 212, 255, 0.6);
  --border-subtle:  rgba(255, 255, 255, 0.08);
}
```

### Tailwind config (tailwind.config.js)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: {
          primary:   '#0a1628',
          secondary: '#0f1b2d',
          elevated:  '#1a2d4a',
          highlight: '#2a3f5a',
        },
        cyan: {
          bright: '#00d4ff',
          mid:    '#0099cc',
          dark:   '#0066aa',
        },
        boost:   '#00ff88',
        debuff:  '#ff4466',
        burn:    '#ff6633',
        para:    '#ffcc00',
        poison:  '#cc44ff',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'], // para stats y números
      },
      boxShadow: {
        'cyan-glow':   '0 0 12px rgba(0, 212, 255, 0.4)',
        'cyan-strong': '0 0 24px rgba(0, 212, 255, 0.6)',
        'card':        '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'app': '16px', // bordes de tarjetas de Pokémon
      }
    }
  }
}
```

### Aplicación por componente

**Fichas de Pokémon rival:**
- Fondo: `bg-secondary` con borde `border-cyan/20`
- Borde activo (tap): `border-cyan-bright` con `shadow-cyan-glow`
- Stats positivos: `text-boost` (verde)
- Stats negativos: `text-debuff` (rojo)

**Panel de combate:**
- Botones de boost +: `bg-boost/20 border-boost text-boost`
- Botones de boost -: `bg-debuff/20 border-debuff text-debuff`
- Valor neutro: `bg-bg-elevated text-text-secondary`

**Overlay del escáner:**
- Marcos de sprite: `stroke: var(--cyan-bright)` con glow
- Marcos de tipo: punteado, mismo color por slot
- Fondo oscuro: `rgba(10, 22, 40, 0.5)`

**Botón de captura:**
- Círculo exterior: `border: 4px solid white`
- Círculo interior: `background: var(--color-debuff)` (rojo)
- Al capturar: `background: var(--cyan-bright)`

---

## Estructura de carpetas

```
swordsdance/
├── public/assets/
│   ├── sprites/home/
│   │   ├── {id}.png
│   │   ├── female/{id}.png
│   │   ├── shiny/{id}.png
│   │   └── shiny/female/{id}.png
│   └── items/
│       └── {item-name}.png
├── src/
│   ├── data/pokemon.json
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── spriteMatching.ts
│   │   ├── typeDetection.ts
│   │   ├── battleState.ts         ← estado de combate en vivo
│   │   ├── statCalc.ts            ← cálculo de stats con boosts
│   │   └── damageCalc.ts
│   ├── components/
│   │   ├── ScannerOverlay.jsx
│   │   ├── BattleCard.tsx         ← ficha con panel de combate
│   │   └── StatBoostControl.tsx   ← control de boosts +/-
│   ├── screens/
│   ├── i18n/
│   └── main.tsx
├── scripts/
│   ├── downloadPokemon.js
│   ├── downloadSprites.js
│   └── downloadItems.js           ← nuevo: descarga sprites de objetos
└── .env.local
```

---

## Panel de combate en vivo

### Concepto

Cada ficha de Pokémon tiene un panel de estado que refleja la situación real en cada turno. Los stats mostrados y usados en la calculadora de daño son siempre los stats **efectivos** (base × boosts × modificadores de estado), no los stats base.

### Estado de combate por Pokémon

```typescript
// src/lib/battleState.ts

interface PokemonBattleState {
  pokemonId: number

  // Forma activa — cambia la ficha base
  activeForm: 'normal' | 'mega' | 'mega-x' | 'mega-y' | string
  // Si hay Mega, se carga el pokemonId de la Mega desde pokemon.json

  // Boosts de stats (etapas de -6 a +6)
  boosts: {
    atk: number    // -6 a +6
    def: number
    spAtk: number
    spDef: number
    spe: number
    acc: number    // precisión
    eva: number    // evasión
  }

  // Estado del Pokémon
  status: 'none' | 'burn' | 'paralysis' | 'poison' | 'badly-poison' | 'sleep' | 'freeze'

  // Modificadores de campo activos que afectan a este Pokémon
  weather: 'none' | 'sun' | 'rain' | 'sand' | 'hail' | 'snow'
  terrain: 'none' | 'electric' | 'grassy' | 'misty' | 'psychic'

  // Objeto confirmado visualmente durante la batalla
  confirmedItem: string | null

  // Habilidad confirmada visualmente
  confirmedAbility: string | null

  // Moves vistos en batalla
  seenMoves: string[]
}

// Estado inicial por defecto
export function createDefaultBattleState(pokemonId: number): PokemonBattleState {
  return {
    pokemonId,
    activeForm: 'normal',
    boosts: { atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0, acc: 0, eva: 0 },
    status: 'none',
    weather: 'none',
    terrain: 'none',
    confirmedItem: null,
    confirmedAbility: null,
    seenMoves: [],
  }
}
```

### Sistema de Stat Points de Champions

**Diferencias clave respecto al sistema clásico:**

| Concepto | Clásico (Scarlet/Violet) | Champions |
|---|---|---|
| IVs | 0-31, aleatorios | Siempre 31 (fijos) |
| EVs máx por stat | 252 | 32 SP |
| Total máximo | 510 EVs | 66 SP |
| Efecto en stat | +1 por cada 4 EVs | **+1 SP = +1 stat directo a nivel 50** |
| Conversión | — | 1 SP = 8 EVs equivalentes |

**Conversión de spreads de Smogon → Champions:**
Los datos de Smogon siguen siendo válidos. Se convierten automáticamente:
```
SP = Math.min(32, Math.round(evClásico / 8))
```
Ejemplos:
- `252 Atk` en Smogon → `32 SP Atk` en Champions (máximo)
- `4 Def` → `0-1 SP Def`
- `128 Spe` → `16 SP Spe`

### Cálculo de stats efectivos

```typescript
// src/lib/statCalc.ts
// Fórmula oficial de Pokémon Champions
// IVs siempre 31, SP se convierte a EVs equivalentes (SP × 8)

// ── Constantes ────────────────────────────────────────────────────────────────

const LEVEL = 50 // Champions siempre nivel 50
const IV = 31    // IVs siempre perfectos en Champions

// Tabla de multiplicadores de boost según etapa (-6 a +6)
const BOOST_MULTIPLIERS: Record<number, number> = {
  [-6]: 2/8, [-5]: 2/7, [-4]: 2/6, [-3]: 2/5, [-2]: 2/4, [-1]: 2/3,
  [0]: 1,
  [1]: 3/2, [2]: 2, [3]: 5/2, [4]: 3, [5]: 7/2, [6]: 4,
}

// Tabla completa de naturalezas
const NATURES: Record<string, { up: string; down: string } | null> = {
  Hardy: null, Docile: null, Serious: null, Bashful: null, Quirky: null, // neutras
  Lonely: { up: 'atk',   down: 'def'   },
  Brave:  { up: 'atk',   down: 'spe'   },
  Adamant:{ up: 'atk',   down: 'spAtk' },
  Naughty:{ up: 'atk',   down: 'spDef' },
  Bold:   { up: 'def',   down: 'atk'   },
  Relaxed:{ up: 'def',   down: 'spe'   },
  Impish: { up: 'def',   down: 'spAtk' },
  Lax:    { up: 'def',   down: 'spDef' },
  Timid:  { up: 'spe',   down: 'atk'   },
  Hasty:  { up: 'spe',   down: 'def'   },
  Jolly:  { up: 'spe',   down: 'spAtk' },
  Naive:  { up: 'spe',   down: 'spDef' },
  Modest: { up: 'spAtk', down: 'atk'   },
  Mild:   { up: 'spAtk', down: 'def'   },
  Quiet:  { up: 'spAtk', down: 'spe'   },
  Rash:   { up: 'spAtk', down: 'spDef' },
  Calm:   { up: 'spDef', down: 'atk'   },
  Gentle: { up: 'spDef', down: 'def'   },
  Sassy:  { up: 'spDef', down: 'spe'   },
  Careful:{ up: 'spDef', down: 'spAtk' },
}

// ── Conversión SP → stat real ─────────────────────────────────────────────────

// Convierte SP de Champions a EVs equivalentes para usar en la fórmula clásica
function spToEv(sp: number): number {
  return Math.min(32, sp) * 8  // 1 SP = 8 EVs, máx 32 SP = 256 EVs
}

// Convierte un spread de Smogon (EVs clásicos) a SPs de Champions
export function evSpreadToSP(evSpread: string): SPSpread {
  // Acepta formato: "252 Atk / 4 Def / 252 Spe" o "252/0/0/0/4/252"
  const defaults = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 }
  if (!evSpread) return defaults

  // Formato compacto: "252/0/0/4/0/252"
  if (/^\d+\/\d+\/\d+\/\d+\/\d+\/\d+$/.test(evSpread.trim())) {
    const [hp, atk, def, spAtk, spDef, spe] = evSpread.split('/').map(Number)
    return {
      hp:    Math.min(32, Math.round(hp    / 8)),
      atk:   Math.min(32, Math.round(atk   / 8)),
      def:   Math.min(32, Math.round(def   / 8)),
      spAtk: Math.min(32, Math.round(spAtk / 8)),
      spDef: Math.min(32, Math.round(spDef / 8)),
      spe:   Math.min(32, Math.round(spe   / 8)),
    }
  }

  // Formato Smogon: "252 Atk / 4 Def / 252 Spe"
  const result = { ...defaults }
  const statMap: Record<string, keyof SPSpread> = {
    'HP': 'hp', 'Atk': 'atk', 'Def': 'def',
    'SpA': 'spAtk', 'SpD': 'spDef', 'Spe': 'spe'
  }
  evSpread.split('/').forEach(part => {
    const match = part.trim().match(/(\d+)\s+(\w+)/)
    if (match) {
      const ev = parseInt(match[1])
      const statKey = statMap[match[2]]
      if (statKey) result[statKey] = Math.min(32, Math.round(ev / 8))
    }
  })
  return result
}

interface SPSpread {
  hp: number; atk: number; def: number
  spAtk: number; spDef: number; spe: number
}

// ── Fórmula de stat base de Champions ────────────────────────────────────────
// Misma fórmula clásica pero con IVs=31 fijos y SP convertidos a EVs

function calcBaseStat(
  base: number,
  sp: number,
  statName: string,
  nature: string,
  isHP: boolean
): number {
  const ev = spToEv(sp)
  if (isHP) {
    return Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + LEVEL + 10)
  }
  const natureMultiplier = getNatureMultiplier(nature, statName)
  return Math.floor(
    Math.floor(((2 * base + IV + Math.floor(ev / 4)) * LEVEL / 100) + 5) * natureMultiplier
  )
}

function getNatureMultiplier(nature: string, statName: string): number {
  const n = NATURES[nature]
  if (!n) return 1
  if (n.up === statName)   return 1.1
  if (n.down === statName) return 0.9
  return 1
}

// ── Función principal exportada ───────────────────────────────────────────────

export interface BaseStats {
  hp: number; atk: number; def: number
  spAtk: number; spDef: number; spe: number
}

export interface EffectiveStats extends BaseStats {
  // Stats con todos los modificadores aplicados: SP + naturaleza + boost + estado
}

export function calcEffectiveStats(
  baseStats: BaseStats,
  battleState: PokemonBattleState,
  sp: SPSpread,       // Stat Points del set competitivo (ya en formato Champions)
  nature: string = 'Hardy'
): EffectiveStats {

  // 1. Stat base con SP y naturaleza (IVs=31 fijos, nivel=50 fijo)
  const rawHP    = calcBaseStat(baseStats.hp,    sp.hp,    'hp',    nature, true)
  const rawAtk   = calcBaseStat(baseStats.atk,   sp.atk,   'atk',   nature, false)
  const rawDef   = calcBaseStat(baseStats.def,   sp.def,   'def',   nature, false)
  const rawSpAtk = calcBaseStat(baseStats.spAtk, sp.spAtk, 'spAtk', nature, false)
  const rawSpDef = calcBaseStat(baseStats.spDef, sp.spDef, 'spDef', nature, false)
  const rawSpe   = calcBaseStat(baseStats.spe,   sp.spe,   'spe',   nature, false)

  // 2. Aplicar boosts de etapa
  const applyBoost = (stat: number, boost: number) =>
    Math.floor(stat * BOOST_MULTIPLIERS[Math.max(-6, Math.min(6, boost))])

  // 3. Aplicar modificadores de estado
  const applyStatus = (stat: number, statName: string) => {
    if (statName === 'atk' && battleState.status === 'burn')      return Math.floor(stat * 0.5)
    if (statName === 'spe' && battleState.status === 'paralysis') return Math.floor(stat * 0.5)
    return stat
  }

  return {
    hp:    rawHP, // HP no se afecta por boosts en batalla (solo por stat stages separados)
    atk:   applyStatus(applyBoost(rawAtk,   battleState.boosts.atk),   'atk'),
    def:   applyBoost(rawDef,   battleState.boosts.def),
    spAtk: applyBoost(rawSpAtk, battleState.boosts.spAtk),
    spDef: applyBoost(rawSpDef, battleState.boosts.spDef),
    spe:   applyStatus(applyBoost(rawSpe, battleState.boosts.spe), 'spe'),
  }
}

// ── Helper: stat mínimo y máximo posibles (para rangos en la calculadora) ─────
// El rival puede tener cualquier naturaleza y spread de SP → rango de incertidumbre

export function calcStatRange(
  base: number,
  statName: string,
  isHP: boolean,
  boost: number = 0
): { min: number; max: number } {
  const spMin = 0
  const spMax = 32
  const natureMinus = 0.9
  const naturePlus  = 1.1
  const natureNeut  = 1.0

  const rawMin = calcBaseStat(base, spMin, statName, '', isHP) // sin SP, naturaleza reducida
  const rawMax = calcBaseStat(base, spMax, statName, '', isHP) // máx SP, naturaleza aumentada

  // Aplicar naturaleza manualmente para min/max
  const statMin = isHP ? rawMin : Math.floor(rawMin * natureMinus)
  const statMax = isHP ? rawMax : Math.floor(rawMax * naturePlus)

  return {
    min: Math.floor(statMin * BOOST_MULTIPLIERS[Math.max(-6, Math.min(6, boost))]),
    max: Math.floor(statMax * BOOST_MULTIPLIERS[Math.max(-6, Math.min(6, boost))]),
  }
}
  return 1
}
```

### Componente BattleCard

La ficha de batalla de cada Pokémon tiene dos modos:

**Modo resumen (vista grid 2×3):** sprite + nombre + tipos + stats efectivos actuales + indicadores de estado activos (iconos pequeños de boost/estado/forma)

**Modo expandido (tap en la ficha):** panel de combate completo

```typescript
// src/components/BattleCard.tsx
// Props:
// - pokemon: datos del Pokémon desde pokemon.json
// - battleState: PokemonBattleState
// - onStateChange: (newState: PokemonBattleState) => void
// - myPokemon: mi Pokémon activo (para calculadora integrada)
```

### UI del panel de combate expandido

```
┌─────────────────────────────────────────┐
│  [sprite]  Garchomp          [MEGA ▶]  │
│            Dragon / Ground              │
├─────────────────────────────────────────┤
│  FORMA                                  │
│  [Normal ●] [Mega ○]                   │
├─────────────────────────────────────────┤
│  BOOSTS                      efectivo  │
│  ATK   [−][−2][−1][ 0 ][+1][+2][+]   195│
│  DEF   [−][−2][−1][ 0 ][+1][+2][+]   142│
│  SpA   [−][−2][−1][ 0 ][+1][+2][+]   120│
│  SpD   [−][−2][−1][ 0 ][+1][+2][+]   127│
│  SPE   [−][−2][−1][ 0 ][+1][+2][+]   153│
├─────────────────────────────────────────┤
│  ESTADO                                 │
│  [—][🔥][⚡][☠][😴][❄][PSN]           │
├─────────────────────────────────────────┤
│  CLIMA/TERRENO                          │
│  [—][☀][🌧][🌪][❄][⚡T][🌿T][🌫T][🔮T]│
├─────────────────────────────────────────┤
│  [Calcular daño con estos stats →]      │
└─────────────────────────────────────────┘
```

### StatBoostControl — control de boosts

Botones de tap rápido para subir/bajar etapas. El valor actual siempre visible en el centro. Tap en el número para reset a 0.

```typescript
// src/components/StatBoostControl.tsx
// Props: statName, value (-6 a +6), onChange
// UX: botones − y + grandes (mínimo 44px), valor central en color
//   verde si positivo, rojo si negativo, gris si 0
// Tap en valor → reset a 0 (útil cuando el rival usa Haze o cambia)
```

### Mega Evolución

Cuando el usuario pulsa [MEGA]:
1. La app busca en `pokemon.json` la entrada de la Mega del Pokémon actual
   - Las Megas tienen IDs propios en PokeAPI (ej: Mega Garchomp = ID 10058)
   - Están incluidas en el dataset de 229 Pokémon de Champions
2. Carga la ficha de la Mega: nuevo sprite HOME, nuevos stats base, nuevo/s tipo/s si cambian
3. Los boosts aplicados se mantienen (la Mega no resetea los boosts)
4. El sprite en la ficha cambia al de la Mega
5. Botón [← Normal] para revertir (no ocurre en batalla pero útil para corrección)

```typescript
// En pokemon.json, las Megas referencian al Pokémon base:
{
  "id": 10058,
  "name": { "en": "Mega Garchomp", "es": "Mega Garchomp", "ja": "メガガブリアス" },
  "baseForm": 445,        // ← ID del Pokémon base
  "isMega": true,
  "megaOf": 445,
  "types": ["Dragon", "Ground"],
  "baseStats": { "hp": 108, "atk": 170, "def": 115, "spAtk": 120, "spDef": 95, "spe": 92 },
  // ...
}

// En el Pokémon base, referencia a sus Megas:
{
  "id": 445,
  "name": { "en": "Garchomp", ... },
  "megaEvolutions": [10058],  // IDs de sus Megas
  // ...
}
```

---

## Zonas de captura calibradas

### Equipo rival (fondo rosa/rojo) — calibrado para distancia óptima ~40cm

El usuario centra la Switch en la mitad inferior del visor a ~40cm.
La pantalla ocupa aprox x:5%-50%, y:42%-90% de la imagen capturada.

```typescript
export const SPRITE_ZONES = [
  { slot: 0, x: 0.07, y: 0.43, w: 0.13, h: 0.07 },
  { slot: 1, x: 0.07, y: 0.52, w: 0.13, h: 0.07 },
  { slot: 2, x: 0.07, y: 0.61, w: 0.13, h: 0.07 },
  { slot: 3, x: 0.07, y: 0.70, w: 0.13, h: 0.07 },
  { slot: 4, x: 0.07, y: 0.79, w: 0.13, h: 0.07 },
  { slot: 5, x: 0.07, y: 0.85, w: 0.13, h: 0.06 },
]

export const TYPE_ZONES = [
  { slot: 0, x: 0.24, y: 0.43, w: 0.12, h: 0.05 },
  { slot: 1, x: 0.24, y: 0.52, w: 0.12, h: 0.05 },
  { slot: 2, x: 0.24, y: 0.61, w: 0.12, h: 0.05 },
  { slot: 3, x: 0.24, y: 0.70, w: 0.12, h: 0.05 },
  { slot: 4, x: 0.24, y: 0.79, w: 0.12, h: 0.05 },
  { slot: 5, x: 0.24, y: 0.85, w: 0.12, h: 0.04 },
]
```

### Equipo propio (fondo azul) — calibrado con foto real

Distribución confirmada: **icono objeto izquierda · nombre+género centro · sprite derecha**
No hay iconos de tipo visibles en esta pantalla → solo 2 zonas por slot.

**Nota importante:** los Pokémon pueden tener motes personalizados → NO usar OCR del nombre.
El reconocimiento es siempre por template matching del sprite, igual que el equipo rival.

```typescript
// Zona A: sprite del Pokémon (derecha de cada tarjeta azul)
export const MY_SPRITE_ZONES = [
  { slot: 0, x: 0.62, y: 0.18, w: 0.22, h: 0.10 },
  { slot: 1, x: 0.62, y: 0.30, w: 0.22, h: 0.10 },
  { slot: 2, x: 0.62, y: 0.42, w: 0.22, h: 0.10 },
  { slot: 3, x: 0.62, y: 0.54, w: 0.22, h: 0.10 },
  { slot: 4, x: 0.62, y: 0.66, w: 0.22, h: 0.10 },
  { slot: 5, x: 0.62, y: 0.78, w: 0.22, h: 0.10 },
]

// Zona C: icono de objeto (izquierda de cada tarjeta azul, icono pequeño)
export const MY_ITEM_ZONES = [
  { slot: 0, x: 0.08, y: 0.20, w: 0.08, h: 0.07 },
  { slot: 1, x: 0.08, y: 0.32, w: 0.08, h: 0.07 },
  { slot: 2, x: 0.08, y: 0.44, w: 0.08, h: 0.07 },
  { slot: 3, x: 0.08, y: 0.56, w: 0.08, h: 0.07 },
  { slot: 4, x: 0.08, y: 0.68, w: 0.08, h: 0.07 },
  { slot: 5, x: 0.08, y: 0.80, w: 0.08, h: 0.07 },
]
// Sin MY_TYPE_ZONES — los tipos no son visibles en la pantalla del equipo propio
```

---

## Sistema de reconocimiento dual (sprite + tipo)

### Concepto

Cada slot se analiza con dos zonas simultáneas:
- **Zona A (marco sólido):** sprite → template matching OpenCV → top 5 candidatos
- **Zona B (marco punteado):** iconos de tipo → detección de color dominante
- **Combinación:** boost +0.25 si tipo coincide → desempata Pokémon similares

### Paleta de tipos (src/lib/typeDetection.ts)

```typescript
const TYPE_COLOR_RANGES = {
  normal:   { h: [0,   30],  s: [0,  20]  },
  fire:     { h: [15,  40],  s: [80, 100] },
  water:    { h: [195, 225], s: [70, 100] },
  electric: { h: [45,  65],  s: [85, 100] },
  grass:    { h: [90,  140], s: [50, 100] },
  ice:      { h: [185, 210], s: [50, 90]  },
  fighting: { h: [0,   20],  s: [60, 90]  },
  poison:   { h: [270, 310], s: [50, 90]  },
  ground:   { h: [30,  50],  s: [50, 80]  },
  flying:   { h: [200, 240], s: [40, 75]  },
  psychic:  { h: [320, 355], s: [70, 100] },
  bug:      { h: [65,  100], s: [40, 80]  },
  rock:     { h: [35,  55],  s: [20, 50]  },
  ghost:    { h: [255, 285], s: [25, 60]  },
  dragon:   { h: [220, 265], s: [60, 100] },
  dark:     { h: [20,  45],  s: [20, 50]  },
  steel:    { h: [195, 230], s: [15, 45]  },
  fairy:    { h: [310, 350], s: [50, 90]  },
}
```

---

## INSTRUCCIONES API 1 — Supabase Auth + DB

### Instalación
```bash
npm install @supabase/supabase-js
```

### Cliente (src/lib/supabase.ts)
```typescript
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### Google OAuth
```typescript
async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
}
async function signOut() { await supabase.auth.signOut() }

// En App.tsx
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => setSession(session)
  )
  return () => subscription.unsubscribe()
}, [])
```

### Configuración Supabase Dashboard
1. Authentication > Providers > Google → activar
2. Google Cloud Console:
   - Authorized JavaScript origins: `http://localhost:5173` + `https://swordsdance.app`
   - Authorized redirect URIs: `https://TU_PROJECT_ID.supabase.co/auth/v1/callback`

### Esquema SQL
```sql
create table teams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Mi equipo',
  pokemon jsonb not null default '[]',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table teams enable row level security;
create policy "Users manage own teams" on teams for all using (auth.uid() = user_id);

create table user_preferences (
  user_id uuid references auth.users on delete cascade primary key,
  language text default 'es',
  dark_mode boolean default true,
  created_at timestamptz default now()
);
alter table user_preferences enable row level security;
create policy "Users manage own prefs" on user_preferences for all using (auth.uid() = user_id);
```

---

## INSTRUCCIONES API 2 — PokeAPI (solo para generar dataset)

### Script Pokémon (scripts/downloadPokemon.js)
```javascript
const fs = require('fs'), path = require('path')
const CHAMPIONS_IDS = [ /* 229 IDs + IDs de Megas */ ]

async function fetchPokemon(id) {
  const [data, speciesData] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r => r.json()),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`).then(r => r.json())
      .catch(() => null) // las Megas no tienen species endpoint
  ])
  const getName = lang => speciesData?.names?.find(n => n.language.name === lang)?.name || data.name
  const stats = Object.fromEntries(data.stats.map(s => [s.stat.name.replace(/-/g,'_'), s.base_stat]))
  const isMega = data.name.includes('-mega') || data.name.includes('mega-')
  return {
    id,
    name: { en: getName('en'), es: getName('es'), ja: getName('ja') },
    types: data.types.map(t => t.type.name),
    baseStats: { hp: stats.hp, atk: stats.attack, def: stats.defense,
                 spAtk: stats.special_attack, spDef: stats.special_defense, spe: stats.speed },
    sprites: {
      normal:      data.sprites.other?.home?.front_default || null,
      female:      data.sprites.other?.home?.front_female || null,
      shiny:       data.sprites.other?.home?.front_shiny || null,
      shinyFemale: data.sprites.other?.home?.front_shiny_female || null,
    },
    abilities: data.abilities.map(a => ({ name: a.ability.name, hidden: a.is_hidden })),
    isMega,
    megaOf: isMega ? /* ID del base */ null : undefined,
    megaEvolutions: [], // rellenar manualmente con IDs de Megas
    competitiveSets: []
    // Formato de cada set:
    // {
    //   name: { en, es, ja },
    //   item: "choice-scarf",
    //   ability: "rough-skin",
    //   moves: ["earthquake", "dragon-claw", "iron-head", "stone-edge"],
    //   sp: { hp: 0, atk: 32, def: 2, spAtk: 0, spDef: 0, spe: 32 },
    //   // sp = Stat Points de Champions (máx 32 por stat, 66 total)
    //   // Conversión desde Smogon: Math.min(32, Math.round(smogonEV / 8))
    //   // Ejemplo: "252 Atk / 4 Def / 252 Spe" → { atk:32, def:0, spe:32 }
    //   smogonRef: "252 Atk / 4 Def / 252 Spe", // spread original de referencia
    //   nature: "Jolly",
    //   usage: 0.72
    // }
  }
}

async function main() {
  const pokemon = []
  for (const id of CHAMPIONS_IDS) {
    pokemon.push(await fetchPokemon(id))
    await new Promise(r => setTimeout(r, 200))
  }
  fs.writeFileSync('../src/data/pokemon.json', JSON.stringify(pokemon, null, 2))
}
main()
```

### Script sprites (scripts/downloadSprites.js)
```javascript
// Descarga sprites HOME a /public/assets/sprites/home/
// normal + shiny + female + shinyFemale si existen
```

### Script objetos (scripts/downloadItems.js) — NUEVO
```javascript
const fs = require('fs'), path = require('path'), https = require('https')

// Lista de objetos competitivos usados en Champions
// Fuente: smogon.com/stats — items más usados
const COMPETITIVE_ITEMS = [
  'choice-scarf', 'choice-band', 'choice-specs',
  'life-orb', 'focus-sash', 'rocky-helmet',
  'assault-vest', 'leftovers', 'black-sludge',
  'lum-berry', 'sitrus-berry', 'weakness-policy',
  'safety-goggles', 'eviolite', 'light-clay',
  'heat-rock', 'damp-rock', 'icy-rock', 'smooth-rock',
  'terrain-extender', 'red-card', 'iron-ball',
  'flame-orb', 'toxic-orb', 'expert-belt',
  'wide-lens', 'zoom-lens', 'kings-rock',
  // añadir todos los disponibles en Champions
]

const BASE = path.join(__dirname, '../public/assets/items')
fs.mkdirSync(BASE, { recursive: true })

function download(url, dest) {
  return new Promise(resolve => {
    if (!url || fs.existsSync(dest)) return resolve()
    const file = fs.createWriteStream(dest)
    https.get(url, res => { res.pipe(file); file.on('finish', () => file.close(resolve)) })
  })
}

async function main() {
  for (const item of COMPETITIVE_ITEMS) {
    const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item}.png`
    await download(url, `${BASE}/${item}.png`)
    console.log(`✓ ${item}`)
  }
}
main()
```

---

## INSTRUCCIONES API 3 — Reconocimiento (OpenCV + detección de tipo)

### Instalación
```bash
npm install @techstark/opencv-js
```

### Vite config
```typescript
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ['@techstark/opencv-js'] }
})
```

### Identificación combinada (src/lib/spriteMatching.ts)
```typescript
export async function identifyPokemon(
  spriteCrop: ImageData,
  typeCrop: ImageData,
  allPokemon: any[]
): Promise<{ id: number; name: string; types: string[]; score: number } | null> {
  const cv = await getOpenCv()
  const capturedMat = cv.matFromImageData(spriteCrop)
  const detectedType = detectTypeFromImageData(typeCrop)

  let candidates = []
  for (const pokemon of allPokemon) {
    // Ignorar Megas en el escaneo inicial (el usuario activa Mega manualmente)
    if (pokemon.isMega) continue

    const variants = [pokemon.sprites.normal, pokemon.sprites.shiny,
                      pokemon.sprites.female, pokemon.sprites.shinyFemale].filter(Boolean)
    let bestScore = 0
    for (const url of variants) {
      const refMat = await loadSpriteMat(url)
      const score = await compareSprites(capturedMat, refMat)
      refMat.delete()
      if (score > bestScore) bestScore = score
    }
    candidates.push({ id: pokemon.id, name: pokemon.name.en, types: pokemon.types, score: bestScore })
  }

  capturedMat.delete()
  candidates.sort((a, b) => b.score - a.score)
  const top5 = candidates.slice(0, 5)

  if (detectedType) {
    top5.forEach(c => { if (c.types.includes(detectedType)) c.score += 0.25 })
    top5.sort((a, b) => b.score - a.score)
  }

  return top5[0]?.score >= 0.6 ? top5[0] : null
}
```

**Nota sobre Megas en el reconocimiento:**
Las Megas se excluyen del escaneo inicial — el usuario activa la Mega manualmente desde el panel de combate. Esto evita confusión entre forma normal y Mega, que pueden tener sprites muy distintos.

---

## Pantallas

### 1. Login
- Botón "Continuar con Google"

### 2. Home / Mi equipo
- 6 Pokémon propios con sprites HOME
- Botón "Escanear rival" + botón "Escanear mi equipo"

### 3. Escáner
- Cámara en vivo con overlay dual (marcos sólidos sprite + punteados tipo)
- Detección automática de modo por color de fondo: rosa=rival, azul=mi equipo
- Cuenta atrás 3s + captura + identificación local

### 4. Fichas del rival — vista grid
- 6 minifichas 2×3
- Cada ficha muestra: sprite + nombre + tipos + stats efectivos actuales
- Indicadores visuales de estado activo: boost (+), debuff (−), quemado, paralizado, etc.
- Tap → panel de combate expandido

### 5. Panel de combate expandido (BattleCard)

**Sección forma:**
- Botones [Normal] [Mega] — si el Pokémon tiene Megas disponibles
- Al activar Mega: carga stats de la Mega, cambia sprite, mantiene boosts

**Sección boosts:**
```
ATK  [−] [−2] [−1] [ 0 ] [+1] [+2] [+]   → stat efectivo: 195
DEF  [−] [−2] [−1] [ 0 ] [+1] [+2] [+]   → stat efectivo: 142
SpA  [−] [−2] [−1] [ 0 ] [+1] [+2] [+]   → stat efectivo: 120
SpD  [−] [−2] [−1] [ 0 ] [+1] [+2] [+]   → stat efectivo: 127
SPE  [−] [−2] [−1] [ 0 ] [+1] [+2] [+]   → stat efectivo: 153
```
- Botones − y + para subir/bajar de uno en uno
- Tap en el valor numérico → reset a 0
- Color verde si positivo, rojo si negativo, gris si 0

**Sección estado:**
- Iconos tapables: Normal / Quemado / Paralizado / Envenenado / MalEnv / Dormido / Congelado
- Solo uno activo a la vez
- Quemado muestra aviso: "ATK ×0.5"
- Paralizado muestra aviso: "SPE ×0.5"

**Sección clima/terreno:**
- Clima: Normal / Sol / Lluvia / Arena / Granizo / Nieve
- Terreno: Ninguno / Eléctrico / Herboso / Brumoso / Psíquico
- Afectan automáticamente a los stats y daño calculado

**Sección objetos/habilidad confirmados:**
- "Vi este objeto" → selector con sprites de objetos
- "Vi esta habilidad" → selector de habilidades del Pokémon

**Botón calculadora:**
- "¿Me mata?" → abre calculadora con stats efectivos precargados

### 6. Calculadora de daño
- Usa siempre los stats efectivos del panel de combate (con boosts, estado, clima)
- Selector mi Pokémon vs rival + move
- Resultado: rango % HP + veredicto

### 7. Editor de equipo propio
- Buscador + slots con objeto/habilidad/moves → guardado en Supabase

---

## UX — Principios de diseño para el panel de combate

- **Tap targets mínimo 48px** especialmente en los botones de boost − y +
- **Feedback visual inmediato** — el stat efectivo se actualiza en tiempo real al tocar
- **Reset rápido** — tap en el valor del boost lo resetea a 0, útil cuando el rival cambia de Pokémon
- **Botón "Reset todo"** al final del panel — limpia todos los boosts y estado del Pokémon
- **Modo oscuro** — se usa en habitaciones con TV encendida
- **Sin confirmaciones** — cada tap aplica inmediatamente, sin "¿estás seguro?"

---

## Internacionalización

- Idiomas: ES (default), EN, JA
- Nombres de stats, estados, clima y terreno traducidos en los 3 idiomas
- Los nombres de Pokémon, moves y habilidades vienen del JSON (3 idiomas)

---

## Monetización

- **Free:** todo ilimitado + banner ads entre fichas (nunca en panel de combate activo)
- **Premium ~1.99€/mes:** sin ads + múltiples equipos guardados
- **Coste operativo:** ~20€/año (solo dominio)

---

## Roadmap

### Fase 1 — Dataset (3-4h)
- [ ] 229 IDs de Champions + IDs de Megas disponibles
- [ ] `node scripts/downloadPokemon.js` → pokemon.json
- [ ] Añadir campos `isMega`, `megaOf`, `megaEvolutions` a las entradas correspondientes
- [ ] `node scripts/downloadSprites.js` → sprites HOME
- [ ] `node scripts/downloadItems.js` → sprites de objetos competitivos
- [ ] Sets competitivos desde smogon.com/stats

### Fase 2 — Scaffold (1h)
- [ ] React + Vite + Tailwind + dependencias
- [ ] Setup Supabase + SQL + Google OAuth
- [ ] .env.local

### Fase 3 — Auth (2h)
- [ ] supabase.ts + hook useAuth()
- [ ] Pantalla Login + rutas protegidas

### Fase 4 — Reconocimiento dual (5-7h) ← más crítico
- [ ] typeDetection.ts + tests
- [ ] spriteMatching.ts con identificación combinada (excluir Megas del scan)
- [ ] ScannerOverlay.jsx con overlay dual
- [ ] Calibrar SPRITE_ZONES, TYPE_ZONES, MY_*_ZONES con fotos reales
- [ ] UI corrección manual para baja confianza

### Fase 5 — Panel de combate (4-5h) ← nuevo
- [ ] battleState.ts + createDefaultBattleState()
- [ ] statCalc.ts con tabla de boosts y modificadores de estado
- [ ] StatBoostControl.tsx — control de boosts con tap rápido
- [ ] BattleCard.tsx — ficha expandida con panel completo
- [ ] Lógica de Mega Evolución (carga nueva ficha, mantiene boosts)
- [ ] Integración con calculadora de daño (stats efectivos)

### Fase 6 — Pantallas core (4-6h)
- [ ] Home, Grid de fichas, Ficha expandida, Editor de equipo

### Fase 7 — Calculadora de daño actualizada (2-3h)
- [ ] damageCalc.ts usando stats efectivos del battleState
- [ ] UI calculadora integrada en BattleCard

### Fase 8 — Polish (2h)
- [ ] i18n ES/EN/JA + modo oscuro + PWA

### Fase 9 — Deploy (1h)
- [ ] Vercel + dominio swordsdance.app + Analytics

**Total estimado: 24-32h · Con Claude Code: 4-5 días**

---

## Variables de entorno

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Fase 10 — SEO, i18n, Monetización y Landing Page

### Estructura de URLs i18n
```
swordsdance.app/        → ES (detección automática por navigator.language)
swordsdance.app/en/     → EN
swordsdance.app/ja/     → JA
```

### hreflang en index.html
```html
<link rel="alternate" hreflang="es" href="https://swordsdance.app/" />
<link rel="alternate" hreflang="en" href="https://swordsdance.app/en/" />
<link rel="alternate" hreflang="ja" href="https://swordsdance.app/ja/" />
<link rel="alternate" hreflang="x-default" href="https://swordsdance.app/en/" />
```

### Meta tags por idioma (React Helmet o equivalente)
```html
<!-- ES -->
<title>SwordsDance — Asistente de batalla para Pokémon Champions</title>
<meta name="description" content="Escanea el equipo rival, calcula daño en tiempo real y consulta sets competitivos. Gratis para Pokémon Champions." />

<!-- EN -->
<title>SwordsDance — Battle Assistant for Pokémon Champions</title>
<meta name="description" content="Scan the rival team, calculate damage in real time and check competitive sets. Free for Pokémon Champions." />

<!-- JA -->
<title>SwordsDance — ポケモンチャンピオンズ 対戦アシスタント</title>
<meta name="description" content="相手チームをスキャンし、リアルタイムでダメージ計算。ポケモンチャンピオンズ向け無料ツール。" />
```

### Keywords objetivo por idioma
- ES: "calculadora daño Pokemon Champions", "asistente batalla Pokemon Champions", "sets competitivos Pokemon Champions", "escanear equipo rival Champions"
- EN: "Pokemon Champions damage calculator", "Pokemon Champions battle tool", "Pokemon Champions team scanner", "competitive sets Champions"
- JA: "ポケモンチャンピオンズ ダメージ計算", "ポケモンチャンピオンズ 対戦ツール", "ポケモンチャンピオンズ スキャン"

### Landing page (ruta /)
Página estática SSG (Vite SSG o equivalente) con:

- Hero: logo + H1 en idioma activo + descripción de 2 líneas
- GIF o video corto del escáner funcionando (máximo 5 segundos)
- 3 features cards: Escaneo instantáneo / Sets Smogon precargados / Calculadora en combate
- FAQ básico (¿qué es?, ¿cómo funciona?, ¿es gratis?, ¿funciona con Switch 2?)
- Botón CTA "Empezar ahora" → entra a la app
- Footer con enlaces a ES/EN/JA

### Monetización con anuncios
Usar Google Ad Manager (no AdSense básico — más control).

Posiciones de anuncio permitidas (donde el usuario NO tiene prisa):
1. Pantalla de inicio — banner 320×50 debajo del logo antes de entrar
2. Editor de mi equipo — banner 320×50 al pie de la pantalla
3. Transición post-escaneo — mientras carga el set Smogon (1-2 segundos)

Posiciones de anuncio PROHIBIDAS (el usuario está en combate):
- Pantalla VS
- Calculadora de daño
- Panel de boosts/estado rival
- Cualquier pantalla con el reloj corriendo

Implementar también opción premium "Sin anuncios" con dos planes via Stripe:
- Mensual: 2.99€/mes
- Anual: 24.99€/año (mostrar como "= 2.08€/mes · Ahorras 11€")
- Presentar el anual con badge "⭐ Más popular" para dirigir la elección
- Se guarda en Supabase asociado al user_id con fecha de expiración
- Al estar activo, no se renderizan los componentes de anuncio

### sitemap.xml
Generar sitemap con las 3 versiones de idioma:
```xml
<url><loc>https://swordsdance.app/</loc><hreflang>es</hreflang></url>
<url><loc>https://swordsdance.app/en/</loc><hreflang>en</hreflang></url>
<url><loc>https://swordsdance.app/ja/</loc><hreflang>ja</hreflang></url>
```

### robots.txt
```
User-agent: *
Allow: /
Sitemap: https://swordsdance.app/sitemap.xml
```

### Google Search Console + Analytics
- Verificar los 3 dominios/rutas en Search Console
- Google Analytics 4 con eventos: scan_completed, vs_opened, damage_calculated, premium_purchased
*Panel de combate en vivo · Mega Evolución · Boosts de stats · Estados y clima*
*Reconocimiento dual sprite+tipo · Google login · Supabase · Coste €0/mes*
