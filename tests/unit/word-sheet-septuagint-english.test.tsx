// The English line of a Septuagint word's sheet (mw-u2w5klk.274.4, his ask 2026-11-06: Genesis 1:1 οὐρανόν showed the whole verse): the tapped word's own aligned Brenton chunk, as the New Testament's
// word shows its MSB chunk; a word with no chunk shows the whole verse's English, and the sheet says it is the whole verse. A New Testament word and a Hebrew word are as they were.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { bareEnglish, type Chapter, type EnglishChunk, type GreekWord, type Verse } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import { WordSheet, type Lookup } from '../../src/WordSheet';
import { applyModel, readModelRows } from '../../scripts/lxx/align-choose';

afterEach(cleanup);

const WHOLE = 'In the beginning God made the heaven and the earth.';

/** Genesis 1 from the Septuagint fixture, its first verse re-cut into aligned chunks (the shape lxx:align writes): ὁ (3) has no chunk, τὸν (5) is paired to nothing and has none either. */
function aligned(): Chapter {
  const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
  const e: EnglishChunk[] = [
    { t: 'In', g: [0], c: 0.7, y: 'align' },
    { t: 'the beginning', g: [1], c: 0.8, y: 'model' },
    { t: 'God', g: [4], c: 0.85, y: 'align' },
    { t: 'made', g: [2], c: 0.85, y: 'align' },
    { t: 'the', g: [], y: 'model', c: 0.5 },
    { t: 'heaven', g: [6], c: 0.85, y: 'align' },
    { t: 'and', g: [7], c: 0.85, y: 'align' },
    { t: 'the', g: [8], c: 0.55, y: 'align' },
    { t: 'earth.', g: [9], c: 0.9, y: 'align' },
  ];
  const verse = chapter.verses[0];
  const at = (i: number): number | undefined => {
    const k = e.findIndex((c) => c.g.includes(i));
    return k < 0 ? undefined : k;
  };
  verse.g.forEach((w, i) => {
    delete w.e;
    const k = at(i);
    if (k !== undefined) w.e = k;
  });
  verse.e = e;
  return chapter;
}

const sheet = (chapter: Chapter, word: GreekWord, english?: string): void => {
  render(<WordSheet chapter={chapter} lookup={{ words: [word], english, fromEnglish: false }} onClose={() => undefined} />);
};

