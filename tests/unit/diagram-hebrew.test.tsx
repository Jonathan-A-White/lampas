// tests/unit/diagram-hebrew.test.tsx — the sentence diagram of a Hebrew verse (mw-5r3p30.887): the pointed word cut into its article, prefixed preposition and vav and the word itself
// (src/diagram/hebrewPieces.ts), the request the grind is sent for Genesis 1:1, and ReedKellogg drawing the pieces right to left, pointed, with the gloss under each.
import { cleanup, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, GreekWord } from '../../src/data/chapter';
import { hebrewPieces } from '../../src/diagram/hebrewPieces';
import { ReedKellogg } from '../../src/diagram/ReedKellogg';
import { buildDiagramRequest } from '../../src/diagram/request';
import { layoutDiagram } from '../../src/diagram/layout';
import { validateDiagram } from '../../src/diagram/validate';
import { loadFixture } from '../support/diagram-fixtures';

const gen1 = JSON.parse(readFileSync('public/data/gen/1.json', 'utf8')) as Chapter;
const verse1 = gen1.verses[0];
const word = (i: number): GreekWord => verse1.g[i];

afterEach(cleanup);

describe('a Hebrew word cut into its pieces', () => {
  it('splits the prefixed preposition from its noun: בְּרֵאשִׁית is in + beginning', () => {
    expect(hebrewPieces(word(0), 'beginning').map((p) => [p.text, p.gloss, p.parse])).toEqual([
      ['בְּ', 'in', 'Prep-b'],
      ['רֵאשִׁ֖ית', 'beginning', 'N-fs'],
    ]);
  });

  it('splits the article: הַשָּׁמַיִם is the + heavens', () => {
    expect(hebrewPieces(word(4), 'heavens').map((p) => [p.text, p.gloss])).toEqual([['הַ', 'the'], ['שָּׁמַ֖יִם', 'heavens']]);
  });

  it('splits the vav: וְאֵת is and + את', () => {
    expect(hebrewPieces(word(5), '').map((p) => [p.text, p.gloss, p.parse])).toEqual([['וְ', 'and', 'Conj-w'], ['אֵ֥ת', '', 'DirObjM']]);
  });

  it('leaves a word with no prefix whole', () => {
    expect(hebrewPieces(word(1), 'to create').map((p) => p.text)).toEqual(['בָּרָ֣א']);
  });

  it('keeps the preposition and the article it swallows in one piece: בַּיָּמִים is in the + days', () => {
    const w: GreekWord = { t: 'בַּיָּמִ֖ים', tr: '', s: 'H3117', l: 'יוֹם', p: 'Prep-b, Art | N-mp' };
    expect(hebrewPieces(w, 'day').map((p) => [p.text, p.gloss])).toEqual([['בַּ', 'in the'], ['יָּמִ֖ים', 'day']]);
  });

  it('cuts two prefixes: וּבַבֹּקֶר is and + in the + morning', () => {
    const w: GreekWord = { t: 'וּבַבֹּ֣קֶר', tr: '', s: 'H1242', l: 'בֹּקֶר', p: 'Conj-w, Prep-b, Art | N-ms' };
    expect(hebrewPieces(w, 'morning').map((p) => [p.text, p.gloss])).toEqual([['וּ', 'and'], ['בַ', 'in the'], ['בֹּ֣קֶר', 'morning']]);
  });

  it('leaves a word whole when its letters do not fit the parse (never a wrong cut)', () => {
    const w: GreekWord = { t: 'אֱלֹהִים', tr: '', s: 'H430', l: 'אֱלֹהִים', p: 'Prep-b | N-mp' };
    expect(hebrewPieces(w, 'God').map((p) => p.text)).toEqual(['אֱלֹהִים']);
  });
});

describe('the request for Genesis 1:1 in Hebrew', () => {
  const { request, words } = buildDiagramRequest(gen1, [verse1], 'hebrew');

  it('names the verse and the language, and sends every piece in the order of the text', () => {
    expect(request.ref).toBe('Genesis 1:1');
    expect(request.lang).toBe('hebrew');
    expect(request.words.map((w) => w.text)).toEqual(['בְּ', 'רֵאשִׁ֖ית', 'בָּרָ֣א', 'אֱלֹהִ֑ים', 'אֵ֥ת', 'הַ', 'שָּׁמַ֖יִם', 'וְ', 'אֵ֥ת', 'הָ', 'אָֽרֶץ']);
    expect(request.words.map((w) => w.i)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('sends each piece its parse, and the word itself its lemma and gloss', () => {
    expect(request.words[0]).toMatchObject({ parse: 'Prep-b', gloss: 'in' });
    expect(request.words[2]).toMatchObject({ lemma: 'בָּרָא', parse: 'V-Qal-Perf-3ms', gloss: 'to create' });
  });

  it('indexes the renderer by the same pieces, each knowing the verse word it is part of, and its gloss', () => {
    expect(words).toHaveLength(11);
    expect(words[5]).toMatchObject({ text: 'הַ', word: 4, gloss: 'the' });
    expect(words[6]).toMatchObject({ text: 'שָּׁמַ֖יִם', word: 4 });
  });
});

describe('the Genesis 1:1 diagram drawn', () => {
  const fixture = loadFixture('hebrew');
  const measure = (text: string) => text.length * 10;
  const draw = () => render(<ReedKellogg diagram={fixture.diagram} words={fixture.words} mode="hebrew" reference="Genesis 1:1" onWord={() => undefined} measure={measure} />);
  const left = (el: Element): number => parseFloat((el as HTMLElement).style.left);

  it('is a tree that keeps THE RULE for the verse\'s eleven pieces', () => {
    expect(validateDiagram(fixture.diagram, 11)).toEqual({ ok: true });
  });

  it('sets each Hebrew word right to left, pointed, in the Hebrew face', () => {
    draw();
    const verb = document.querySelector('button[data-word="2"]')!;
    expect(verb.querySelector('[lang="he"]')).toHaveAttribute('dir', 'rtl');
    expect(verb).toHaveTextContent('בָּרָ֣א');
    expect(verb.querySelector('[lang="he"]')).toHaveClass('script-he');
  });

  it('puts the first word of a slot at its right: את (4) stands right of שָּׁמַיִם (6) in the object', () => {
    draw();
    const [marker, noun] = [4, 6].map((i) => document.querySelector(`button[data-word="${i}"]`)!);
    expect(left(marker)).toBeGreaterThan(left(noun));
  });

  it('writes the gloss under each word', () => {
    draw();
    expect(document.querySelector('button[data-word="2"] [data-gloss]')).toHaveTextContent('to create');
    expect(document.querySelector('button[data-word="5"] [data-gloss]')).toHaveTextContent('the');
  });

  it('names the picture as Hebrew', () => {
    draw();
    expect(document.querySelector('svg')).toHaveAttribute('aria-label', 'Sentence diagram of Genesis 1:1, Hebrew');
  });

  it('lays a slot out right to left in the layout too, and not for Greek', () => {
    const rtl = layoutDiagram(fixture.diagram, fixture.words, measure, { rtl: true });
    const ltr = layoutDiagram(fixture.diagram, fixture.words, measure);
    const x = (l: typeof rtl, i: number) => l.labels.find((a) => a.index === i)!.x;
    expect(x(rtl, 4)).toBeGreaterThan(x(rtl, 6));
    expect(x(ltr, 4)).toBeLessThan(x(ltr, 6));
  });
});
