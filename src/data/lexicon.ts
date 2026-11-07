// src/data/lexicon.ts — the whole text's lemmas as /data/lexicon.json has them (docs/data.md): a word he names that the open
// chapter does not use is still looked up here, with the gloss and part of speech the chapter files would give it. The Old Testament's Hebrew
// lemmas are /data/lexicon-hbo.json, loaded beside the Greek one by language (mw-5vvlay.2).
import type { SourceLanguage } from './chapter';
import { loadLxxLemmas } from './lxxChapter';
import { getSetting } from '../settings/store';
import { septuagintSetting } from '../settings/definitions/septuagint';

export interface LemmaEntry {
  /** TBESG gloss: 'flesh' (the word card's gloss) */
  g: string;
  /** The answer a drill gives for the word when it is not `g` (mw-5r3p30.1000): at most three meanings, each one the MSB's English uses for a share of the word's uses, 'woman, wife'; absent: `g` is the answer. Greek only. */
  q?: string;
  /** Strong's number, no padding: 'G4561', 'H7225' */
  s: string;
  /** part of speech: 'noun', 'verb' ... (parseCode.ts splitParse) */
  c: string;
}
/** every lemma of the text (NFC) -> its entry */
export type LemmaLexicon = Record<string, LemmaEntry>;

const FILES: Record<SourceLanguage, string> = { grc: '/data/lexicon.json', hbo: '/data/lexicon-hbo.json' };
const lexicons: Partial<Record<SourceLanguage, Promise<LemmaLexicon>>> = {};

/** Fetches /data/lexicon.json (or, for 'hbo', /data/lexicon-hbo.json) once; later and concurrent callers share the one request. A failure is not kept. */
export function loadLexicon(language: SourceLanguage = 'grc'): Promise<LemmaLexicon> {
  const held = lexicons[language];
  if (held) return held;
  const request = fetch(FILES[language]).then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the lexicon: ${response.status}`);
    return (await response.json()) as LemmaLexicon;
  });
  lexicons[language] = request;
  request.catch(() => {
    if (lexicons[language] === request) delete lexicons[language];
  });
  return request;
}

/** The lexicon's entry for a lemma (any Unicode form), or undefined when the text never uses it. Rejects when the lexicon cannot be loaded. */
export async function lookupLemma(lemma: string, language: SourceLanguage = 'grc'): Promise<LemmaEntry | undefined> {
  const all = await loadLexicon(language);
  const key = lemma.normalize('NFC');
  return Object.hasOwn(all, key) ? all[key] : undefined;
}

/**
 * The lemmas of the Septuagint's shipped books (public/data-lxx/lexicon-grc-lxx.json) as a lexicon, for a word the New Testament's lexicon lacks (mw-u2w5klk.16): `{}` while Settings > Old Testament in Greek
 * (Septuagint) is Off, so the Hebrew and the New Testament ask for nothing new, and `{}` when the lexicon cannot be fetched. A Greek lemma only; the entries have no part of speech.
 */
export async function septuagintLemmas(): Promise<LemmaLexicon> {
  const on = await getSetting(septuagintSetting).then((value) => value === 'on', () => false);
  return on ? loadLxxLemmas() : {};
}

/** The Septuagint's entry for a Greek lemma (any Unicode form) the New Testament's lexicon lacks, or undefined; see septuagintLemmas. */
export async function lookupSeptuagintLemma(lemma: string): Promise<LemmaEntry | undefined> {
  const all = await septuagintLemmas();
  const key = lemma.normalize('NFC');
  return Object.hasOwn(all, key) ? all[key] : undefined;
}

/** Drops the lexicon held in memory (tests). */
export function forgetLexicon(): void {
  delete lexicons.grc;
  delete lexicons.hbo;
}
