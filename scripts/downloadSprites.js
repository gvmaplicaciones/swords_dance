// scripts/downloadSprites.js
// Descarga sprites HOME de todos los Pokémon en pokemon.json
// a /public/assets/sprites/home/
// Uso: node scripts/downloadSprites.js

const fs   = require('fs')
const path = require('path')
const https = require('https')
const http  = require('http')

const POKEMON_JSON = path.join(__dirname, '../src/data/pokemon.json')
const BASE_DIR     = path.join(__dirname, '../public/assets/sprites/home')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (!url) return resolve()
    if (fs.existsSync(dest)) return resolve() // ya descargado
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    const proto = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    proto.get(url, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close()
        fs.unlinkSync(dest)
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        return resolve() // no existe esta variante, ignorar
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', err => { fs.unlinkSync(dest); reject(err) })
    }).on('error', err => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      resolve() // ignorar errores de red
    })
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  if (!fs.existsSync(POKEMON_JSON)) {
    console.error('❌ pokemon.json no encontrado. Ejecuta primero downloadPokemon.js')
    process.exit(1)
  }

  const pokemon = JSON.parse(fs.readFileSync(POKEMON_JSON, 'utf8'))
  console.log(`\n🖼️  Descargando sprites HOME de ${pokemon.length} Pokémon...\n`)

  let downloaded = 0
  let skipped = 0

  for (let i = 0; i < pokemon.length; i++) {
    const p = pokemon[i]
    const { id, sprites } = p
    process.stdout.write(`[${i + 1}/${pokemon.length}] #${id}... `)

    const variants = [
      { url: sprites.normal,      dest: path.join(BASE_DIR, `${id}.png`) },
      { url: sprites.female,      dest: path.join(BASE_DIR, 'female', `${id}.png`) },
      { url: sprites.shiny,       dest: path.join(BASE_DIR, 'shiny', `${id}.png`) },
      { url: sprites.shinyFemale, dest: path.join(BASE_DIR, 'shiny', 'female', `${id}.png`) },
    ]

    for (const v of variants) {
      if (v.url) {
        const existed = fs.existsSync(v.dest)
        await download(v.url, v.dest)
        if (!existed && fs.existsSync(v.dest)) downloaded++
        else if (existed) skipped++
      }
    }
    console.log('✓')
    await sleep(100)
  }

  console.log(`\n✅ Sprites descargados: ${downloaded} nuevos · ${skipped} ya existían`)
  console.log(`   → ${BASE_DIR}`)
}

main().catch(err => { console.error(err); process.exit(1) })
