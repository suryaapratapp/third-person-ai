import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const distDir = path.join(rootDir, 'dist')
const indexPath = path.join(distDir, 'index.html')

function fail(message) {
  console.error(`verify-build: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(indexPath)) {
  fail('dist/index.html is missing. Run the frontend build first.')
}

const html = fs.readFileSync(indexPath, 'utf8')
const refs = new Set()

const attrRegex = /(?:src|href)=(["'])([^"']+)\1/g
for (const match of html.matchAll(attrRegex)) {
  const raw = match[2]
  if (!raw) continue
  if (/^(https?:)?\/\//.test(raw)) continue
  if (raw.startsWith('data:')) continue

  if (raw.startsWith('/assets/') || raw.startsWith('assets/') || raw.startsWith('./assets/')) {
    const normalized = raw.replace(/^\.\//, '').replace(/^\//, '')
    refs.add(normalized)
  }
}

if (!refs.size) {
  fail('No /assets references found in dist/index.html. Build output may be invalid.')
}

const missing = [...refs].filter((ref) => !fs.existsSync(path.join(distDir, ref)))
if (missing.length) {
  fail(`Missing built asset files referenced by dist/index.html:\n${missing.map((v) => `- ${v}`).join('\n')}`)
}

console.log(`verify-build: OK (${refs.size} asset reference${refs.size === 1 ? '' : 's'} verified)`)
