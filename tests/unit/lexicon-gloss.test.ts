// A gloss never repeats itself (mw-5r3p30.374): 'to see: see' is written 'to see' once, in the data, so no screen has to mend it.
// The sweep reads public/data/lexicon.json and every chapter's lex 'g'; src/data/gloss.ts cleanGloss is what the data build runs.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanGloss } from '../../src/data/gloss';
import type { LemmaLexicon } from '../../src/data/lexicon';

const DATA = 'public/data';
const FILLER = new Set(['to', 'an', 'a', 'be']);
const wordsOf = (part: string): string[] => part.toLowerCase().split(/[\s,]+/).filter((w) => w && !FILLER.has(w));

/** True for 'A: B' where every word of B is already in A (filler words and commas ignored). */
export function repeatsItself(gloss: string): boolean {
  const split = /^([^:]+):\s*(.+)$/.exec(gloss);
  if (!split) return false;
  const before = new Set(wordsOf(split[1]));
  const after = wordsOf(split[2]);
  return after.every((w) => before.has(w));
}

function allGlosses(): { where: string; g: string }[] {
  const lexicon = JSON.parse(readFileSync(`${DATA}/lexicon.json`, 'utf8')) as LemmaLexicon;
  const found = Object.entries(lexicon).map(([lemma, e]) => ({ where: `lexicon ${lemma}`, g: e.g }));
  for (const book of readdirSync(DATA).filter((b) => statSync(`${DATA}/${b}`).isDirectory())) {
    for (const file of readdirSync(`${DATA}/${book}`)) {
      const chapter = JSON.parse(readFileSync(`${DATA}/${book}/${file}`, 'utf8')) as { lex?: Record<string, { g: string }> };
      for (const [strongs, e] of Object.entries(chapter.lex ?? {})) found.push({ where: `${book}/${file} ${strongs}`, g: e.g });
    }
  }
  return found;
}

describe('a gloss that repeats itself', () => {
  it.each(['to see: see', 'to call: call', 'to throw: throw', 'to release: release', 'to torture: torture', 'an age: age', 'be weak: weak'])(
    'is found in the source form %j',
    (raw) => {
      expect(repeatsItself(raw)).toBe(true);
    },
  );

  it.each(['to say: speak', 'to see', 'spirit, breath', 'be weary/sick: weak'])('is not found in %j', (plain) => {
    expect(repeatsItself(plain)).toBe(false);
  });

  it('is written once by the data build: ὁράω reads "to see" and its aorist note (mw-bsf54t.12)', () => {
    const lexicon = JSON.parse(readFileSync(`${DATA}/lexicon.json`, 'utf8')) as LemmaLexicon;
    expect(lexicon['ὁράω'].g).toBe('to see (aorist εἶδον)');
    for (const [lemma, gloss] of [['καλέω', 'to call'], ['βάλλω', 'to throw (aorist ἔβαλον)'], ['ἀπολύω', 'to release'], ['βασανίζω', 'to torture'], ['αἰών', 'an age'], ['ἀσθενέω', 'be weak']]) {
      expect(lexicon[lemma].g).toBe(gloss);
    }
  });

  it('is in no lexicon entry and no chapter lex of the data', () => {
    const glosses = allGlosses();
    expect(glosses.length).toBeGreaterThan(5000);
    expect(glosses.filter(({ g }) => repeatsItself(g))).toEqual([]);
  });

  it('is cleaned by the build function, and one whose parts differ is kept', () => {
    expect(cleanGloss('to see: see')).toBe('to see');
    expect(cleanGloss('to say: speak')).toBe('to say, speak');
  });
});
