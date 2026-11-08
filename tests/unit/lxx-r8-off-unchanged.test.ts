// tests/unit/lxx-r8-off-unchanged.test.ts — with Settings > Old Testament in Greek (Septuagint) Off, what Copy, Share and Listen give for Hebrew Genesis 1:1 and Romans 8:1, and the Preface, are what they were before
// the things around a Septuagint chapter were made right (mw-u2w5klk.18, the Septuagint epic's R8). tests/fixtures/septuagint-r8-off.json holds them as the code of 0.7.170 gave them; RECORD_R8=1 writes it afresh
// (only ever on code that has not changed those). The Verse view's own HTML is held by tests/unit/lxx-off-unchanged.test.tsx.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { loadChapter, sourceLanguage } from '../../src/data/chapter';
import { COPY_DEFAULTS, copyReferenceLine, copyText, copyUnitOf, sharePieces } from '../../src/copy/format';
import { PREFACE_PARAGRAPHS } from '../../src/preface';
import { planOf } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';

const FILE = 'tests/fixtures/septuagint-r8-off.json';
const RECORD = process.env.RECORD_R8 === '1';

beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  stubChapterFetch();
});

/** Copy, Share and Listen's runs of verse 1 of Genesis 1 in the Hebrew and of Romans 8:1, in every view and format they have, and the Preface's paragraphs. */
async function taken(): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [name, book, n, verse] of [['hebrew', 'gen', 1, 1], ['romans', 'rom', 8, 1]] as const) {
    const chapter = await loadChapter(book, n);
    for (const view of ['english', 'greek'] as const) {
      const unit = copyUnitOf(chapter, { n: verse }, { view, woven: null });
      const whole = copyUnitOf(chapter, { n: 1, to: chapter.verses[chapter.verses.length - 1].n }, { view, woven: null });
      out[`${name}.${view}`] = {
        unit,
        line: copyReferenceLine(unit),
        text: [copyText(unit, COPY_DEFAULTS), copyText(unit, { reference: 'before', numbers: 'off', link: 'off' }), copyText(whole, COPY_DEFAULTS)],
        pieces: sharePieces(unit, COPY_DEFAULTS),
        runs: planOf(chapter.verses.slice(0, 2), view, null, sourceLanguage(chapter)),
      };
    }
  }
  out.preface = PREFACE_PARAGRAPHS;
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
}

describe('with the Septuagint Off, Hebrew Genesis 1:1 and Romans 8:1 are as they were', () => {
  it('Copy, Share, Listen’s runs and the Preface equal what 0.7.170 gave', async () => {
    const now = await taken();
    if (RECORD || !existsSync(FILE)) {
      writeFileSync(FILE, `${JSON.stringify(now, null, 1)}\n`);
      if (!RECORD) throw new Error(`${FILE} was missing and is written: run again`);
      return;
    }
    expect(now).toEqual(JSON.parse(readFileSync(FILE, 'utf8')));
  });
});