describe('the English line of a Septuagint word', () => {
  it('is the tapped word’s own chunk: οὐρανόν in Genesis 1:1 reads “heaven”, not the whole verse', async () => {
    const chapter = aligned();
    const word = chapter.verses[0].g[6];
    expect(word.t).toBe('οὐρανὸν');
    sheet(chapter, word, chapter.verses[0].e[word.e!].t);
    const line = await screen.findByTestId('sheet-english');
    expect(line.textContent).toBe('heaven');
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });

  it('is the own chunk even when the tap came with no English at all (a word opened from a list)', async () => {
    const chapter = aligned();
    sheet(chapter, chapter.verses[0].g[9]);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe('earth');
  });

  it('is the whole verse, labelled as the whole verse, for a word with no chunk', async () => {
    const chapter = aligned();
    const word = chapter.verses[0].g[3];
    expect(word.e).toBeUndefined();
    sheet(chapter, word);
    const line = await screen.findByTestId('sheet-english');
    expect(line.textContent).toContain(WHOLE.replace(/\.$/, ''));
    const label = screen.getByTestId('sheet-english-whole');
    expect(label.textContent).toBe('This word has no English of its own: the whole verse.');
    expect(line.contains(label)).toBe(true);
  });

  it('is the whole verse, labelled, for a word of a chapter the aligner has not cut (one chunk holds every word)', async () => {
    const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
    const word = chapter.verses[0].g[6];
    expect(word.e).toBe(0);
    sheet(chapter, word, chapter.verses[0].e[0].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toContain(WHOLE.replace(/\.$/, ''));
    expect(screen.getByTestId('sheet-english-whole')).toBeTruthy();
  });

  it('is unchanged for a New Testament word: its MSB chunk, with no whole-verse label', async () => {
    const mat = JSON.parse(readFileSync('public/data/mat/1.json', 'utf8')) as Chapter;
    const verse = mat.verses[0];
    const word = verse.g.find((w) => w.e !== undefined)!;
    sheet(mat, word, verse.e[word.e!].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe(bareEnglish(verse.e[word.e!].t));
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });

  it('is unchanged for a Hebrew word: its chunk', async () => {
    const gen = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
    const verse = gen.verses[0];
    const word = verse.g.find((w) => w.e !== undefined)!;
    sheet(gen, word, verse.e[word.e!].t);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe(bareEnglish(verse.e[word.e!].t));
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });
});

// His report (2026-11-10, mw-u2w5klk.349.2): in Genesis 20:1, English view, a tap on "removed" opened the Verse view, because the aligner left 'removed thence' as a remainder (no Greek word) and the model pass had
// not been run for Genesis 20. The verse here is the aligner's Genesis 20:1 (Swete's words, Brenton's chunks), with the model pass's committed rows for it (data/lxx/align/gen-20.tsv) applied as lxx:ship applies them.
describe("a tap on 'removed' in Genesis 20:1 (the English view)", () => {
  const greek: Array<[string, string, string]> = [
    ['Καὶ', 'καί', 'CONJ'], ['ἐκίνησεν', 'κινέω', 'V-AAI-3S'], ['ἐκεῖθεν', 'ἐκεῖθεν', 'ADV'], ['Ἀβραὰμ', 'Ἀβραάμ', 'N-PRI'], ['εἰς', 'εἰς', 'PREP'], ['γῆν', 'γῆ', 'N-ASF'],
    ['πρὸς', 'πρός', 'PREP'], ['λίβα,', 'λίψ', 'N-ASM'], ['καὶ', 'καί', 'CONJ'], ['ᾤκησεν', 'οἰκέω', 'V-AAI-3S'], ['ἀνὰ', 'ἀνά', 'PREP'], ['μέσον', 'μέσος', 'A-ASN'], ['Καδὴς', 'Κάδης', 'N-PRI'],
    ['καὶ', 'καί', 'CONJ'], ['ἀνὰ', 'ἀνά', 'PREP'], ['μέσον', 'μέσος', 'A-ASN'], ['Σούρ·', 'Σούρ', 'N-PRI'], ['καὶ', 'καί', 'CONJ'], ['παρῴκησεν', 'παροικέω', 'V-AAI-3S'], ['ἐν', 'ἐν', 'PREP'],
    ['Γεράροις.', 'Γέραρα', 'N-DPN'],
  ];
  /** what the aligner makes of the verse: the English in chunks, two of them remainders (y 'align?', no Greek word) */
  const chunks: Array<[string, number[]]> = [
    ['And', [0]], ['Abraam', [3]], ['removed thence', []], ['to', [6]], ['the southern country,', []], ['and', [8]], ['lived', [9]], ['between', [11]], ['Cades', [12]], ['and', [13]], ['Sur,', [16]],
    ['and', [17]], ['sojourned', [18]], ['in', [19]], ['Gerara.', [20]],
  ];
  const aligner = (): Chapter => {
    const e: EnglishChunk[] = chunks.map(([t, g]) => (g.length > 0 ? { t, g, c: 0.7, y: 'align' as const } : { t, g, y: 'align?' as const }));
    const g: GreekWord[] = greek.map(([t, l, p], i) => {
      const k = e.findIndex((c) => c.g.includes(i));
      return { t, tr: '', s: '', l, p, y: '2', c: 0.9, ...(k < 0 ? {} : { e: k }) };
    });
    // the fixture's tables stand for the chapter's own (the sheet reads a word's parsing and gloss from them)
    const fixture = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as Chapter;
    return { ...fixture, chapter: 20, verses: [{ n: 1, g, e }] };
  };
  const rows = readModelRows(readFileSync('data/lxx/align/gen-20.tsv', 'utf8')).filter((r) => r.ref === 'Gen.20:1');
  const draw = (verse: Verse, looks: Lookup[], opened: number[]) =>
    render(<VerseText verse={verse} view="english" woven={null} onLook={(l) => looks.push(l)} onUnlinked={() => opened.push(verse.n)} />);

  it('is why it opened the Verse view: the aligner paired it to no Greek word', () => {
    const verse = aligner().verses[0];
    expect(verse.e[2].g).toEqual([]);
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(verse, looks, opened);
    fireEvent.click(screen.getByText('removed thence'));
    expect(looks).toEqual([]);
    expect(opened).toEqual([1]);
  });

  it('opens the Word sheet of ἐκίνησεν once the model pass has paired it, not the Verse view', async () => {
    const done = applyModel(aligner(), rows);
    expect(done.stale).toEqual([]);
    const chapter = done.chapter;
    const verse = chapter.verses[0];
    const looks: Lookup[] = [];
    const opened: number[] = [];
    draw(verse, looks, opened);
    fireEvent.click(screen.getByText('removed'));
    expect(opened).toEqual([]);
    expect(looks).toHaveLength(1);
    expect(looks[0].words.map((w) => w.t)).toEqual(['ἐκίνησεν']);
    cleanup();
    sheet(chapter, looks[0].words[0], looks[0].english);
    expect((await screen.findByTestId('sheet-english')).textContent).toBe('removed');
    expect(screen.queryByTestId('sheet-english-whole')).toBeNull();
  });
});
