// scripts/downloadAbilities.js
// Descarga nombres oficiales de habilidades desde PokeAPI y los guarda en Supabase.
// Uso: node scripts/downloadAbilities.js
//
// PRE-REQUISITO: ejecutar este SQL en Supabase → SQL Editor antes de lanzar el script:
//
//   CREATE TABLE IF NOT EXISTS abilities (
//     slug     text PRIMARY KEY,
//     name_en  text,
//     name_es  text,
//     name_ja  text
//   );
//
// La tabla NO necesita RLS (es un lookup público de solo lectura).
// Tras cargar los datos puedes añadir opcionalmente:
//   ALTER TABLE abilities ENABLE ROW LEVEL SECURITY;
//   CREATE POLICY abilities_public_read ON abilities FOR SELECT TO anon, authenticated USING (true);

const https = require('https')

const SUPABASE_URL = 'https://xfgkqrxzsmdjmzozfoer.supabase.co'
const SUPABASE_KEY = 'sb_publishable_gs8AzzXWwGD-ajraK7rQrw_1C2fborn'

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── HTTP helpers ───────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'swords-dance-script/1.0' } }, res => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} en ${url}`))
        }
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)) }
      })
    }).on('error', reject)
  })
}

function supabaseUpsert(rows) {
  return new Promise((resolve, reject) => {
    const body    = Buffer.from(JSON.stringify(rows))
    const options = {
      hostname: new URL(SUPABASE_URL).hostname,
      path:     '/rest/v1/abilities',
      method:   'POST',
      headers: {
        'apikey':          SUPABASE_KEY,
        'Authorization':   `Bearer ${SUPABASE_KEY}`,
        'Content-Type':    'application/json',
        'Content-Length':  body.length,
        'Prefer':          'resolution=merge-duplicates',
      },
    }

    const req = https.request(options, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
        } else {
          reject(new Error(`Supabase ${res.statusCode}: ${data}`))
        }
      })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════╗')
  console.log('║   downloadAbilities — PokeAPI → Supabase   ║')
  console.log('╚════════════════════════════════════════════╝\n')

  // 1. Lista completa
  console.log('📡 Obteniendo lista de habilidades...')
  const list = await fetchJson('https://pokeapi.co/api/v2/ability?limit=400')
  const total = list.results.length
  console.log(`   → ${total} habilidades encontradas\n`)

  // 2. Fetch individual
  const rows     = []
  const sinEs    = []
  const sinJa    = []
  let   errCount = 0

  for (let i = 0; i < total; i++) {
    const slug = list.results[i].name
    process.stdout.write(`[${String(i + 1).padStart(3)}/${total}] ${slug.padEnd(30)} `)

    try {
      const data   = await fetchJson(`https://pokeapi.co/api/v2/ability/${slug}`)
      const nameEn = data.names.find(n => n.language.name === 'en')?.name ?? null
      const nameEs = data.names.find(n => n.language.name === 'es')?.name ?? null
      const nameJa = data.names.find(n => n.language.name === 'ja')?.name ?? null

      rows.push({ slug, name_en: nameEn, name_es: nameEs, name_ja: nameJa })

      if (nameEs) {
        process.stdout.write(`ES:"${nameEs}" `)
      } else {
        sinEs.push(slug)
        process.stdout.write(`ES:— `)
      }
      if (nameJa) {
        process.stdout.write(`JA:"${nameJa}"\n`)
      } else {
        sinJa.push(slug)
        process.stdout.write(`JA:—\n`)
      }
    } catch (err) {
      console.log(`✗ Error: ${err.message}`)
      rows.push({ slug, name_en: null, name_es: null, name_ja: null })
      errCount++
    }

    await sleep(100)
  }

  // 3. UPSERT en bloques de 50
  const CHUNK = 50
  const bloques = Math.ceil(rows.length / CHUNK)
  console.log(`\n💾 Guardando en Supabase (${rows.length} filas, ${bloques} bloques)...`)

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk  = rows.slice(i, i + CHUNK)
    const bloque = Math.floor(i / CHUNK) + 1
    process.stdout.write(`   Bloque ${bloque}/${bloques}... `)
    await supabaseUpsert(chunk)
    console.log('✓')
  }

  // 4. Resumen
  const conEs = total - sinEs.length
  const conJa = total - sinJa.length
  console.log('\n═══════════════════════════════════════════════')
  console.log(`✅ Completado`)
  console.log(`   Total:    ${total}`)
  console.log(`   Con ES:   ${conEs}/${total} (${Math.round(conEs/total*100)}%)`)
  console.log(`   Con JA:   ${conJa}/${total} (${Math.round(conJa/total*100)}%)`)
  if (errCount) console.log(`   Errores:  ${errCount}`)

  if (sinEs.length) {
    console.log(`\n⚠️  Sin nombre ES (${sinEs.length}):`)
    console.log(`   ${sinEs.join(', ')}`)
  }
  if (sinJa.length > 0 && sinJa.length <= 20) {
    console.log(`\n⚠️  Sin nombre JA (${sinJa.length}):`)
    console.log(`   ${sinJa.join(', ')}`)
  }

  console.log('\n🔍 Verificación recomendada en Supabase SQL Editor:')
  console.log(`   SELECT slug, name_es, name_ja FROM abilities`)
  console.log(`   WHERE slug IN ('technician','intimidate','protean','tough-claws','fairy-aura','supreme-overlord');`)
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1) })
