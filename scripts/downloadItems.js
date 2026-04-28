// scripts/downloadItems.js
// Descarga sprites de todos los objetos de Champions a /public/assets/items/
// Uso: node scripts/downloadItems.js

const fs    = require('fs')
const path  = require('path')
const https = require('https')
const http  = require('http')

// Lista completa desde champions-items.js (inlined para ejecutar sin import)
const CHAMPIONS_ITEMS = [
  // Bayas de estado
  { nameES: 'Baya Zreza',   nameAPI: 'cheri-berry' },
  { nameES: 'Baya Atania',  nameAPI: 'chesto-berry' },
  { nameES: 'Baya Meloc',   nameAPI: 'pecha-berry' },
  { nameES: 'Baya Safre',   nameAPI: 'rawst-berry' },
  { nameES: 'Baya Perasi',  nameAPI: 'aspear-berry' },
  { nameES: 'Baya Zanama',  nameAPI: 'leppa-berry' },
  { nameES: 'Baya Aranja',  nameAPI: 'oran-berry' },
  { nameES: 'Baya Caquic',  nameAPI: 'persim-berry' },
  { nameES: 'Baya Ziuela',  nameAPI: 'lum-berry' },
  { nameES: 'Baya Zidra',   nameAPI: 'sitrus-berry' },
  // Bayas resistencia
  { nameES: 'Baya Caoca',   nameAPI: 'occa-berry' },
  { nameES: 'Baya Pasio',   nameAPI: 'passho-berry' },
  { nameES: 'Baya Gualot',  nameAPI: 'wacan-berry' },
  { nameES: 'Baya Tamar',   nameAPI: 'rindo-berry' },
  { nameES: 'Baya Rimoya',  nameAPI: 'yache-berry' },
  { nameES: 'Baya Pomaro',  nameAPI: 'chople-berry' },
  { nameES: 'Baya Kebia',   nameAPI: 'kebia-berry' },
  { nameES: 'Baya Acardo',  nameAPI: 'shuca-berry' },
  { nameES: 'Baya Kouba',   nameAPI: 'coba-berry' },
  { nameES: 'Baya Payapa',  nameAPI: 'payapa-berry' },
  { nameES: 'Baya Yecana',  nameAPI: 'tanga-berry' },
  { nameES: 'Baya Alcho',   nameAPI: 'charti-berry' },
  { nameES: 'Baya Drasi',   nameAPI: 'kasib-berry' },
  { nameES: 'Baya Anjiro',  nameAPI: 'haban-berry' },
  { nameES: 'Baya Dillo',   nameAPI: 'colbur-berry' },
  { nameES: 'Baya Baribá',  nameAPI: 'babiri-berry' },
  { nameES: 'Baya Hibis',   nameAPI: 'roseli-berry' },
  { nameES: 'Baya Chilan',  nameAPI: 'chilan-berry' },
  // Objetos competitivos
  { nameES: 'Polvo Brillo',           nameAPI: 'bright-powder' },
  { nameES: 'Hierba Blanca',          nameAPI: 'white-herb' },
  { nameES: 'Garra Rápida',           nameAPI: 'quick-claw' },
  { nameES: 'Hierba Mental',          nameAPI: 'mental-herb' },
  { nameES: 'Roca del Rey',           nameAPI: 'kings-rock' },
  { nameES: 'Polvo Plata',            nameAPI: 'silver-powder' },
  { nameES: 'Cinta Aguante',          nameAPI: 'focus-band' },
  { nameES: 'Periscopio',             nameAPI: 'scope-lens' },
  { nameES: 'Revestimiento Metálico', nameAPI: 'metal-coat' },
  { nameES: 'Restos',                 nameAPI: 'leftovers' },
  { nameES: 'Bola Luminosa',          nameAPI: 'light-ball' },
  { nameES: 'Arena Fina',             nameAPI: 'soft-sand' },
  { nameES: 'Piedra Dura',            nameAPI: 'hard-stone' },
  { nameES: 'Semilla Milagro',        nameAPI: 'miracle-seed' },
  { nameES: 'Gafas de Sol',           nameAPI: 'black-glasses' },
  { nameES: 'Cinturón Negro',         nameAPI: 'black-belt' },
  { nameES: 'Imán',                   nameAPI: 'magnet' },
  { nameES: 'Agua Mística',           nameAPI: 'mystic-water' },
  { nameES: 'Pico Afilado',           nameAPI: 'sharp-beak' },
  { nameES: 'Flecha Venenosa',        nameAPI: 'poison-barb' },
  { nameES: 'Hielo Perpetuo',         nameAPI: 'never-melt-ice' },
  { nameES: 'Hechizo',                nameAPI: 'spell-tag' },
  { nameES: 'Cuchara Torcida',        nameAPI: 'twisted-spoon' },
  { nameES: 'Carbón',                 nameAPI: 'charcoal' },
  { nameES: 'Colmillo Dragón',        nameAPI: 'dragon-fang' },
  { nameES: 'Pañuelo de Seda',        nameAPI: 'silk-scarf' },
  { nameES: 'Pluma Feérica',          nameAPI: 'fairy-feather' },
  { nameES: 'Banda Aguante',          nameAPI: 'focus-sash' },
  { nameES: 'Cascabel Concha',        nameAPI: 'shell-bell' },
  { nameES: 'Pañuelo Elección',       nameAPI: 'choice-scarf' },
  { nameES: 'Banda Elección',         nameAPI: 'choice-band' },
  { nameES: 'Gafas Elección',         nameAPI: 'choice-specs' },
  { nameES: 'Orbe Vital',             nameAPI: 'life-orb' },
  { nameES: 'Chaleco Asalto',         nameAPI: 'assault-vest' },
  { nameES: 'Restos Negros',          nameAPI: 'black-sludge' },
  { nameES: 'Casco Rocoso',           nameAPI: 'rocky-helmet' },
  { nameES: 'Política Debilidad',     nameAPI: 'weakness-policy' },
  { nameES: 'Gafas Seguridad',        nameAPI: 'safety-goggles' },
  { nameES: 'Eviolita',               nameAPI: 'eviolite' },
  { nameES: 'Arcilla Ligera',         nameAPI: 'light-clay' },
  { nameES: 'Roca Calorífica',        nameAPI: 'heat-rock' },
  { nameES: 'Roca Húmeda',            nameAPI: 'damp-rock' },
  { nameES: 'Roca Helada',            nameAPI: 'icy-rock' },
  { nameES: 'Roca Lisa',              nameAPI: 'smooth-rock' },
  { nameES: 'Extensión Terreno',      nameAPI: 'terrain-extender' },
  { nameES: 'Tarjeta Roja',           nameAPI: 'red-card' },
  { nameES: 'Bola de Hierro',         nameAPI: 'iron-ball' },
  { nameES: 'Orbe Llama',             nameAPI: 'flame-orb' },
  { nameES: 'Orbe Tóxico',            nameAPI: 'toxic-orb' },
  { nameES: 'Cinturón Experto',       nameAPI: 'expert-belt' },
  { nameES: 'Lente Amplia',           nameAPI: 'wide-lens' },
  { nameES: 'Lente Zoom',             nameAPI: 'zoom-lens' },
  // Mega Piedras
  { nameES: 'Venusaurita',    nameAPI: 'venusaurite' },
  { nameES: 'Charizardita X', nameAPI: 'charizardite-x' },
  { nameES: 'Charizardita Y', nameAPI: 'charizardite-y' },
  { nameES: 'Blastoiseita',   nameAPI: 'blastoisinite' },
  { nameES: 'Beedrillita',    nameAPI: 'beedrillite' },
  { nameES: 'Pidgeotita',     nameAPI: 'pidgeotite' },
  { nameES: 'Alakazamita',    nameAPI: 'alakazite' },
  { nameES: 'Slowbroita',     nameAPI: 'slowbronite' },
  { nameES: 'Gengarita',      nameAPI: 'gengarite' },
  { nameES: 'Kangaskhanita',  nameAPI: 'kangaskhanite' },
  { nameES: 'Pinsarita',      nameAPI: 'pinsirite' },
  { nameES: 'Gyaradosita',    nameAPI: 'gyaradosite' },
  { nameES: 'Aerodactylita',  nameAPI: 'aerodactylite' },
  { nameES: 'Ampharosita',    nameAPI: 'ampharosite' },
  { nameES: 'Scizarita',      nameAPI: 'scizorite' },
  { nameES: 'Heracrossita',   nameAPI: 'heracronite' },
  { nameES: 'Houndoomita',    nameAPI: 'houndoominite' },
  { nameES: 'Tyranitarita',   nameAPI: 'tyranitarite' },
  { nameES: 'Gardevoirita',   nameAPI: 'gardevoirite' },
  { nameES: 'Sableyeita',     nameAPI: 'sablenite' },
  { nameES: 'Aggronita',      nameAPI: 'aggronite' },
  { nameES: 'Medichamita',    nameAPI: 'medichamite' },
  { nameES: 'Manectricita',   nameAPI: 'manectite' },
  { nameES: 'Sharpeadita',    nameAPI: 'sharpedonite' },
  { nameES: 'Cameruptita',    nameAPI: 'cameruptite' },
  { nameES: 'Altariaita',     nameAPI: 'altarianite' },
  { nameES: 'Banetteita',     nameAPI: 'banettite' },
  { nameES: 'Absolita',       nameAPI: 'absolite' },
  { nameES: 'Glalieita',      nameAPI: 'glalitite' },
  { nameES: 'Lopunnyita',     nameAPI: 'lopunnite' },
  { nameES: 'Garchompita',    nameAPI: 'garchompite' },
  { nameES: 'Lucariota',      nameAPI: 'lucarionite' },
  { nameES: 'Abomasnowita',   nameAPI: 'abomasite' },
  { nameES: 'Galladita',      nameAPI: 'galladite' },
  { nameES: 'Audinoita',      nameAPI: 'audinite' },
]

