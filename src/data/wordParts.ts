// src/data/wordParts.ts — how a word is built from its parts (mw-5r3p30.986, his feedback on the lesson 'The negative': "this breakdown ... should be part of
// the lesson"): one shared table, keyed by the word as the lessons show it (its dictionary form, or a form whose parts differ from the lemma's: οὐδεμία), each
// entry its parts in order with a plain gloss for each, and the source that says so. Never an invented etymology: an entry is here because Abbott-Smith (the
// brief lexicon of TBESG: a hyphen in the headword, a derivation in brackets, 'a Combination of' two Strong's numbers) states it, or because Lampas's own
// notes do (src/data/wordHeart.ts, COMPOUND_VERBS); a word with no such statement has no entry and shows nothing. Lessons read it through partsOf
// (src/IdeaSheet.tsx, src/data/grammar/teach/index.ts cardWords); the drills are the next story.
import { COMPOUND_VERBS } from './grammar/prepositions';

/** One piece of a word, as it would be written alone, and what it means. */
export interface WordPart {
  text: string;
  gloss: string;
}

/** Where an entry's breakdown is stated. */
export type PartsSource = 'tbesg' | 'heart' | 'compound';

export interface WordParts {
  parts: WordPart[];
  source: PartsSource;
  /** other forms of the word the lessons show, whose parts are these: ἀπαγγέλλομεν for ἀπαγγέλλω */
  forms?: string[];
}

/** The source of each entry, in a sentence. */
export const PARTS_SOURCES: Readonly<Record<PartsSource, string>> = {
  tbesg: 'Abbott-Smith’s brief lexicon, in TBESG: the headword is written with its parts, or names the two words it is made of',
  heart: 'Lampas’s own note on the word (src/data/wordHeart.ts), written against the lexicon',
  compound: 'Lampas’s list of compound verbs (src/data/grammar/prepositions.ts COMPOUND_VERBS)',
};

const part = (text: string, gloss: string): WordPart => ({ text, gloss });

/** How a preposition at the front of a verb is glossed, as the lesson 'A preposition joined to a verb' glosses them. */
const PREFIX_GLOSS: Readonly<Record<string, string>> = {
  ἐκ: 'out of',
  εἰς: 'into',
  κατά: 'down',
  ἀνά: 'up',
  πρός: 'toward',
  ἀπό: 'from',
  παρά: 'beside',
  μετά: 'after',
  ἐπί: 'on',
  διά: 'through',
  περί: 'around',
  ὑπό: 'under',
  σύν: 'with',
};

/** Forms of a compound verb that the lessons show, by lemma. */
const COMPOUND_FORMS: Readonly<Record<string, string[]>> = { εἰσέρχομαι: ['εἰσελθών'], περιπατέω: ['περιπατεῖν'] };

const compounds: [string, WordParts][] = COMPOUND_VERBS.map((verb) => [
  verb.lemma,
  // Abbott-Smith writes the headword of every one of them but ἀναβαίνω with a hyphen (ἐκ-βάλλω)
  { parts: [part(verb.prefix, PREFIX_GLOSS[verb.prefix]), part(verb.stem, verb.stemMeaning)], source: verb.lemma === 'ἀναβαίνω' ? 'compound' : 'tbesg', forms: COMPOUND_FORMS[verb.lemma] },
]);

const OUDE = part('οὐδέ', 'and not');
const MEDE = part('μηδέ', 'and not');
const ONE = (form: string): WordPart => part(form, 'one');

