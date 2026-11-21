// tests/unit/weave-gone-draw.test.ts — what VerseText draws of an added English word (mw-u2w5klk.349.69): Genesis 1:1 of the Septuagint, 'In the beginning', has no Greek for 'the'.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import type { Chapter } from '../../src/data/chapter';
import { VerseText } from '../../src/reader/VerseText';
import { wovenOf } from '../../src/reader/useWoven';
import { alignChapter } from '../../scripts/lxx/align';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const plain = read<Chapter>('tests/fixtures/data-lxx/gen/1.json');
const lexicon = read<Record<string, { g?: string }>>('tests/fixtures/data-lxx/lexicon-grc-lxx.json');
const lxx = alignChapter(plain, (lemma) => lexicon[lemma]?.g ?? '').chapter;
const settings = { view: 'english' as const, weave: 'solid' as const, weaveShown: true, weaveGrammar: 'any' as const, weaveOrder: 'english' as const, learning: new Set<string>(), levels: new Map() };

const drawn = (solid: string[], on = true): string => {
  const woven = on ? wovenOf(lxx, { ...settings, solid: new Set(solid) }) : null;
  const { container } = render(createElement(VerseText, { verse: lxx.verses[0], view: 'english', woven: woven?.[0] ?? null, onLook: () => undefined }));
  return container.textContent ?? '';
};

describe("Genesis 1:1's added 'the' in the Weave", () => {
  it('is not drawn when Ἐν and ἀρχή are both in Greek', () => {
    const text = drawn(['ἐν', 'ἀρχή']);
    expect(text).toContain('ΕΝ');
    expect(text).toContain('ΑΡΧΗ');
    expect(text).not.toMatch(/ΕΝ\s*the/);
    expect(text).toMatch(/ΕΝ\s*ΑΡΧΗ/);
  });

  it('is drawn when ἀρχή is not known', () => {
    expect(drawn(['ἐν'])).toMatch(/ΕΝ\s*the\s*beginning/);
  });

  it('is drawn whole, the included, when the Weave is off', () => {
    expect(drawn(['ἐν', 'ἀρχή'], false)).toMatch(/In\s*the\s*beginning/);
  });
});
