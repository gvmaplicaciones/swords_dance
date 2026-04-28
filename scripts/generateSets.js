// scripts/generateSets.js
// Genera sets competitivos para todos los Pokémon de Champions usando Claude Sonnet
// Ejecutar: node scripts/generateSets.js
//
// Requisitos previos:
//   1. downloadMoves.mjs ya ejecutado — tabla pokemon_moves en Supabase
//   2. ANTHROPIC_API_KEY en .env.local
//   3. npm install @anthropic-ai/sdk

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Leer .env.local ──────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, "../.env.local")
  if (!fs.existsSync(envPath)) return {}
  const raw = fs.readFileSync(envPath, "utf8")
  const env = {}
  for (const line of raw.split("\n")) {
    const [k, ...v] = line.split("=")
    if (k?.trim() && v.length) env[k.trim()] = v.join("=").trim()
  }
  return env
}

const ENV = loadEnv()
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ENV.ANTHROPIC_API_KEY
const SUPABASE_URL  = process.env.SUPABASE_URL      || ENV.VITE_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_KEY      || ENV.VITE_SUPABASE_ANON_KEY

if (!ANTHROPIC_KEY) { console.error("❌ Falta ANTHROPIC_API_KEY en .env.local"); process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local"); process.exit(1) }

// ─── Config ───────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Objetos disponibles en Champions (sin Mega Piedras) ─────────────────────
const AVAILABLE_ITEMS = [
  // Bayas de estado
  "cheri-berry", "chesto-berry", "pecha-berry", "rawst-berry", "aspear-berry",
  "leppa-berry", "oran-berry", "persim-berry", "lum-berry", "sitrus-berry",
  // Bayas resistencia
  "occa-berry", "passho-berry", "wacan-berry", "rindo-berry", "yache-berry",
  "chople-berry", "kebia-berry", "shuca-berry", "coba-berry", "payapa-berry",
  "tanga-berry", "charti-berry", "kasib-berry", "haban-berry", "colbur-berry",
  "babiri-berry", "roseli-berry", "chilan-berry",
  // Objetos competitivos
  "bright-powder", "white-herb", "quick-claw", "mental-herb", "kings-rock",
  "silver-powder", "scope-lens", "metal-coat", "leftovers", "light-ball",
  "soft-sand", "hard-stone", "miracle-seed", "black-glasses", "black-belt",
  "magnet", "mystic-water", "sharp-beak", "poison-barb", "never-melt-ice",
  "spell-tag", "twisted-spoon", "charcoal", "dragon-fang", "silk-scarf",
  "fairy-feather", "focus-sash", "shell-bell", "choice-scarf",
  // Megaevolución (objeto único genérico)
  "megaevolucion"
]

// ─── IDs de Pokémon de Champions ─────────────────────────────────────────────
const CHAMPIONS_IDS = [
  3, 6, 9, 15, 18, 24, 25, 26, 36, 38, 59, 65, 68, 71, 80, 94, 115, 121,
  127, 128, 130, 132, 134, 135, 136, 142, 143, 149, 154, 157, 160, 168, 181,
  184, 186, 196, 197, 199, 205, 208, 212, 214, 227, 229, 248, 279, 282, 302,
  306, 308, 310, 319, 323, 324, 334, 350, 351, 354, 358, 359, 362, 389, 392,
  395, 405, 407, 409, 411, 428, 442, 445, 448, 450, 454, 460, 461, 464, 470,
  471, 472, 473, 475, 478, 479, 497, 500, 503, 505, 510, 512, 514, 516, 530,
  531, 534, 547, 553, 563, 569, 571, 579, 584, 587, 609, 614, 618, 623, 635,
  637, 652, 655, 658, 660, 663, 666, 671, 675, 676, 678, 681, 683, 685, 693,
  695, 697, 699, 700, 701, 702, 706, 707, 709, 711, 713, 715, 724, 727, 730,
  733, 740, 745, 748, 750, 752, 758, 763, 765, 766, 778, 780, 784, 823, 841,
  842, 844, 855, 858, 866, 867, 869, 877, 887, 899, 900, 902, 903, 908, 911,
  914, 925, 934, 936, 937, 939, 952, 956, 959, 964, 968, 970, 981, 983,
  1013, 1018, 1019
]

// ─── Obtener moves del Pokémon desde Supabase ─────────────────────────────────
async function getPokemonMoves(pokemonId) {
  const { data, error } = await supabase
    .from("pokemon_moves")
    .select("move_name_api")
    .eq("pokemon_id", pokemonId)

  if (error || !data?.length) {
    // Fallback: fetch directo a PokeAPI si no hay datos en Supabase
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
    const json = await res.json()
    return [...new Set(json.moves.map(m => m.move.name))]
  }

  return [...new Set(data.map(d => d.move_name_api))]
}

// ─── Obtener nombre e info del Pokémon ───────────────────────────────────────
async function getPokemonInfo(pokemonId) {
  const { data } = await supabase
    .from("pokemon")
    .select("name_en, name_es, name_ja, types, base_stats, abilities")
    .eq("id", pokemonId)
    .single()

  if (data) return data

  // Fallback PokeAPI
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
  const json = await res.json()
  return {
    name_en: json.name,
    name_es: json.name,
    types: json.types.map(t => t.type.name),
    base_stats: {
      hp:     json.stats[0].base_stat,
      atk:    json.stats[1].base_stat,
      def:    json.stats[2].base_stat,
      spAtk:  json.stats[3].base_stat,
      spDef:  json.stats[4].base_stat,
      spe:    json.stats[5].base_stat,
    },
    abilities: json.abilities.map(a => a.ability.name)
  }
}

// ─── Llamar a Claude Sonnet para generar el set ───────────────────────────────
async function generateSet(pokemonInfo, availableMoves) {
  const movesStr = availableMoves.slice(0, 150).join(", ") // limitar para no exceder tokens
  const itemsStr = AVAILABLE_ITEMS.join(", ")

  const prompt = `You are an expert Pokémon competitive player. Generate the optimal competitive set for ${pokemonInfo.name_en} in Pokémon Champions.

Pokémon info:
- Types: ${pokemonInfo.types?.join(", ")}
- Base stats: HP ${pokemonInfo.base_stats?.hp}, ATK ${pokemonInfo.base_stats?.atk}, DEF ${pokemonInfo.base_stats?.def}, SpA ${pokemonInfo.base_stats?.spAtk}, SpD ${pokemonInfo.base_stats?.spDef}, SPE ${pokemonInfo.base_stats?.spe}
- Available abilities: ${pokemonInfo.abilities?.join(", ")}

Champions-specific rules (VERY IMPORTANT):
- Level 50, IVs=31 fixed
- SP system: max 32 SP per stat, max 66 SP total (1 SP = 8 EVs equivalent)
- Available items ONLY: ${itemsStr}
- NO Life Orb, NO Choice Band, NO Choice Specs, NO Assault Vest, NO Heavy-Duty Boots
- Only Choice item available is choice-scarf
- Format: Singles Individual (bring 6, pick 3)

Available moves for this Pokémon (use ONLY these exact name_api values):
${movesStr}

Return ONLY a valid JSON object, no explanation, no markdown:
{
  "moves": ["move_name_api_1", "move_name_api_2", "move_name_api_3", "move_name_api_4"],
  "item": "item_nameAPI",
  "ability": "ability-name-api",
  "nature": "nature-name",
  "sp_spread": {"hp": 0, "atk": 0, "def": 0, "spAtk": 0, "spDef": 0, "spe": 0},
  "role": "brief role description in English (sweeper/wall/support/etc)"
}`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }]
  })

  const text = message.content[0].text

  // Extraer el primer objeto JSON completo contando llaves (robusto ante texto extra)
  const parsed = extractFirstJSON(text)
  if (!parsed) throw new Error(`No se encontró JSON válido en: ${text.slice(0, 300)}`)
  return parsed
}

