import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const scanRoots = ['src', 'apps']
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.yml', '.yaml'])

const ignorePathParts = ['node_modules', 'dist', '.git', 'uploads', 'prisma/migrations']
const allowByPath = [
  /\.env\.example$/,
]

const allowByPathAndLine = [
  {
    path: /apps\/api\/src\/utils\/env\.ts$/,
    line: /localhost:5173/,
  },
]

function shouldIgnoreFile(relPath) {
  if (allowByPath.some((regex) => regex.test(relPath))) return true
  return ignorePathParts.some((part) => relPath.includes(part))
}

function walk(dir, result) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const absPath = path.join(dir, entry.name)
    const relPath = path.relative(rootDir, absPath)

    if (entry.isDirectory()) {
      if (shouldIgnoreFile(relPath)) continue
      walk(absPath, result)
      continue
    }

    if (shouldIgnoreFile(relPath)) continue

    const ext = path.extname(entry.name)
    if (!textExtensions.has(ext)) continue
    result.push({ absPath, relPath })
  }
}

const files = []
for (const root of scanRoots) {
  const absRoot = path.join(rootDir, root)
  if (!fs.existsSync(absRoot)) continue
  walk(absRoot, files)
}

const matches = []
for (const file of files) {
  const content = fs.readFileSync(file.absPath, 'utf8')
  const lines = content.split(/\r?\n/)

  lines.forEach((line, idx) => {
    if (!line.includes('localhost:')) return

    const allowedLine = allowByPathAndLine.some(
      (rule) => rule.path.test(file.relPath) && rule.line.test(line),
    )

    if (allowedLine) return

    matches.push(`${file.relPath}:${idx + 1}: ${line.trim()}`)
  })
}

if (matches.length) {
  console.error('scan-localhost: found disallowed localhost references:')
  console.error(matches.map((m) => `- ${m}`).join('\n'))
  process.exit(1)
}

console.log('scan-localhost: OK (no disallowed localhost references)')
