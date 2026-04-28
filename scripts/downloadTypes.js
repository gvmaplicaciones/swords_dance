// scripts/downloadTypes.js
// Downloads 18 type icons from PokeAPI sprites (Gen IX Scarlet/Violet)
// Run: node scripts/downloadTypes.js

import fs from 'fs'
import path from 'path'
import https from 'https'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dir, '../public/assets/types')
fs.mkdirSync(OUT_DIR, { recursive: true })

// PokeAPI type ID → name mapping
const TYPES = [
  { id: 1,  name: 'normal'   },
  { id: 2,  name: 'fighting' },
  { id: 3,  name: 'flying'   },
  { id: 4,  name: 'poison'   },
  { id: 5,  name: 'ground'   },
  { id: 6,  name: 'rock'     },
  { id: 7,  name: 'bug'      },
  { id: 8,  name: 'ghost'    },
  { id: 9,  name: 'steel'    },
  { id: 10, name: 'fire'     },
  { id: 11, name: 'water'    },
  { id: 12, name: 'grass'    },
  { id: 13, name: 'electric' },
  { id: 14, name: 'psychic'  },
  { id: 15, name: 'ice'      },
  { id: 16, name: 'dragon'   },
  { id: 17, name: 'dark'     },
  { id: 18, name: 'fairy'    },
]

function download(url, dest) {
  return new Promise((resolve) => {
    if (fs.existsSync(dest)) { console.log(`  skip ${path.basename(dest)} (exists)`); return resolve(true) }
    const file = fs.createWriteStream(dest)
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close()
        try { fs.unlinkSync(dest) } catch {}
        console.log(`  ✗ ${path.basename(dest)} (${res.statusCode})`)
        return resolve(false)
      }
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve(true)))
    }).on('error', (err) => {
      try { fs.unlinkSync(dest) } catch {}
      console.log(`  ✗ ${path.basename(dest)} (${err.message})`)
      resolve(false)
    })
  })
}

async function main() {
  console.log(`Downloading ${TYPES.length} type icons → public/assets/types/`)
  let ok = 0, fail = 0
  for (const t of TYPES) {
    const url  = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/types/generation-ix/scarlet-violet/small/${t.id}.png`
    const dest = path.join(OUT_DIR, `${t.name}.png`)
    const res  = await download(url, dest)
    if (res) { console.log(`  ✓ ${t.name}`); ok++ } else fail++
  }
  console.log(`\nDone: ${ok} ok, ${fail} failed`)
}

main().catch(console.error)