/** Extrae y parsea el primer objeto JSON completo de un string arbitrario. */
function extractFirstJSON(text) {
  const start = text.indexOf("{")
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === "\\") { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch (e) {
          return null
        }
      }
    }
  }
  return null
}

// ─── Guardar set en Supabase ───────────────────────────────────────────────────
async function saveSet(pokemonId, pokemonName, set) {
  const { error } = await supabase
    .from("sets")
    .upsert({
      pokemon_id:   pokemonId,
      pokemon_name: pokemonName,
      moves:        set.moves,
      item:         set.item,
      ability:      set.ability,
      nature:       set.nature,
      sp_spread:    set.sp_spread,
      role:         set.role,
      source:       "claude-sonnet",
      updated_at:   new Date().toISOString()
    }, { onConflict: "pokemon_id" })

  if (error) throw error
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🗡️  SwordsDance — Generador de sets con Claude Sonnet`)
  console.log(`📦  ${CHAMPIONS_IDS.length} Pokémon a procesar\n`)

  let ok = 0, failed = 0, skipped = 0

  for (const id of CHAMPIONS_IDS) {
    try {
      // Comprobar si ya tiene set generado
      const { data: existing } = await supabase
        .from("sets")
        .select("pokemon_id")
        .eq("pokemon_id", id)
        .eq("source", "claude-sonnet")
        .single()

      if (existing) {
        console.log(`⏭  ${id} — ya tiene set, saltando`)
        skipped++
        continue
      }

      // Obtener info del Pokémon
      const info = await getPokemonInfo(id)

      // Obtener moves disponibles
      const moves = await getPokemonMoves(id)
      if (!moves.length) {
        console.log(`⚠️  ${info.name_en} — sin moves en BD, saltando`)
        failed++
        continue
      }

      // Generar set con Claude
      const set = await generateSet(info, moves)

      // Validar que los moves existen en la lista disponible
      const validMoves = set.moves.filter(m => moves.includes(m))
      if (validMoves.length < 2) {
        console.log(`⚠️  ${info.name_en} — moves inválidos generados, saltando`)
        failed++
        continue
      }
      set.moves = validMoves.slice(0, 4)

      // Guardar
      await saveSet(id, info.name_en, set)
      console.log(`✅  ${info.name_en} — ${set.moves.join(", ")} @ ${set.item}`)
      ok++

      // Respetar rate limit de Anthropic
      await new Promise(r => setTimeout(r, 600))

    } catch (e) {
      console.log(`❌  ID ${id} — ${e.message}`)
      failed++
      // Esperar más si hay error de rate limit
      if (e.status === 429) {
        console.log("⏳ Rate limit, esperando 10s...")
        await new Promise(r => setTimeout(r, 10000))
      }
    }
  }

  console.log(`\n✅ Completado: ${ok} ok · ${failed} fallidos · ${skipped} saltados`)
  console.log(`💰 Coste aproximado: $${(ok * 0.0008).toFixed(3)}`)
}

main()
