// Canonical language registry now lives in @trek/shared. Re-exported here so
// existing imports of './supportedLanguages' continue to work unchanged.
export { APP_LANGUAGES as SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '@trek/shared'
export type { SupportedLanguageCode } from '@trek/shared'
