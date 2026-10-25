import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const brand = resolve(root, 'aventuristur/brand');
const publicDir = resolve(root, 'client/public');
const name = 'Roteiros Aventuristur';
const blue = '#0a6fc2';

function writeIfChanged(path, content) {
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content);
  let current;
  try {
    current = readFileSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (current?.equals(next)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, next);
  return true;
}

function replaceExact(relativePath, replacements) {
  const path = resolve(root, relativePath);
  let content = readFileSync(path, 'utf8');
  for (const [before, after] of replacements) {
    if (content.includes(before)) content = content.replaceAll(before, after);
    else if (!content.includes(after)) console.warn(`Rebrand: trecho ausente em ${relativePath} (o original mudou?): ${before}`);
  }
  writeIfChanged(path, content);
}

function appendAfterOnce(relativePath, anchor, addition) {
  const path = resolve(root, relativePath);
  const content = readFileSync(path, 'utf8');
  if (content.includes(addition)) return;
  const position = content.lastIndexOf(anchor);
  if (position < 0) throw new Error(`Rebrand: âncora esperada ausente em ${relativePath}`);
  writeIfChanged(path, content.slice(0, position + anchor.length) + addition + content.slice(position + anchor.length));
}

function replaceBlock(relativePath, start, end, replacement) {
  const path = resolve(root, relativePath);
  const content = readFileSync(path, 'utf8');
  const first = content.indexOf(start);
  if (first < 0) throw new Error(`Rebrand: início esperado ausente em ${relativePath}`);
  const last = content.indexOf(end, first + start.length);
  if (last < 0) throw new Error(`Rebrand: fim esperado ausente em ${relativePath}`);
  writeIfChanged(path, content.slice(0, first) + replacement + content.slice(last + end.length));
}

replaceExact('client/index.html', [
  ['<html lang="en">', '<html lang="pt-BR">'],
  ['<title>TREK</title>', `<title>${name}</title>`],
  ['content="TREK"', `content="${name}"`],
  ['content="#09090b"', `content="${blue}"`],
]);

replaceExact('client/vite.config.js', [
  ["name: 'TREK \\u2014 Travel Planner'", `name: '${name}'`],
  ["short_name: 'TREK'", "short_name: 'Aventuristur'"],
  ["description: 'Travel Resource & Exploration Kit'", "description: 'Roteiros de viagem colaborativos da Aventuristur'"],
  ["theme_color: '#111827'", `theme_color: '${blue}'`],
  ["background_color: '#0f172a'", "background_color: '#ffffff'"],
]);

replaceExact('client/src/index.css', [
  ['--accent: #111827;', '--accent: #0a6fc2;'],
  ['--accent-hover: #1f2937;', '--accent-hover: #0B4886;'],
  ['--accent-subtle: #f1f5f9;', '--accent-subtle: #eaf5ff;'],
  ['--accent: #e4e4e7;', '--accent: #60a5fa;'],
  ['--accent-hover: #d4d4d8;', '--accent-hover: #93c5fd;'],
]);

// The language pickers offer only Brazilian Portuguese, English and Spanish; the full list stays
// in shared so Intl, plural rules, server texts and the parity check keep every code.
appendAfterOnce(
  'shared/src/i18n/languages.ts',
  'export function isRtlLanguage(language: string): boolean {\n  return RTL_LANGUAGES.has(language);\n}\n',
  `
// Aventuristur: os seletores de idioma do app oferecem somente português do Brasil, inglês e
// espanhol. SUPPORTED_LANGUAGES continua completo porque o Intl, as regras de plural, os textos
// do servidor e a checagem de paridade dependem de cada código.
export const APP_LANGUAGE_CODES: readonly SupportedLanguageCode[] = ['br', 'en', 'es'];
export const APP_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => APP_LANGUAGE_CODES.includes(l.value));
`,
);
replaceExact('client/src/i18n/TranslationContext.tsx', [
  ['import {\n  SUPPORTED_LANGUAGES,', 'import {\n  APP_LANGUAGES as SUPPORTED_LANGUAGES,'],
]);
replaceExact('client/src/i18n/detectBrowserLanguage.ts', [
  ["import { SUPPORTED_LANGUAGES } from '@trek/shared';", "import { APP_LANGUAGES as SUPPORTED_LANGUAGES } from '@trek/shared';"],
]);
replaceExact('client/src/i18n/supportedLanguages.ts', [
  ["export { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '@trek/shared'", "export { APP_LANGUAGES as SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '@trek/shared'"],
]);

