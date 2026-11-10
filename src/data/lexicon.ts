// src/data/lexicon.ts — the whole text's lemmas as /data/lexicon.json has them (docs/data.md): a word he names that the open
// chapter does not use is still looked up here, with the gloss and part of speech the chapter files would give it. The Old Testament's Hebrew
// lemmas are /data/lexicon-hbo.json, loaded beside the Greek one by language (mw-5vvlay.2).
import { listUrl, type SourceLanguage } from './chapter';
import { lemmaKeyOf } from './lemma';
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
  /** Hebrew only (mw-fnvjof.17.40): another spelling of the number's lemma that the text never uses ('יָרָה' for H3384, the text's being 'יָרָא'); a lookup by number gives the text's own spelling, not this. */
  v?: true;
}
/** every lemma of the text (NFC) -> its entry */
export type LemmaLexicon = Record<string, LemmaEntry>;

/** The Greek lexicon is in the precache, so its plain address is always the build's own; the Hebrew one is asked for by its fingerprint (listUrl), so a changed list reaches a phone that kept the old (mw-fnvjof.17.41). */
const file = (language: SourceLanguage): string => (language === 'hbo' ? listUrl('lexicon-hbo') : '/data/lexicon.json');
const lexicons: Partial<Record<SourceLanguage, Promise<LemmaLexicon>>> = {};

/** Fetches /data/lexicon.json (or, for 'hbo', /data/lexicon-hbo.json?v=<fingerprint>) once; later and concurrent callers share the one request. A failure is not kept. */
export function loadLexicon(language: SourceLanguage = 'grc'): Promise<LemmaLexicon> {
  const held = lexicons[language];
  if (held) return held;
  const request = fetch(file(language)).then(async (response) => {
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

const byHeadword = new WeakMap<LemmaLexicon, Map<string, LemmaEntry>>();

/**
 * The entry of a lemma in a lexicon of the Septuagint's lemmas (any Unicode form): the lemma as written, else its headword's, else the entry of the list that begins with that headword
 * (mw-u2w5klk.327: the derivation writes some lemmas as a list, 'ὕδωρ, ὕδατος', and the lexicon holds that key, so the headword he or the tutor names, 'ὕδωρ', is the same entry).
 */
export function septuagintEntry(all: LemmaLexicon, lemma: string): LemmaEntry | undefined {
  const key = lemma.normalize('NFC');
  if (Object.hasOwn(all, key)) return all[key];
  const head = lemmaKeyOf(key);
  if (Object.hasOwn(all, head)) return all[head];
  let heads = byHeadword.get(all);
  if (!heads) {
    heads = new Map();
    for (const [listed, entry] of Object.entries(all)) if (!heads.has(lemmaKeyOf(listed))) heads.set(lemmaKeyOf(listed), entry);
    byHeadword.set(all, heads);
  }
  return heads.get(head);
}

/** The Septuagint's entry for a Greek lemma (any Unicode form, a list's headword too) the New Testament's lexicon lacks, or undefined; see septuagintLemmas and septuagintEntry. */
export async function lookupSeptuagintLemma(lemma: string): Promise<LemmaEntry | undefined> {
  return septuagintEntry(await septuagintLemmas(), lemma);
}

/** Drops the lexicon held in memory (tests). */
export function forgetLexicon(): void {
  delete lexicons.grc;
  delete lexicons.hbo;
}
