// tests/unit/weave-lxx-every-word.test.ts — every Greek word of a Septuagint verse is drawn, in Greek or by its English, in every Weave order (mw-u2w5klk.349.108; the Governor's report of 2026-11-24, Psalms 24, Greek 23):
// verse 1 read 'Τοῦ κυρίου ἡ γῆ καὶ τὸ ἡ world', with πλήρωμα αὐτῆς in neither language. Brenton's 'fullness thereof;' was a chunk the pairing had not reached ('align?', no Greek word), and the Weave dropped it as an
// English word added by design (src/data/weave.ts goneVerse, mw-u2w5klk.349.69) once τὸ and ἡ on either side of it were in Greek.
import '@testing-library/react/dont-cleanup-after-each';
import { render, cleanup } from '@testing-library/react';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { type Chapter, type Verse, wordLemma } from '../../src/data/chapter';
import { goneOf, weaveVerse, withBeside, withGone, wovenInOrder, type WeaveLemmas, type WovenVerse } from '../../src/data/weave';
import { VerseText } from '../../src/reader/VerseText';
import { wovenOf } from '../../src/reader/useWoven';
import { alignChapter } from '../../scripts/lxx/align';
import { readModelDir } from '../../scripts/lxx/align-choose';
import { runShip } from '../../scripts/lxx/ship';
import { lxxRealData } from '../support/lxx-real-data';
import { HOOK_TIMEOUT_MS } from '../support/timeouts';

afterAll(async () => {
  cleanup();
  db.close();
});
afterEach(cleanup);

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const ORDERS = ['english', 'greek'] as const;

describe('Psalm 23:1 of the Septuagint in the Weave', () => {
  const fixture = read<{ gloss: Record<string, string>; chapter: Chapter }>('tests/fixtures/lxx/psa-23-1.json');
  const gloss = (lemma: string): string => fixture.gloss[lemma] ?? '';
  // as he saw it: the aligner alone, 'fullness thereof;' waiting for the pairing pass
  const unpaired = alignChapter(fixture.chapter, gloss).chapter;
  // as it ships now: with the Psalms pass's rows (data/lxx/align/psa-23.tsv, mw-u2w5klk.349.13)
  const paired = alignChapter(fixture.chapter, gloss, readModelDir('data/lxx/align').get('psa/23')).chapter;
  const all = fixture.chapter.verses[0].g.map((w) => w.l);
  // the lemmas his picture shows in Greek
  const his = ['ὁ', 'κύριος', 'γῆ', 'καί', 'πᾶς', 'ἐν', 'αὐτός'];
  const weaves: Array<[string, string[]]> = [
    ['every lemma solid', all],
    ['none solid', []],
    ['the lemmas of his picture solid', his],
    ['all but αὐτός solid', all.filter((l) => l !== 'αὐτός')],
    ['all but πλήρωμα solid', all.filter((l) => l !== 'πλήρωμα')],
    ['πλήρωμα alone solid', ['πλήρωμα']],
  ];

  const drawn = (chapter: Chapter, solid: string[], weaveOrder: 'english' | 'greek'): string => {
    const woven = wovenOf(chapter, { view: 'english', weave: 'solid', weaveShown: true, weaveGrammar: 'any', weaveOrder, learning: new Set<string>(), levels: new Map(), solid: new Set(solid) });
    const { container } = render(createElement(VerseText, { verse: chapter.verses[0], view: 'english', woven: woven?.[0] ?? null, onLook: () => undefined, onUnlinked: () => undefined }));
    const text = container.textContent ?? '';
    cleanup();
    return text;
  };

  it('is as he saw it before the pairing pass, and paired after it', () => {
    expect(unpaired.verses[0].e).toContainEqual({ t: 'fullness thereof;', g: [], y: 'align?' });
    expect(paired.verses[0].e).toContainEqual({ t: 'fullness thereof;', g: [12, 13], c: 0.8, y: 'model' });
  });

  for (const [state, chapter] of [['before the pairing pass', unpaired], ['as it ships', paired]] as const) {
    describe(state, () => {
      for (const [name, solid] of weaves) {
        for (const order of ORDERS) {
          it(`draws πλήρωμα and αὐτῆς with ${name}, ${order} order`, () => {
            const text = drawn(chapter, solid, order);
            const english = /fullness\s+thereof/.test(text);
            expect(english || text.includes('πλήρωμα'), text).toBe(true);
            expect(english || text.includes('αὐτῆς'), text).toBe(true);
          });
        }
      }
    });
  }
});

