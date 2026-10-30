// tests/unit/weave-gloss.test.tsx — a known Greek word hidden inside an English rendering that stays English (mw-5r3p30.878). Acts 18:12 in Weave: 'While' is the English the
// translators supplied for δέ; with δέ known it stays English and the gold δὲ stands beside it, before it ('δὲ While Gallio ...'). The rule: an English chunk that stands for
// more than one Greek word goes once EVERY Greek word it stands for is known; until then each known one is in gold beside it. Weave text is drawn in VerseText and copied by
// copyUnitOf (the Verse view's Copy 'as you read it'), which follow the one rule.
import { cleanup, render } from '@testing-library/react';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { Chapter, Verse } from '../../src/data/chapter';
import { copyText, copyUnitOf, COPY_DEFAULTS } from '../../src/copy/format';
import { VerseText } from '../../src/reader/VerseText';
import { wovenOf } from '../../src/reader/useWoven';
import type { ReaderSettings } from '../../src/reader/useReaderSettings';

afterEach(cleanup);

const chapterOf = (book: string, n: number): Chapter => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;
const settings = (solid: string[], extra: Partial<ReaderSettings> = {}): Partial<ReaderSettings> => ({
  view: 'english',
  weave: 'solid',
  weaveShown: true,
  weaveGrammar: 'any',
  weaveOrder: 'english',
  solid: new Set(solid.map((l) => l.normalize('NFC'))),
  learning: new Set(),
  levels: new Map() as unknown as ReaderSettings['levels'],
  ...extra,
});

function draw(chapter: Chapter, verseN: number, solid: string[], source: 'grc' | 'hbo' = 'grc'): HTMLElement {
  const woven = wovenOf(chapter, settings(solid));
  const i = chapter.verses.findIndex((v) => v.n === verseN);
  const { container } = render(createElement(VerseText, { verse: chapter.verses[i], view: 'english', source, woven: woven?.[i] ?? null, onLook: () => {} }));
  return container;
}

const textOf = (el: HTMLElement): string => (el.querySelector('[data-text]')?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('Acts 18:12 in Weave, δέ known', () => {
  const acts = chapterOf('act', 18);

  it("shows the gold δὲ before 'While' and keeps 'While'", () => {
    const el = draw(acts, 12, ['δέ']);
    expect(textOf(el)).toMatch(/^δὲ While Gallio was proconsul of Achaia,/);
    const gold = el.querySelector('[data-beside]') as HTMLElement;
    expect(gold.textContent?.trim()).toBe('δὲ');
    expect(gold.className).toContain('text-accent');
    // the gold word sits right before the English chunk it hides in
    expect(gold.nextElementSibling?.textContent).toContain('While');
    expect(el.querySelectorAll('[data-beside]')).toHaveLength(1);
    // nothing else of the verse is woven
    expect(el.querySelectorAll('[data-woven]')).toHaveLength(0);
  });

  it('shows no gold beside anything when no word is known', () => {
    const el = draw(acts, 12, []);
    expect(el.querySelectorAll('[data-beside]')).toHaveLength(0);
    expect(textOf(el)).toMatch(/^While Gallio was proconsul/);
  });
});

describe('a chunk that stands for two Greek words', () => {
  const word = (t: string, l: string) => ({ t, tr: '', s: 'G1', l, p: 'X' });
  const verse: Verse = {
    n: 1,
    g: [word('Ἐπιλαβόμενοι', 'ἐπιλαμβάνω'), word('δὲ', 'δέ'), word('ὄντος', 'εἰμί'), word('Γαλλίωνι', 'Γαλλίων')],
    e: [
      { t: 'While', g: [1, 2] },
      { t: 'Gallio', g: [3] },
      { t: 'seized', g: [0] },
    ],
  };
  const chapter = { book: 'Acts', code: 'act', chapter: 1, lex: {}, parse: {}, verses: [verse] } as unknown as Chapter;

  it('keeps the English with each known word in gold beside it until every one is known', () => {
    const one = draw(chapter, 1, ['δέ']);
    expect(textOf(one)).toBe('δὲ While Gallio seized');
    expect(one.querySelectorAll('[data-beside]')).toHaveLength(1);
    const other = draw(chapter, 1, ['εἰμί']);
    expect(textOf(other)).toBe('ὄντος While Gallio seized');
  });

  it('drops the English once every Greek word it stands for is known, and the Greek stands in its place', () => {
    const el = draw(chapter, 1, ['δέ', 'εἰμί']);
    expect(textOf(el)).toBe('δὲ ὄντος Gallio seized');
    expect(textOf(el)).not.toContain('While');
    expect(el.querySelectorAll('[data-beside]')).toHaveLength(0);
    expect(el.querySelectorAll('[data-woven]')).toHaveLength(1);
  });

  it('leaves a known word whose English stands for it alone replacing it, and a frontier word keeps its small English under it', () => {
    const woven = wovenOf(chapter, settings(['Γαλλίων'], { weave: 'solid+learning', learning: new Set(['ἐπιλαμβάνω']) }));
    const { container } = render(createElement(VerseText, { verse, view: 'english', woven: woven?.[0] ?? null, onLook: () => {} }));
    expect(textOf(container)).toBe('While Γαλλίωνι Ἐπιλαβόμενοιseized');
    expect(container.querySelector('[data-learning] [data-greek]')?.textContent).toBe('Ἐπιλαβόμενοι');
    expect(container.querySelector('[data-hint]')?.textContent).toBe('seized');
    expect(container.querySelectorAll('[data-beside]')).toHaveLength(0);
  });
});

describe('the same in Hebrew Weave (Genesis 1:11, "plants" = עֵשֶׂב + זֶרַע)', () => {
  const gen = chapterOf('gen', 1);
  const plants = gen.verses.find((v) => v.n === 11) as Verse;
  const [herb, seed] = [5, 7].map((i) => plants.g[i].l);

  it('shows the one known Hebrew word in gold beside the English, and drops it once both are known', () => {
    const one = draw(gen, 11, [herb], 'hbo');
    const gold = one.querySelector('[data-beside]') as HTMLElement;
    expect(gold.textContent?.trim()).toBe(plants.g[5].t);
    expect(gold.getAttribute('dir')).toBe('rtl');
    expect(gold.nextElementSibling?.textContent).toContain('plants');
    const both = draw(gen, 11, [herb, seed], 'hbo');
    expect(textOf(both)).not.toContain('plants');
    expect(both.querySelectorAll('[data-beside]')).toHaveLength(0);
  });
});

describe("Copy 'as you read it' follows the same rule", () => {
  it('copies the gold δὲ before the English it stays beside', () => {
    const acts = chapterOf('act', 18);
    const woven = wovenOf(acts, settings(['δέ']));
    const unit = copyUnitOf(acts, { n: 12 }, { view: 'english', woven });
    const text = copyText(unit, { ...COPY_DEFAULTS, reference: 'off', numbers: 'off', link: 'off' });
    expect(text).toMatch(/^δὲ While Gallio was proconsul/);
  });
});