for (const locale of ['br', 'en', 'es']) {
  const dir = resolve(root, 'shared/src/i18n', locale);
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.ts') && entry !== 'system_notice.ts')) {
    const path = resolve(dir, file);
    const content = readFileSync(path, 'utf8');
    const protectedParts = [];
    // Kept as written: links, and sentences that name the original project on purpose
    // (its place index, its plugin version ranges, its maintainers).
    const keepTrek = String.raw`TREK(?= (?:index|API|Places|maintainer|enforces|verifies|will not|cannot|lets|reads|range|versions|is open source)|\\?'s own| \{range\}| \{version\}\+)|(?<=version range for this )TREK|(?<=tested it on this )TREK|(?<=corrupt )TREK`;
    const keep = new RegExp(String.raw`https?:\/\/[^\s'"`+'`'+String.raw`]+|\/TREK\b|${keepTrek}`, 'g');
    const safe = content.replace(keep, (part) => {
      const marker = `__AVENTURISTUR_PROTECTED_${protectedParts.length}__`;
      protectedParts.push(part);
      return marker;
    });
    const branded = safe.replace(/\bTREK\b|\bTrek\b/g, name)
      .replace(/__AVENTURISTUR_PROTECTED_(\d+)__/g, (_, index) => protectedParts[Number(index)]);
    writeIfChanged(path, branded);
  }
}

// The upstream release and donation notices speak in their author's voice.
// They cannot be presented as Aventuristur messages by simply renaming the app.
replaceExact('server/src/systemNotices/registry.ts', [
  ['export const SYSTEM_NOTICES: SystemNotice[] = [', 'const UPSTREAM_SYSTEM_NOTICES: SystemNotice[] = ['],
]);
appendAfterOnce(
  'server/src/systemNotices/registry.ts',
  '\n];\n',
  "export const SYSTEM_NOTICES: SystemNotice[] = UPSTREAM_SYSTEM_NOTICES.filter((notice) => notice.id !== 'release-notes' && notice.id !== 'thank-you-support');\n",
);

replaceExact('client/src/pages/SettingsPage.tsx', [
  ['...(appVersion && !managed', '...(appVersion'],
  ['href="https://github.com/liketrek/TREK"', 'href="https://github.com/hubsellfy/roteiros-aventuristur"'],
]);

for (const [source, target] of [
  ['aboutContent.ts', 'client/src/brand/aboutContent.ts'],
  ['AboutTab.tsx', 'client/src/components/Settings/AboutTab.tsx'],
  ['MSettingsAbout.tsx', 'client/src/mobile/screens/settings/MSettingsAbout.tsx'],
  ['AboutTab.test.tsx', 'client/src/components/Settings/AboutTab.test.tsx'],
]) {
  writeIfChanged(resolve(root, target), readFileSync(resolve(root, 'aventuristur/rebrand/templates', source)));
}

const mark = readFileSync(resolve(brand, 'mark.png'));
const transparentMark = readFileSync(resolve(brand, 'mark-transparent.png'));
const markUri = `data:image/png;base64,${mark.toString('base64')}`;
const transparentUri = `data:image/png;base64,${transparentMark.toString('base64')}`;

