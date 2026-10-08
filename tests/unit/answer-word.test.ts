// A Greek word of the companion's answer is found again in the chapter, so a tap opens the word sheet.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Chapter } from '../../src/data/chapter';
import { findGreekWord } from '../../src/data/answerWord';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse = (n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const word = (greek: string, lemma: string) => ({ greek, lemma, note: 'x' });

describe('findGreekWord', () => {
  it('finds the word as written, in the verse the talk is about', () => {
    const found = findGreekWord({ title: 'Romans 8', chapter, verse: verse(28) }, word('συνεργεῖ', 'συνεργέω'));
    expect(found?.t).toBe('συνεργεῖ');
    expect(verse(28).g).toContain(found);
  });

  it('looks in the verse of the talk first, and then in the rest of the chapter', () => {
    const pneuma = verse(9).g.find((w) => w.l === 'πνεῦμα');
    if (!pneuma) throw new Error('no πνεῦμα in verse 9');
    expect(findGreekWord({ title: 'Romans 8', chapter, verse: verse(28) }, word(pneuma.t, 'πνεῦμα'))?.l).toBe('πνεῦμα');
    expect(findGreekWord({ title: 'Romans 8', chapter, verse: null }, word(pneuma.t, 'πνεῦμα'))?.l).toBe('πνεῦμα');
  });

  it('finds a word written without its accents or in another case, and a form by its lemma', () => {
    const scope = { title: 'Romans 8', chapter, verse: null };
    expect(findGreekWord(scope, word('συνεργει', 'x'))?.t).toBe('συνεργεῖ');
    expect(findGreekWord(scope, word('ΣΥΝΕΡΓΕΙ', 'x'))?.t).toBe('συνεργεῖ');
    expect(findGreekWord(scope, word('zzz', 'συνεργέω'))?.l).toBe('συνεργέω');
  });

  it('finds nothing for a word the chapter does not have', () => {
    expect(findGreekWord({ title: 'Romans 8', chapter, verse: null }, word('Ἰωάννης', 'Ἰωάννης'))).toBeUndefined();
  });
});
