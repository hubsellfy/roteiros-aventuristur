// Words that stay lowercase inside a name ("Flower and Coffee", "Padaria do Zé").
const SMALL_WORDS = new Set([
  'a',
  'e',
  'o',
  'as',
  'os',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'na',
  'no',
  'and',
  'of',
  'the',
  'y',
  'del',
  'la',
  'el',
]);

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * A pin's name as it should read on the map. Some entries are typed the way an
 * Instagram handle is ("flower.and.coffee", "SAFARI BEER CAFE"): dots, underscores
 * and hyphens between words, or everything in one case. Those are turned into
 * "Flower and Coffee". A name that already mixes cases ("Safari Beer Café",
 * "McDonald's") is the owner's own spelling and is left exactly as it is.
 */
export function formatPoiName(raw: string | null | undefined): string {
  const name = (raw ?? '').trim();
  if (!name) return '';
  const handleLike = !/\s/.test(name) && /[._]/.test(name);
  const separated = handleLike ? name.replace(/[._]+/g, ' ').trim() : name;
  const mixedCase = /[a-zà-ÿ]/.test(separated) && /[A-ZÀ-Þ]/.test(separated);
  if (mixedCase && !handleLike) return separated;
  return separated
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : capitalise(word)))
    .join(' ');
}