function wordmark(color, withMark) {
  const width = withMark ? 440 : 340;
  const image = withMark ? `<image href="${transparentUri}" x="2" y="5" width="90" height="90"/>` : '';
  const x = withMark ? 98 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="100" viewBox="0 0 ${width} 100" role="img" aria-label="${name}"><title>${name}</title>${image}<text x="${x}" y="60" fill="${color}" font-family="Arial,sans-serif" font-size="39" font-weight="700">Aventuristur</text><text x="${x + 2}" y="87" fill="${color}" font-family="Arial,sans-serif" font-size="21" letter-spacing="2">ROTEIROS</text></svg>\n`;
}

writeIfChanged(resolve(publicDir, 'logo-light.svg'), wordmark('#ffffff', true));
writeIfChanged(resolve(publicDir, 'logo-dark.svg'), wordmark('#0B4886', true));
writeIfChanged(resolve(publicDir, 'text-light.svg'), wordmark('#ffffff', false));
writeIfChanged(resolve(publicDir, 'text-dark.svg'), wordmark('#0B4886', false));

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Aventuristur"><title>Aventuristur</title><image href="${markUri}" width="512" height="512"/></svg>\n`;
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Aventuristur"><title>Aventuristur</title><rect width="512" height="512" fill="${blue}"/><image href="${markUri}" x="64" y="64" width="384" height="384"/></svg>\n`;
writeIfChanged(resolve(publicDir, 'icons/icon.svg'), icon);
writeIfChanged(resolve(publicDir, 'icons/icon-white.svg'), icon);
writeIfChanged(resolve(publicDir, 'icons/icon-dark.svg'), icon);
writeIfChanged(resolve(publicDir, 'icons/icon-maskable.svg'), maskable);

const emailLogo = await sharp(mark).resize(96, 96).png({ compressionLevel: 9 }).toBuffer();
replaceBlock(
  'server/src/nest/notifications/mailer/email-logo.ts',
  'export const EMAIL_LOGO_CID =',
  '/**\n * A fresh attachment',
  `export const EMAIL_LOGO_CID = 'logo@aventuristur';

const EMAIL_LOGO_PNG = Buffer.from('${emailLogo.toString('base64')}', 'base64');

/**
 * A fresh attachment`,
);
replaceExact('server/src/nest/notifications/mailer/email-logo.ts', [
  ["filename: 'trek-logo.png'", "filename: 'aventuristur-logo.png'"],
]);

replaceExact('server/src/nest/notifications/mailer/email-html.ts', [
  ['alt="TREK"', 'alt="Roteiros Aventuristur"'],
  ['font-weight: 700; letter-spacing: -0.5px;">TREK</div>', 'font-weight: 700; letter-spacing: -0.5px;">Roteiros Aventuristur</div>'],
  ['Travel Resource &amp; Exploration Kit', 'Sua viagem, bem organizada'],
  ['background: linear-gradient(135deg, #000000 0%, #1a1a2e 100%)', 'background: linear-gradient(135deg, #0B4886 0%, #0a6fc2 100%)'],
  ['background: #111827;', 'background: #0a6fc2;'],
  ['background:#111827;color:#fff;', 'background:#0a6fc2;color:#fff;'],
  ['by Maurice &middot; <a href="https://github.com/liketrek/TREK"', 'Aventuristur &middot; <a href="https://github.com/hubsellfy/roteiros-aventuristur"'],
]);

replaceExact('server/src/nest/notifications/mailer/mailer.service.ts', [
  ['subject: `TREK — ${strings.subject}`', 'subject: `Roteiros Aventuristur — ${strings.subject}`'],
  ['subject: `TREK — ${subject}`', 'subject: `Roteiros Aventuristur — ${subject}`'],
  ["subject: 'TREK — Test Notification'", "subject: 'Roteiros Aventuristur — Teste de e-mail'"],
  ['This is a test email from TREK. If you received this, your SMTP configuration is working correctly.', 'Este é um e-mail de teste do Roteiros Aventuristur. Se você o recebeu, o envio está funcionando.'],
]);

replaceExact('client/src/components/PDF/TripPDF.tsx', [
  ['<span>made with</span>', '<span>Roteiros Aventuristur</span>'],
]);

// O logo com texto alternativo "TREK" vira o nome da marca em todo o cliente (menos nos testes).
function* clientSources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) yield* clientSources(path);
    else if (/\.(tsx?|ts)$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) yield path;
  }
}
for (const path of clientSources(resolve(root, 'client/src'))) {
  const content = readFileSync(path, 'utf8');
  if (content.includes('alt="TREK"')) writeIfChanged(path, content.replaceAll('alt="TREK"', `alt="${name}"`));
}

replaceExact('client/src/index.css', [
  ['img[alt="TREK"]', 'img[alt="Roteiros Aventuristur"]'],
]);

// Rodapés das páginas públicas: a 5.0.0 tirou a assinatura do original, então só trocamos o que existir.
for (const file of ['client/src/pages/SharedTripPage.tsx', 'client/src/pages/JourneyPublicPage.tsx']) {
  const path = resolve(root, file);
  let content = readFileSync(path, 'utf8');
  for (const [before, after] of [
    ['>TREK</strong>', '>Roteiros Aventuristur</strong>'],
    ['href="https://github.com/liketrek/TREK"', 'href="https://github.com/hubsellfy/roteiros-aventuristur"'],
    ['by Maurice ·', 'Aventuristur ·'],
    ['Made with <span', 'Roteiro da Aventuristur <span'],
  ]) content = content.replaceAll(before, after);
  writeIfChanged(path, content);
}

replaceExact('client/src/components/shared/ErrorBoundary.tsx', [
  ["'TREK could not start'", "'Roteiros Aventuristur não pôde iniciar'"],
  ["'TREK was updated while this tab was open. Reload to get the new version.'", "'O aplicativo foi atualizado. Recarregue a página para usar a nova versão.'"],
]);

