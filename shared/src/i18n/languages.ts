export const SUPPORTED_LANGUAGES = [
  { value: 'br', label: 'Português (Brasil)', locale: 'pt-BR' },
  { value: 'en', label: 'English', locale: 'en-US' },
  { value: 'es', label: 'Español', locale: 'es-ES' },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['value'];

export const SUPPORTED_LANGUAGE_CODES: string[] = SUPPORTED_LANGUAGES.map((l) => l.value);

const LOCALES: Partial<Record<string, string>> = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((l) => [l.value, l.locale]),
);

// Languages displayed right-to-left.
const RTL_LANGUAGES = new Set<string>(['ar']);

export function getLocaleForLanguage(language: string): string {
  return LOCALES[language] ?? LOCALES['en'] ?? 'en-US';
}

// Two codes TREK uses are not the BCP-47 tag of their language: 'br' is Breton
// and 'gr' is no language at all.
const INTL_LANGUAGE: Partial<Record<string, string>> = { br: 'pt-BR', gr: 'el' };

// Returns a BCP-47 tag suitable for Intl APIs and the document's lang attribute.
export function getIntlLanguage(language: string): string {
  const tag = INTL_LANGUAGE[language];
  if (tag) return tag;
  return SUPPORTED_LANGUAGE_CODES.includes(language) ? language : 'en';
}

export function isRtlLanguage(language: string): boolean {
  return RTL_LANGUAGES.has(language);
}

// Aventuristur: o app oferece somente português do Brasil, inglês e espanhol nos seletores.
// SUPPORTED_LANGUAGES continua completo porque o Intl, as regras de plural e a checagem de
// paridade dos textos dependem de cada código.
export const APP_LANGUAGE_CODES: readonly SupportedLanguageCode[] = ['br', 'en', 'es'];
export const APP_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => APP_LANGUAGE_CODES.includes(l.value));