const ENTRIES: [string, WordParts][] = [
  // the negatives: οὐ and its μή partner. Abbott-Smith's οὐδέποτε is written οὐδέ-ποτε and μηδέποτε (μηδέ, ποτέ); οὐκέτι is G3756+G2089 and μηκέτι (μή, ἔτι)
  ['οὐκ', { parts: [part('οὐ', 'not'), part('κ', 'before a smooth breathing')], source: 'tbesg' }],
  ['οὐχ', { parts: [part('οὐ', 'not'), part('χ', 'before a rough breathing')], source: 'tbesg' }],
  ['οὐδέποτε', { parts: [OUDE, part('ποτέ', 'ever')], source: 'tbesg' }],
  ['μηδέποτε', { parts: [MEDE, part('ποτέ', 'ever')], source: 'tbesg' }],
  ['οὐκέτι', { parts: [part('οὐ', 'not'), part('ἔτι', 'still')], source: 'tbesg' }],
  ['μηκέτι', { parts: [part('μή', 'not'), part('ἔτι', 'still')], source: 'tbesg' }],
  // no one, nothing: the note on οὐδείς in wordHeart.ts ('οὐδέ and εἷς', 'the hidden end of οὐδείς and μηδείς'); Abbott-Smith only relates μηδείς to it
  ['οὐδείς', { parts: [OUDE, ONE('εἷς')], source: 'heart' }],
  ['οὐδεμία', { parts: [OUDE, ONE('μία')], source: 'heart' }],
  ['οὐδέν', { parts: [OUDE, ONE('ἕν')], source: 'heart' }],
  ['μηδείς', { parts: [MEDE, ONE('εἷς')], source: 'heart' }],
  ['μηδεμία', { parts: [MEDE, ONE('μία')], source: 'heart' }],
  ['μηδέν', { parts: [MEDE, ONE('ἕν')], source: 'heart' }],
  // two words run into one (crasis): Abbott-Smith's 'by crasis for καὶ ἐκεῖ' and STEPBible's 'a Combination of' the two numbers
  ['κἀγώ', { parts: [part('καί', 'and'), part('ἐγώ', 'I')], source: 'tbesg' }],
  ['κἀμοί', { parts: [part('καί', 'and'), part('ἐμοί', 'to me')], source: 'tbesg' }],
  ['κἀμέ', { parts: [part('καί', 'and'), part('ἐμέ', 'me')], source: 'tbesg' }],
  ['κἀκεῖ', { parts: [part('καί', 'and'), part('ἐκεῖ', 'there')], source: 'tbesg' }],
  ['κἀκεῖνος', { parts: [part('καί', 'and'), part('ἐκεῖνος', 'that one')], source: 'tbesg', forms: ['κἀκεῖνοι'] }],
  ['κἄν', { parts: [part('καί', 'and'), part('ἐάν', 'if')], source: 'tbesg' }],
  // a verb with a preposition in front
  ...compounds,
  ['ἀπαγγέλλω', { parts: [part('ἀπό', 'from'), part('ἀγγέλλω', 'announce')], source: 'tbesg', forms: ['ἀπαγγέλλομεν'] }],
  ['ἀποστυγέω', { parts: [part('ἀπό', 'from'), part('στυγέω', 'hate')], source: 'tbesg', forms: ['ἀποστυγοῦντες'] }],
];

/** A word as it is looked up: whole letters (NFC), the small letter for a capital, the acute for a grave (καὶ is καί), and no movable ν in brackets. */
export const partsKey = (word: string): string =>
  word
    .normalize('NFD')
    .replace(/̀/g, '́')
    .normalize('NFC')
    .toLowerCase()
    .replace(/\(ν\)$/, '');

/** Every entry by the word it is for. */
export const WORD_PARTS: Readonly<Record<string, WordParts>> = Object.fromEntries(ENTRIES.map(([word, entry]) => [word.normalize('NFC'), entry]));

const BY_KEY = new Map<string, WordParts>();
for (const [word, entry] of ENTRIES) {
  for (const spelt of [word, ...(entry.forms ?? [])]) {
    const key = partsKey(spelt);
    if (BY_KEY.has(key)) throw new Error(`The word parts of ${spelt} are written twice`);
    BY_KEY.set(key, entry);
  }
}

/** The parts of a word as a lesson shows it, or undefined when the table has none: a word with no entry shows nothing. */
export const partsOf = (word: string): WordParts | undefined => BY_KEY.get(partsKey(word));

/** The parts on one line: οὐδέ “and not” + μία “one”. */
export const partsLine = (entry: WordParts): string => entry.parts.map((p) => `${p.text} “${p.gloss}”`).join(' + ');
