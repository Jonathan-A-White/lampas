// The word card's Lemma line names the dictionary form once (mw-5r3p30.864): TBESG writes some lemma columns as 'form=lemma' ('Ἕλλην=Ἕλλην'),
// and the build kept that column whole, so the card read 'Lemma: Ἕλλην=Ἕλλην'.
import { cleanup, render, screen, within } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { parseTbes } from '../../scripts/data/tbes';
import type { Chapter } from '../../src/data/chapter';
import { WordSheet } from '../../src/WordSheet';

afterEach(cleanup);

const row = (...f: string[]): string => f.join('\t');
const readJson = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

describe('the lemma the build takes from TBESG', () => {
  const greek = parseTbes(
    [
      row('G1672', 'G1672 = the Greek of', 'H3120G', 'Ἕλλην=Ἕλλην', 'Hellēn', 'N:N--LG', 'Greek, Gentile', 'a Greek'),
      row('G1676', 'G1676 = a Spelling of', 'G1673', 'Ἑλληνιστί=Ἑλληνικός', 'Hellēnisti', 'G:ADV-T', 'Greek', 'in Greek'),
      row('G0002', 'G0002 =', 'G0002', 'ἀγαθός', 'agathos', 'G:A', 'good', 'good'),
    ].join('\n'),
    { letter: 'G', gloss: (_lemma, raw) => raw },
  );

  it('is the form before the "=", once', () => {
    expect(greek.get('G1672')?.lemma).toBe('Ἕλλην');
    expect(greek.get('G1676')?.lemma).toBe('Ἑλληνιστί');
    expect(greek.get('G2')?.lemma).toBe('ἀγαθός');
  });
});

describe('the committed data', () => {
  it('has no lemma with an "=" in the lexicons, the frequency lists or any chapter', () => {
    const bad: string[] = [];
    for (const file of ['lexicon.json', 'lexicon-hbo.json']) {
      for (const key of Object.keys(readJson<Record<string, unknown>>(`public/data/${file}`))) if (key.includes('=')) bad.push(`${file}: ${key}`);
    }
    for (const file of ['frequency.json', 'frequency-hbo.json']) {
      const list = readJson<Array<{ lemma?: string }> | Record<string, { lemma?: string }>>(`public/data/${file}`);
      for (const e of Array.isArray(list) ? list : Object.values(list)) if (e.lemma?.includes('=')) bad.push(`${file}: ${e.lemma}`);
    }
    for (const book of readdirSync('public/data', { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const file of readdirSync(`public/data/${book.name}`).filter((f) => f.endsWith('.json'))) {
        const chapter = readJson<Chapter>(`public/data/${book.name}/${file}`);
        if (!Array.isArray(chapter.verses)) continue; // ladder/ holds other files
        for (const verse of chapter.verses) for (const w of verse.g) if (w.l.includes('=')) bad.push(`${book.name}/${file}: ${w.l}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('the word card for Ἕλληνες, Acts 18:17', () => {
  it('reads "Lemma: Ἕλλην"', async () => {
    const chapter = readJson<Chapter>('public/data/act/18.json');
    const word = chapter.verses.find((v) => v.n === 17)!.g.find((w) => w.t === 'Ἕλληνες')!;
    render(<WordSheet chapter={chapter} lookup={{ words: [word], fromEnglish: false }} onClose={() => undefined} />);
    const lemma = (await screen.findAllByTestId('sheet-lemma'))[0];
    expect(lemma.textContent).toBe('Ἕλλην');
    expect(within(lemma.parentElement as HTMLElement).getByText(/Lemma/).textContent).toContain('Lemma');
  });
});