// A chunk of the pairing's remainder waits only for a Greek word it may be the English of; the rest falls away as before (mw-u2w5klk.349.69).
describe('a chunk the pairing has not reached', () => {
  const word = (l: string, p: string): Verse['g'][number] => ({ t: l, tr: l, s: '', l, p });
  const gone = (verse: Verse): boolean[] => {
    const lemmas: WeaveLemmas = { solid: new Set(verse.g.map((w) => w.l)) };
    const woven = withGone(withBeside(weaveVerse(verse, lemmas), verse, lemmas), verse);
    return verse.e.map((_, i) => goneOf(woven, i));
  };
  const pending = (t: string) => ({ t, g: [] as number[], y: 'align?' as const });
  const pairedTo = (t: string, g: number[]) => ({ t, g, c: 0.8, y: 'align' as const });

  it('stays while a noun of the verse has no English, wherever the noun stands', () => {
    const verse: Verse = { n: 1, g: [word('ῥῆμα', 'N-NSN'), word('καί', 'CONJ'), word('γῆ', 'N-NSF')], e: [pairedTo('and', [1]), pairedTo('earth', [2]), pending('the word')] };
    expect(gone(verse)).toEqual([false, false, false]);
  });

  it('stays between the chunks around an article that has no English', () => {
    const verse: Verse = { n: 1, g: [word('καί', 'CONJ'), word('ὁ', 'T-NPM'), word('μένω', 'V-PAI-3P')], e: [pairedTo('and', [0]), pending('that'), pairedTo('dwell', [2])] };
    expect(gone(verse)).toEqual([false, false, false]);
  });

  it('falls away when the only word with no English is an article elsewhere', () => {
    const verse: Verse = { n: 1, g: [word('ἐν', 'PREP'), word('ἀρχή', 'N-DSF'), word('ὁ', 'T-NSM'), word('θεός', 'N-NSM')], e: [pairedTo('In', [0]), pending('the'), pairedTo('beginning', [1]), pairedTo('God', [3])] };
    expect(gone(verse)).toEqual([false, true, false, false]);
  });

  it('keeps a Septuagint chunk of supplied words that is the only English of a Greek word', () => {
    const verse: Verse = { n: 1, g: [word('ἐν', 'PREP'), word('θερισμός', 'N-DSM'), word('γῆ', 'N-DSF')], e: [pairedTo('in', [0]), { ...pairedTo('harvest', [1]), s: [0] }, pairedTo('earth', [2])] };
    const lemmas: WeaveLemmas = { solid: new Set(['ἐν', 'γῆ']) };
    const woven = withGone(withBeside(weaveVerse(verse, lemmas), verse, lemmas), verse);
    expect(verse.e.map((_, i) => goneOf(woven, i))).toEqual([false, false, false]);
  });
});

// The sweep: every verse of every shipped chapter. It needs the git-ignored sources, as lxx-align-choose.test.ts does (LAMPAS_LXX_REAL=run where they are borrowed and the diff touches none of the watched paths).
const real = lxxRealData();

/**
 * The Greek words of `verse` that `woven` loses by dropping an English chunk: a word held by a chunk that is gone and drawn nowhere else; and, when a chunk the pairing has not reached is gone, a word no chunk holds
 * that it may be the English of (any but an article; an article when the dropped chunk stands between the Greek of the chunks around it).
 */
function lost(verse: Verse, woven: WovenVerse): number[] {
  const drawnWords = new Set<number>();
  verse.e.forEach((chunk, i) => {
    if (goneOf(woven, i)) return;
    for (const k of chunk.g) drawnWords.add(k);
  });
  const held = new Set(verse.e.flatMap((c) => c.g));
  const out = verse.g.map((_, k) => k).filter((k) => held.has(k) && !drawnWords.has(k));
  verse.e.forEach((chunk, i) => {
    if (!goneOf(woven, i) || chunk.y !== 'align?') return;
    const before = verse.e.slice(0, i).reverse().find((c) => c.g.length > 0);
    const after = verse.e.slice(i + 1).find((c) => c.g.length > 0);
    const ends = [before ? Math.max(...before.g) : -1, after ? Math.min(...after.g) : verse.g.length];
    verse.g.forEach((w, k) => {
      if (!held.has(k) && (!w.p.startsWith('T-') || (k > Math.min(...ends) && k < Math.max(...ends)))) out.push(k);
    });
  });
  return out;
}

describe.skipIf(!real.run)('every shipped Septuagint verse in the Weave', () => {
  it(
    'loses no Greek word to a dropped English chunk, in either order',
    async () => {
      const out = mkdtempSync(join(tmpdir(), 'lampas-weave-sweep-'));
      try {
        await runShip(['--out', out], { rawDir: real.rawDir, morpheusDir: real.morpheusDir, log: () => undefined });
        let verses = 0;
        const losing: string[] = [];
        // another cause, counted and not failed on: a Greek word no chunk holds has no place in the Weave, known or not
        let unplaced = 0;
        for (const book of readdirSync(out, { withFileTypes: true }).filter((d) => d.isDirectory())) {
          for (const file of readdirSync(join(out, book.name)).filter((f) => /^\d+\.json$/.test(f))) {
            const chapter = read<Chapter>(join(out, book.name, file));
            for (const verse of chapter.verses) {
              verses++;
              const held = new Set(verse.e.flatMap((c) => c.g));
              if (verse.g.some((_, k) => !held.has(k))) unplaced++;
              const solid = new Set(verse.g.map((w) => wordLemma(w).normalize('NFC')));
              // every word known, none known, and every word known but one chunk's (what drops the most: that chunk stays English between neighbours in Greek)
              const mixes: WeaveLemmas[] = [{ solid }, { solid: new Set<string>() }, ...verse.e.filter((c) => c.g.length > 0).map((c): WeaveLemmas => ({ solid, formPasses: (w) => !c.g.some((k) => verse.g[k] === w) }))];
              const bad = ORDERS.some((order) =>
                mixes.some((lemmas) => lost(verse, withGone(withBeside(wovenInOrder(verse, weaveVerse(verse, lemmas), order), verse, lemmas), verse)).length > 0),
              );
              if (bad) losing.push(`${book.name} ${chapter.chapter}:${verse.n}`);
            }
          }
        }
        console.log(`weave sweep: ${verses} shipped verses; ${losing.length} lose a Greek word to a dropped chunk; ${unplaced} have a Greek word that no chunk holds`);
        expect(verses).toBeGreaterThan(10000);
        expect({ count: losing.length, first: losing.slice(0, 10) }).toEqual({ count: 0, first: [] });
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
    HOOK_TIMEOUT_MS * 6,
  );
});
