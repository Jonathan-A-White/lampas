// scripts/ladder-en.ts — the English reading ladder (mw-neuq78.2, docs/reading-ladder.md): scores every verse's English, as the app shows it,
// for how hard it is to SAY aloud (not to understand) and writes public/data/ladder/en.json in el.json's shape, easiest first.
// Run by `npm run ladder` (after ladder-el.ts), never at runtime. Deterministic: the same data gives the same bytes. The weights are a first guess.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildLadderWith, reasons, type LadderEntry } from './ladder-shared';

/** What each thing costs. PROVISIONAL: a first guess, to be tuned by hearing him read. */
export const WEIGHTS = {
  /** every word is one more thing to say */
  word: 1,
  /** every syllable of a word after its first */
  syllable: 1,
  /** the longest word, per syllable past LONG_WORD */
  longWord: 2,
  /** a name or loanword (capitalised in the middle of a sentence): this much from three syllables, 2/3 of it for two, then one per syllable past 2 */
  name: 3,
  /** a spelling that breaks the usual sounds: ough, augh, eigh, ph, gh, ch, a silent first letter (kn wr gn ps), a silent final b (mb) */
  oddSpelling: 1,
  /** ough and augh are the worst of them: the same letters say five different sounds */
  roughSpelling: 2,
};
const LONG_WORD = 3;

/** Capitalised words that are not hard names: the persons of God, titles and groups the reader says every day, and the capitals he meets on the way. */
const COMMON = new Set(
  ['i', 'god', 'lord', 'jesus', 'christ', 'spirit', 'father', 'son', 'holy', 'he', 'him', 'his', 'himself', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'me', 'my', 'mine', 'myself', 'we', 'our', 'us', 'it', 'one', 'scripture', 'scriptures', 'sabbath', 'jews', 'jew', 'jewish', 'gentiles', 'gentile',
    'savior', 'teacher', 'master', 'lamb', 'king', 'man', 'law', 'word', 'truly', 'passover', 'twelve', 'amen', 'father’s', 'god’s', 'lord’s', 'jesus’', 'christ’s'],
);

/** The word's letters only: lower case, no marks, no apostrophe ('Uriah’s' is 'uriahs'; a possessive s is dropped first). */
function bare(word: string): string {
  return word
    .replace(/[’']s$/i, '')
    .replace(/[^A-Za-z]/g, '')
    .toLowerCase();
}

/** The syllables of an English word, by the usual vowel-group count and its usual corrections. A heuristic: right for most words, never far out. */
export function syllablesOf(word: string): number {
  let w = bare(word);
  if (w === '') return 0;
  w = w.replace(/^every/, 'evry');
  let n = (w.match(/[aeiouy]+/g) ?? []).length;
  if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n -= 1; // silent final e: made, loved, believe
  else if (n > 1 && /[^aeiouytdsxzcghj]es$/.test(w)) n -= 1; // names, hopes
  else if (n > 1 && /[^aeiouyt d]ed$/.test(w)) n -= 1; // walked, called
  n += (w.match(/[^tscgxq]i[aou]|eo|[^qg]uo|ao/g) ?? []).length; // two vowels said apart: Uriah, Zion, Leonard
  return Math.max(1, n);
}

interface WordFacts {
  syllables: number;
  /** points for a name, 0 when it is not one */
  name: number;
  odd: number;
  rough: number;
}

const ODD = /ph|gh|ch|^kn|^wr|^gn|^ps|^pn|mb$|th(?=m)/;

/** The spellings that break the usual sounds, as [ordinary, rough] counts. */
function spellings(w: string): [number, number] {
  const rough = (w.match(/ough|augh|eigh/g) ?? []).length;
  const stripped = w.replace(/ough|augh|eigh/g, '');
  let odd = 0;
  for (const m of stripped.matchAll(new RegExp(ODD, 'g'))) if (m[0] !== '') odd += 1;
  return [odd, rough];
}

function factsOf(token: string, sentenceStart: boolean): WordFacts | null {
  const w = bare(token);
  if (w === '') return null;
  const syllables = syllablesOf(token);
  const letters = token.replace(/^[^A-Za-z]+/, '');
  const capital = /^[A-Z]/.test(letters);
  let name = 0;
  if (capital && !sentenceStart && !COMMON.has(letters.toLowerCase().replace(/[^a-z’']/g, ''))) {
    name = syllables >= 3 ? WEIGHTS.name + 2 * (syllables - 3) : syllables === 2 ? WEIGHTS.name - 1 : 0;
  }
  const [odd, rough] = spellings(w);
  return { syllables, name, odd, rough };
}

/** The tokens of the verse's English with whether each opens a sentence (the verse's first word, one after . ? ! or one that opens a quotation). */
function tokensOf(english: string): { token: string; start: boolean }[] {
  const out: { token: string; start: boolean }[] = [];
  let start = true;
  for (const token of english.split(/\s+/).flatMap((t) => (/^[^-]*-[^-]+/.test(t) && !/^-|-$/.test(t) ? t.split(/-+/) : [t]))) {
    if (token === '') continue;
    out.push({ token, start: start || /^[“‘"]/.test(token) });
    start = /[.?!:][”’"')\]]*$/.test(token);
  }
  return out;
}

/** The score of one verse from its English as shown (the chunks joined by a space), and up to three reasons for it. */
export function scoreEnglish(english: string): { score: number; why: string[] } {
  const all = tokensOf(english)
    .map(({ token, start }) => factsOf(token, start))
    .filter((f): f is WordFacts => f !== null);
  const sum = (pick: (f: WordFacts) => number): number => all.reduce((n, f) => n + pick(f), 0);
  const longest = all.reduce((n, f) => Math.max(n, f.syllables), 0);
  const extra = sum((f) => f.syllables - 1);
  const names = sum((f) => f.name);
  const nameCount = all.filter((f) => f.name > 0).length;
  const odd = sum((f) => f.odd);
  const rough = sum((f) => f.rough);
  const parts: [number, string][] = [
    [all.length * WEIGHTS.word, `${all.length} ${all.length === 1 ? 'word' : 'words'}`],
    [extra * WEIGHTS.syllable, `${extra + all.length} ${extra + all.length === 1 ? 'syllable' : 'syllables'}`],
    [Math.max(0, longest - LONG_WORD) * WEIGHTS.longWord, `a ${longest}-syllable word`],
    [names, `${nameCount} ${nameCount === 1 ? 'name' : 'names'}`],
    [odd * WEIGHTS.oddSpelling + rough * WEIGHTS.roughSpelling, `${odd + rough} odd ${odd + rough === 1 ? 'spelling' : 'spellings'}`],
  ];
  return { score: parts.reduce((n, [points]) => n + points, 0), why: reasons(parts) };
}

/** The verse's English as the Reader shows it: its chunks in order, joined by a space. */
const englishOf = (verse: { e: { t: string }[] }): string => verse.e.map((c) => c.t.trim()).join(' ');

/** Scores every verse under `dataDir` and writes the ladder to `outFile`: easiest first, a tie by canonical order. */
export function buildLadder(dataDir: string, outFile: string): LadderEntry[] {
  return buildLadderWith(dataDir, outFile, (verse) => scoreEnglish(englishOf(verse)));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const ladder = buildLadder('public/data', 'public/data/ladder/en.json');
  console.log(`${ladder.length} verses, easiest ${ladder[0].ref} (${ladder[0].score}), hardest ${ladder[ladder.length - 1].ref} (${ladder[ladder.length - 1].score})`);
}