const BASE_DIR = path.join(__dirname, '../public/assets/items')
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items'

function download(url, dest) {
  return new Promise((resolve) => {
    if (!url || fs.existsSync(dest)) return resolve()
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    proto.get(url, res => {
      if (res.statusCode !== 200) {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        return resolve()
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', () => { if (fs.existsSync(dest)) fs.unlinkSync(dest); resolve() })
    }).on('error', () => resolve())
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  fs.mkdirSync(BASE_DIR, { recursive: true })
  // Deduplicate by nameAPI
  const seen = new Set()
  const items = CHAMPIONS_ITEMS.filter(item => {
    if (seen.has(item.nameAPI)) return false
    seen.add(item.nameAPI)
    return true
  })

  console.log(`\n🎒 Descargando sprites de ${items.length} objetos...\n`)
  let downloaded = 0, skipped = 0

  for (let i = 0; i < items.length; i++) {
    const { nameES, nameAPI } = items[i]
    const dest = path.join(BASE_DIR, `${nameAPI}.png`)
    const url  = `${SPRITE_BASE}/${nameAPI}.png`
    process.stdout.write(`[${i + 1}/${items.length}] ${nameAPI}... `)
    const existed = fs.existsSync(dest)
    await download(url, dest)
    if (!existed && fs.existsSync(dest)) { downloaded++; console.log('✓') }
    else if (existed) { skipped++; console.log('(ya existe)') }
    else console.log('✗ (no disponible)')
    await sleep(50)
  }

  console.log(`\n✅ Objetos: ${downloaded} descargados · ${skipped} ya existían`)
  console.log(`   → ${BASE_DIR}`)
}

main().catch(err => { console.error(err); process.exit(1) })
