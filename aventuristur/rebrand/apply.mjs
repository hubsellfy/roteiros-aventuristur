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
    if (content.includes(after)) continue;
    if (content.includes(before)) content = content.replaceAll(before, after);
    else throw new Error(`Rebrand: trecho esperado ausente em ${relativePath}: ${before}`);
  }
  writeIfChanged(path, content);
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

replaceBlock(
  'shared/src/i18n/languages.ts',
  'export const SUPPORTED_LANGUAGES = [',
  '] as const;',
  `export const SUPPORTED_LANGUAGES = [
  { value: 'br', label: 'Português (Brasil)', locale: 'pt-BR' },
  { value: 'en', label: 'English', locale: 'en-US' },
  { value: 'es', label: 'Español', locale: 'es-ES' },
] as const;`,
);

replaceBlock(
  'client/src/i18n/TranslationContext.tsx',
  'const localeLoaders: Record<SupportedLanguageCode, () => Promise<{ default: TranslationStrings }>> = {',
  '\n}',
  `const localeLoaders: Record<SupportedLanguageCode, () => Promise<{ default: TranslationStrings }>> = {
  br: () => import('@trek/shared/i18n/br'),
  en: () => Promise.resolve({ default: en }),
  es: () => import('@trek/shared/i18n/es'),
}`,
);

for (const locale of ['br', 'en', 'es']) {
  const dir = resolve(root, 'shared/src/i18n', locale);
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.ts') && entry !== 'system_notice.ts')) {
    const path = resolve(dir, file);
    const content = readFileSync(path, 'utf8');
    const protectedParts = [];
    const safe = content.replace(/https?:\/\/[^\s'"`]+|\/TREK\b/g, (part) => {
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
  [
    '\n];\n',
    "\n];\nexport const SYSTEM_NOTICES: SystemNotice[] = UPSTREAM_SYSTEM_NOTICES.filter((notice) => notice.id !== 'release-notes' && notice.id !== 'thank-you-support');\n",
  ],
]);

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

for (const file of [
  'client/src/pages/LoginPage.tsx',
  'client/src/pages/SharedTripPage.tsx',
  'client/src/pages/JourneyPublicPage.tsx',
  'client/src/components/Layout/Navbar.tsx',
  'client/src/components/Layout/DemoBanner.tsx',
  'client/src/components/Admin/AddonManager.tsx',
  'client/src/mobile/screens/admin/MAdminAddonManager.tsx',
]) {
  replaceExact(file, [['alt="TREK"', 'alt="Roteiros Aventuristur"']]);
}

replaceExact('client/src/index.css', [
  ['img[alt="TREK"]', 'img[alt="Roteiros Aventuristur"]'],
]);

for (const file of ['client/src/pages/SharedTripPage.tsx', 'client/src/pages/JourneyPublicPage.tsx']) {
  replaceExact(file, [
    ['>TREK</strong>', '>Roteiros Aventuristur</strong>'],
    ['href="https://github.com/liketrek/TREK"', 'href="https://github.com/hubsellfy/roteiros-aventuristur"'],
    ['by Maurice ·', 'Aventuristur ·'],
    ['Made with <span', 'Roteiro da Aventuristur <span'],
  ]);
}

replaceExact('client/src/components/shared/ErrorBoundary.tsx', [
  ["'TREK could not start'", "'Roteiros Aventuristur não pôde iniciar'"],
  ["'TREK was updated while this tab was open. Reload to get the new version.'", "'O aplicativo foi atualizado. Recarregue a página para usar a nova versão.'"],
]);

console.log('Marca Aventuristur aplicada.');
