// src/data/grammar/soundScope.ts — which grammar ideas are about SOUND, and how their rows are kept per pronunciation (mw-5r3p30.231).
// The ideas of the letters, sounds and marks tiers are learned in a pronunciation scheme (Modern Greek, Erasmian ...): what he proved in one he has not
// proved in the other. Their rows (grammarLevels, the schedule rows of kind 'grammar', the evidence) are stored under '<scheme>:<idea id>'; every other idea
// keeps its plain id and is one level for all schemes. Pure and light on purpose: src/data/db.ts imports it for the upgrade, so it does not import the ladder
// (tests/unit/sound-scope.test.ts holds this list equal to the ladder's three tiers).

/** The scheme every sound-tier row belonged to before the rows were kept per scheme (the only scheme there was). */
export const LEGACY_SCHEME = 'modern';

const SOUND_IDS: ReadonlySet<string> = new Set([
  'alphabet', 'diphthongs', 'consonant-pairs', 'syllables',
  'breathings', 'accents', 'iota-subscript', 'words-sound-alike', 'punctuation', 'movable-letters', 'marks-change-word', 'enclitics',
]);
const SOUND_PREFIXES = ['letter-', 'diphthong-', 'pair-', 'breathing-'];

/** Whether this idea id is of the letters, sounds or marks tier: learned per pronunciation. */
export function isSoundIdea(id: string): boolean {
  return SOUND_IDS.has(id) || SOUND_PREFIXES.some((p) => id.startsWith(p));
}

/** The key a row of this idea is stored under when the pronunciation is `scheme`: '<scheme>:<id>' for a sound idea, the id for any other. */
export function storedId(id: string, scheme: string): string {
  return isSoundIdea(id) ? `${scheme}:${id}` : id;
}

/** The idea a stored key is of, when the pronunciation is `scheme`; undefined when the row is another scheme's. */
export function ideaOfStored(stored: string, scheme: string): string | undefined {
  const at = stored.lastIndexOf(':');
  if (at < 0) return stored;
  return stored.slice(0, at) === scheme ? stored.slice(at + 1) : undefined;
}

/** A plain stored key that should be scoped (a sound idea kept before the rows were per scheme), scoped to the legacy scheme; any other key as it is. */
export const legacyStoredId = (stored: string): string => (stored.includes(':') ? stored : storedId(stored, LEGACY_SCHEME));
