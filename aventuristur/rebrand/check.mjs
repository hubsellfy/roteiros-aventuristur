import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const failures = [];

// 1. The script must be repeatable: a second run changes nothing.
execFileSync('node', ['aventuristur/rebrand/apply.mjs'], { cwd: root, stdio: 'ignore' });
const before = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
execFileSync('node', ['aventuristur/rebrand/apply.mjs'], { cwd: root, stdio: 'ignore' });
const after = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
if (before !== after) failures.push('apply.mjs não é repetível: a segunda execução alterou arquivos.');
const dirty = execFileSync('git', ['diff', '--name-only'], { cwd: root, encoding: 'utf8' }).trim();
if (dirty && process.argv.includes('--committed')) {
  failures.push(`apply.mjs altera arquivos já versionados (rode o script e faça commit):\n${dirty}`);
}

// 2. "TREK" may stay only where the original project is named on purpose.
const allowed = [
  /TREK Places API/,
  /TREK_[A-Z_]+/,
  /\bTREK(?= (?:index|API|Places|maintainer|enforces|verifies|will not|cannot|lets|reads|range|versions|is open source)|\\?'s own| \{range\}| \{version\}\+)/,
  /(?<=version range for this )TREK|(?<=tested it on this )TREK|(?<=corrupt )TREK/,
  /baseado no TREK|based on TREK|basado en TREK/,
  /liketrek\/TREK/,
  /\/TREK\b/,
  /'TREK:GCJ02'/,
];
// Surfaces that stay off in v1 (demo mode, upstream releases tab, plugins, Journey Studio) or that
// attribute data to the original project. Review before turning any of them on.
const allowedFiles = [
  /^client\/src\/components\/Layout\/DemoBanner\.tsx$/,
  /^client\/src\/components\/Studio\//,
  /^client\/src\/mobile\/screens\/admin\/(MAdminGitHubPanel|MAdminPluginsPanel)\.tsx$/,
  /^client\/src\/utils\/placeSource\.ts$/,
  /^client\/src\/components\/Admin\/(AdminPluginsPanel|GitHubPanel|useRangeBypass)/,
  /^client\/src\/brand\//,
  /\.test\.tsx?$/,
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(tsx?|jsx?|html)$/.test(name)) out.push(path);
  }
  return out;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const targets = [
  ...walk(resolve(root, 'client/src')),
  ...walk(resolve(root, 'shared/src/i18n/br')),
  ...walk(resolve(root, 'shared/src/i18n/en')),
  ...walk(resolve(root, 'shared/src/i18n/es')),
  resolve(root, 'client/index.html'),
  ...walk(resolve(root, 'server/src/nest/notifications/mailer')),
];

for (const file of targets) {
  const rel = relative(root, file);
  if (allowedFiles.some((pattern) => pattern.test(rel))) continue;
  if (rel.startsWith('shared/src/i18n/') && /system_notice\.ts$/.test(rel)) continue;
  const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
  lines.forEach((line, index) => {
    if (!/\bTREK\b/.test(line)) return;
    if (/^\s*(import|export) .*from /.test(line)) return;
    let rest = line;
    for (const pattern of allowed) rest = rest.replace(new RegExp(pattern.source, 'g'), '');
    if (/\bTREK\b/.test(rest)) failures.push(`${rel}:${index + 1}: "TREK" visível fora da lista permitida: ${line.trim().slice(0, 120)}`);
  });
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Marca verificada: script repetível e nenhum "TREK" visível fora da lista permitida.');
