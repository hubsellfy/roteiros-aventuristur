// Gera src/icons/iconsaxData.generated.ts a partir do pacote `iconsax` (estilo linear) e do mapa
// scripts/iconsax-map.json (nome antigo do ícone -> nome no Iconsax). Só os ícones usados entram no
// bundle. Rode `node scripts/generate-iconsax.mjs` após alterar o mapa.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const pkgDir = resolve(dirname(require.resolve('iconsax')), '..')
const dataDir = resolve(pkgDir, 'dist/data')
const map = JSON.parse(readFileSync(resolve(here, 'iconsax-map.json'), 'utf8'))

// Exceções documentadas: o Iconsax não tem "check" simples (só dentro de círculo/quadrado).
const custom = {
  check: '<path d="M4.5 12.75L9.5 17.75L19.5 6.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  check2: '<path d="M2.5 12.75L7.5 17.75L17.5 6.75M12 16.25L13.25 17.5L21.5 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
}

const byName = {}
for (const file of readdirSync(dataDir)) {
  const json = JSON.parse(readFileSync(resolve(dataDir, file), 'utf8'))
  for (const [name, styles] of Object.entries(json)) byName[name] = styles
}

// O Iconsax vem com cores fixas (white, black, #292D32) e recortes do Figma; aqui tudo vira currentColor
// para o ícone herdar a cor do texto, e os recortes de 24x24 (sem efeito visual) são descartados.
const inner = (svg) =>
  svg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<defs>[\s\S]*?<\/defs>/g, '')
    .replace(/ clip-path="[^"]*"/g, '')
    .replace(/(stroke|fill)="(?!none|currentColor)[^"]*"/g, '$1="currentColor"')
    .trim()
const used = new Map()
for (const [lucide, target] of Object.entries(map)) {
  const [ref, rotate] = target.split('@')
  if (ref.startsWith('=')) {
    used.set(lucide, { body: custom[ref.slice(1)] })
    continue
  }
  const entry = byName[ref]?.linear
  if (!entry) throw new Error(`Iconsax: ícone "${ref}" (${lucide}) sem estilo linear`)
  const body = inner(entry)
  used.set(lucide, { body: rotate ? `<g transform="rotate(${rotate} 12 12)">${body}</g>` : body })
}

const lines = [...used.entries()].sort(([a], [b]) => a.localeCompare(b)).map(
  ([k, v]) => `  ${k}: { body: ${JSON.stringify(v.body)} },`,
)
const out = `// GERADO por scripts/generate-iconsax.mjs — não editar à mão.
export interface IconsaxEntry { body: string }

export const ICONSAX: Record<string, IconsaxEntry> = {
${lines.join('\n')}
}
`
mkdirSync(resolve(here, '../src/icons'), { recursive: true })
writeFileSync(resolve(here, '../src/icons/iconsaxData.generated.ts'), out)
console.log(`Iconsax: ${used.size} ícones gerados`)

const names = [...used.keys()].sort()
const restricted = new Set(['Infinity'])
const comps = names
  .map((n) => (restricted.has(n) ? `const ${n}Icon = makeIcon('${n}')\nexport { ${n}Icon as ${n} }` : `export const ${n} = makeIcon('${n}')`))
  .join('\n')
writeFileSync(resolve(here, '../src/icons/names.generated.ts'), `// GERADO por scripts/generate-iconsax.mjs — não editar à mão.
import { makeIcon } from './makeIcon'

${comps}
`)
