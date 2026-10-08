// src/data/lexicon.ts — the whole text's lemmas as /data/lexicon.json has them (docs/data.md): a word he names that the open
// chapter does not use is still looked up here, with the gloss and part of speech the chapter files would give it.

export interface LemmaEntry {
  /** TBESG gloss: 'flesh' */
  g: string;
  /** Strong's number, no padding: 'G4561' */
  s: string;
  /** part of speech: 'noun', 'verb' ... (parseCode.ts splitParse) */
  c: string;
}
/** every lemma of the text (NFC) -> its entry */
export type LemmaLexicon = Record<string, LemmaEntry>;

let lexicon: Promise<LemmaLexicon> | undefined;

/** Fetches /data/lexicon.json once; later and concurrent callers share the one request. A failure is not kept. */
export function loadLexicon(): Promise<LemmaLexicon> {
  if (lexicon) return lexicon;
  const request = fetch('/data/lexicon.json').then(async (response) => {
    if (!response.ok) throw new Error(`Could not load the lexicon: ${response.status}`);
    return (await response.json()) as LemmaLexicon;
  });
  lexicon = request;
  request.catch(() => {
    if (lexicon === request) lexicon = undefined;
  });
  return request;
}

/** The lexicon's entry for a lemma (any Unicode form), or undefined when the text never uses it. Rejects when the lexicon cannot be loaded. */
export async function lookupLemma(lemma: string): Promise<LemmaEntry | undefined> {
  const all = await loadLexicon();
  const key = lemma.normalize('NFC');
  return Object.hasOwn(all, key) ? all[key] : undefined;
}

/** Drops the lexicon held in memory (tests). */
export function forgetLexicon(): void {
  lexicon = undefined;
}