// The remaining visible TREK names and logos found in the stage 2 review.
replaceExact('client/src/components/shared/TripLoadingSplash.tsx', [
  ["title || 'TREK'", `title || '${name}'`],
]);

replaceExact('client/src/components/Settings/useAccountSettings.ts', [
  ['TREK MFA Backup Codes', `${name} - códigos de recuperação (2FA)`],
]);
replaceExact('client/src/pages/sharedTrip/SharedChrome.tsx', [
  ['<strong className="text-content">TREK</strong>', `<strong className="text-content">${name}</strong>`],
]);
replaceExact('client/src/utils/fileShare.ts', [
  ["navigator.canShare({ title: 'TREK', text: 'TREK' })", `navigator.canShare({ title: '${name}', text: '${name}' })`],
]);

// The releases tab lists the original project's releases and its author's
// donation links; the operator updates the fork on its own schedule instead.
replaceExact('client/src/pages/AdminPage.tsx', [
  ["    ...(managed ? [] : [{ id: 'github', label: t('admin.tabs.github'), icon: GitBranch, group: gIntegration }]),\n", ''],
  ['KeyRound, GitBranch, Bug', 'KeyRound, Bug'],
]);
replaceExact('client/src/mobile/screens/admin/MAdmin.tsx', [
  ["    ...(managed ? [] : [{ id: 'github', label: t('admin.tabs.github'), icon: Github }]),\n", ''],
  ['  Github,\n', ''],
]);
replaceExact('client/src/pages/admin/useAdmin.ts', [
  ["if (managed && MANAGED_HIDDEN.includes(activeTab)) setActiveTab('users')", "if ((managed && MANAGED_HIDDEN.includes(activeTab)) || activeTab === 'github') setActiveTab('users')"],
]);

// TRADEMARKS.md allows the word "TREK" to describe the origin but not its logos.
replaceExact('client/src/pages/admin/TrekApiCard.tsx', [
  ["import TrekMark from '../../components/shared/TrekMark'\n", ''],
  ['<TrekMark className="h-8 w-auto text-content" aria-label="TREK Places API" />', '<span className="text-lg font-semibold text-content">TREK Places API</span>'],
  ['<TrekMark className="h-7 w-auto text-content" aria-label="TREK Places API" />', '<span className="text-lg font-semibold text-content">TREK Places API</span>'],
]);
replaceExact('client/src/mobile/screens/admin/MApiProviderBlocks.tsx', [
  ["import TrekMark from '../../../components/shared/TrekMark'\n", ''],
  ['<TrekMark className="h-6 w-auto text-m-ink" aria-label="TREK Places API" />', '<span className="text-base font-semibold text-m-ink">TREK Places API</span>'],
]);

replaceExact('client/src/mobile/screens/dashboard/MDashboard.tsx', [
  ['aria-label="TREK"', `aria-label="${name}"`],
]);
replaceExact('client/src/mobile/screens/trip/MTripLoadingSplash.tsx', [
  ["title || 'TREK'", `title || '${name}'`],
]);
replaceExact('server/src/nest/notifications/mailer/smtp-diagnostics.ts', [
  ['from the TREK container', `from the ${name} container`],
]);

// The in-app help ("/help") is rendered from wiki/*.md. Code, links, file names and
// the places-index names stay as written; the prose takes the product name.
const wikiDir = resolve(root, 'wiki');
const wikiKeep = new RegExp(
  String.raw`\x60\x60\x60[\s\S]*?\x60\x60\x60|\x60[^\x60\n]*\x60|\]\([^)\n]*\)|https?:\/\/[^\s)>\]]+|\bTREK(?=-[A-Za-z]| Places| API| index|\\?'s own| maintainer)`,
  'g',
);
for (const file of readdirSync(wikiDir).filter((entry) => entry.endsWith('.md'))) {
  const path = resolve(wikiDir, file);
  const content = readFileSync(path, 'utf8');
  const kept = [];
  const safe = content.replace(wikiKeep, (part) => {
    kept.push(part);
    return `__AVENTURISTUR_WIKI_${kept.length - 1}__`;
  });
  const branded = safe.replace(/\bTREK\b|\bTrek\b/g, name)
    .replace(/__AVENTURISTUR_WIKI_(\d+)__/g, (_, index) => kept[Number(index)]);
  writeIfChanged(path, branded);
}

console.log('Marca Aventuristur aplicada.');
