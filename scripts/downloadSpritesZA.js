// scripts/downloadSpritesZA.js
// Downloads ZA mega sprites and stone images from Bulbagarden Archives via MediaWiki API
// Run: node scripts/downloadSpritesZA.js

import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))

const SPRITE_DIR = path.join(__dir, '../public/assets/sprites/mega-za')
const ITEM_DIR   = path.join(__dir, '../public/assets/items/mega-za')
fs.mkdirSync(SPRITE_DIR, { recursive: true })
fs.mkdirSync(ITEM_DIR,   { recursive: true })

// Inline data (avoids import issues with .js extension)
const MEGA_EVOLUTIONS_ZA = [
  { id: 'mega-dragonite',    baseFormId: 149, megaStone: 'Dragoninite',    sprite: 'Menu_ZA_0149-Mega.png' },
  { id: 'mega-meganium',     baseFormId: 154, megaStone: 'Meganiumite',    sprite: 'Menu_ZA_0154-Mega.png' },
  { id: 'mega-feraligatr',   baseFormId: 160, megaStone: 'Feraligatrite',  sprite: 'Menu_ZA_0160-Mega.png' },
  { id: 'mega-clefable',     baseFormId: 36,  megaStone: 'Clefablite',     sprite: 'Menu_ZA_0036-Mega.png' },
  { id: 'mega-victreebel',   baseFormId: 71,  megaStone: 'Victrebelite',   sprite: 'Menu_ZA_0071-Mega.png' },
  { id: 'mega-starmie',      baseFormId: 121, megaStone: 'Starmite',       sprite: 'Menu_ZA_0121-Mega.png' },
  { id: 'mega-skarmory',     baseFormId: 227, megaStone: 'Skarmite',       sprite: 'Menu_ZA_0227-Mega.png' },
  { id: 'mega-chimecho',     baseFormId: 358, megaStone: 'Chimechite',     sprite: 'Menu_ZA_0358-Mega.png' },
  { id: 'mega-emboar',       baseFormId: 500, megaStone: 'Emboarite',      sprite: 'Menu_ZA_0500-Mega.png' },
  { id: 'mega-excadrill',    baseFormId: 530, megaStone: 'Excadrillite',   sprite: 'Menu_ZA_0530-Mega.png' },
  { id: 'mega-scrafty',      baseFormId: 560, megaStone: 'Scraftite',      sprite: 'Menu_ZA_0560-Mega.png' },
  { id: 'mega-chandelure',   baseFormId: 609, megaStone: 'Chandelurite',   sprite: 'Menu_ZA_0609-Mega.png' },
  { id: 'mega-eelektross',   baseFormId: 604, megaStone: 'Eelektrossite',  sprite: 'Menu_ZA_0604-Mega.png' },
  { id: 'mega-scolipede',    baseFormId: 545, megaStone: 'Scolipedite',    sprite: 'Menu_ZA_0545-Mega.png' },
  { id: 'mega-golurk',       baseFormId: 623, megaStone: 'Golurkite',      sprite: 'Menu_ZA_0623-Mega.png' },
  { id: 'mega-froslass',     baseFormId: 478, megaStone: 'Froslasite',     sprite: 'Menu_ZA_0478-Mega.png' },
  { id: 'mega-chesnaught',   baseFormId: 652, megaStone: 'Chesnaughtite',  sprite: 'Menu_ZA_0652-Mega.png' },
  { id: 'mega-delphox',      baseFormId: 655, megaStone: 'Delphoxite',     sprite: 'Menu_ZA_0655-Mega.png' },
  { id: 'mega-greninja',     baseFormId: 658, megaStone: 'Greninjaite',    sprite: 'Menu_ZA_0658-Mega.png' },
  { id: 'mega-hawlucha',     baseFormId: 701, megaStone: 'Hawluchite',     sprite: 'Menu_ZA_0701-Mega.png' },
  { id: 'mega-drampa',       baseFormId: 780, megaStone: 'Drampite',       sprite: 'Menu_ZA_0780-Mega.png' },
  { id: 'mega-zygarde',      baseFormId: 718, megaStone: 'Zygardite',      sprite: 'Menu_ZA_0718-Mega.png' },
  // DLC Mega Dimension
  { id: 'mega-raichu-x',     baseFormId: 26,  megaStone: 'Raichunite X',   sprite: 'Menu_ZA_0026-Mega X.png' },
  { id: 'mega-meowstic',     baseFormId: 678, megaStone: 'Meowstite',      sprite: 'Menu_ZA_0678-Mega.png' },
  { id: 'mega-crabominable', baseFormId: 740, megaStone: 'Crabominite',    sprite: 'Menu_ZA_0740-Mega.png' },
  { id: 'mega-zeraora',      baseFormId: 807, megaStone: 'Zeraite',        sprite: 'Menu_ZA_0807-Mega.png' },
  { id: 'mega-scovillain',   baseFormId: 952, megaStone: 'Scovillainite',  sprite: 'Menu_ZA_0952-Mega.png' },
  { id: 'mega-glimmora',     baseFormId: 970, megaStone: 'Glimmorite',     sprite: 'Menu_ZA_0970-Mega.png' },
]

async function getBulbaURL(filename) {
  const api = `https://archives.bulbagarden.net/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=url&format=json&origin=*`
  try {
    const res  = await fetch(api)
    const data = await res.json()
    const page = Object.values(data.query.pages)[0]
    return page?.imageinfo?.[0]?.url ?? null
  } catch {
    return null
  }
}

function downloadURL(url, dest) {
  return new Promise((resolve) => {
    if (!url || fs.existsSync(dest)) return resolve(!!fs.existsSync(dest))
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close(); try { fs.unlinkSync(dest) } catch {}
        return resolve(false)
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(true)))
    }).on('error', () => { try { fs.unlinkSync(dest) } catch {}; resolve(false) })
  })
}

async function main() {
  console.log(`Downloading ZA mega sprites and stones via Bulbagarden Archives…`)
  let spriteOk = 0, stoneOk = 0

  for (const mega of MEGA_EVOLUTIONS_ZA) {
    // 1. Sprite
    const spriteDest = path.join(SPRITE_DIR, `${mega.id}.png`)
    if (fs.existsSync(spriteDest)) {
      console.log(`  skip sprite ${mega.id}`)
      spriteOk++
    } else {
      const spriteURL = await getBulbaURL(mega.sprite)
      const ok = await downloadURL(spriteURL, spriteDest)
      console.log(`  ${ok ? '✓' : '✗'} sprite  ${mega.id}`)
      if (ok) spriteOk++
    }

    // 2. Mega Stone icon
    const stoneDest = path.join(ITEM_DIR, `${mega.id}-stone.png`)
    if (fs.existsSync(stoneDest)) {
      console.log(`  skip stone  ${mega.megaStone}`)
      stoneOk++
    } else {
      const stoneURL = await getBulbaURL(`${mega.megaStone}.png`)
      const ok = await downloadURL(stoneURL, stoneDest)
      console.log(`  ${ok ? '✓' : '✗'} stone   ${mega.megaStone}`)
      if (ok) stoneOk++
    }

    // Small delay to be polite to Bulbagarden API
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone: ${spriteOk}/${MEGA_EVOLUTIONS_ZA.length} sprites, ${stoneOk}/${MEGA_EVOLUTIONS_ZA.length} stones`)
}

main().catch(console.error)
