// src/data/grammar/sayIt.ts — Say it's matcher (mw-86e9r1.12, PROVISIONAL), pure: the words his phone's speech recognition heard, checked against a letter. He is right when he said
// the letter's NAME (the English one, the idea's title, 'beta'; the chosen pronunciation's own, Pronunciation.letterNames, 'vita') or its SOUND (the symbols of the chosen
// pronunciation's lesson, 'v', and what a recogniser writes for them, Pronunciation.heardAs, 'vee'), and for nothing else: another letter's name, or the English b for β, is a miss.
// A Greek sound is the scheme's alone (tests/unit/one-pronunciation-scheme.test.ts), so every sound and name is read from it here, never written.
import { chosenPronunciation } from '../../speech/greek';
import { lessonsOf, type Pronunciation } from '../../speech/pronunciation';
import { itemsOf } from './ladder';

/** The words he may say around the letter without changing what he said: 'it is beta', 'the letter v'. */
const FILLER = new Set(['the', 'letter', 'is', 'its', 'it', 'says', 'say', 'sound', 'sounds', 'like', 'that', 'this', 'uh', 'um']);

/** At most this many words besides the filler: a name or a sound, not a sentence. */
const MAX_WORDS = 2;

/** Lower case, no marks, letters and single spaces only: how a heard phrase and a saying are compared. */
const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}]+/gu, ' ')
    .trim();

/** The sayings of a letter in `scheme`, plain: its names (English and the scheme's) and its sounds (the lesson's symbols and what a recogniser writes for them). Empty for what is not a letter. */
function sayingsIn(id: string, scheme: Pronunciation): string[] {
  const letter = itemsOf('alphabet').find((l) => l.id === id);
  if (!letter) return [];
  const symbols = lessonsOf(scheme)[id]?.sounds ?? [];
  const sounds = symbols.flatMap((symbol) => [symbol, ...(scheme.heardAs?.[symbol] ?? [])]);
  return [...new Set([letter.title, ...(scheme.letterNames?.[id] ?? []), ...sounds].map(plain).filter(Boolean))];
}

/** Everything that counts as saying the letter (its ladder idea id, 'letter-beta'): names and sounds, plain lower case. */
export const acceptedSayings = (id: string, scheme: Pronunciation = chosenPronunciation()): string[] => sayingsIn(id, scheme);

/** True when what the phone heard is the letter's name or its sound: the whole phrase (spaces and all, 'k s'), or the one or two words left once the filler goes. */
export function letterHeard(heard: string, id: string, scheme: Pronunciation = chosenPronunciation()): boolean {
  const accepted = new Set(sayingsIn(id, scheme).map((s) => s.replace(/ /g, '')));
  const words = plain(heard).split(' ').filter(Boolean);
  if (accepted.size === 0 || words.length === 0) return false;
  if (accepted.has(words.join(''))) return true;
  const rest = words.filter((w) => !FILLER.has(w));
  return rest.length > 0 && rest.length <= MAX_WORDS && accepted.has(rest.join(''));
}
