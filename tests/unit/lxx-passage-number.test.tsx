// tests/unit/lxx-passage-number.test.tsx — the Verse view's passage (PassageText) numbers a Septuagint verse as the Reader does (mw-u2w5klk.18): Lampas's verse, the Greek chapter and verse small beside it
// where they differ; a New Testament or Hebrew passage keeps the plain number.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { loadChapter } from '../../src/data/chapter';
import { rangeOf } from '../../src/data/passage';
import { PassageText } from '../../src/reader/ChapterText';
import { septuagintSetting } from '../../src/settings/definitions';
import { setSetting } from '../../src/settings/store';
import { stubChapterFetch } from '../support/chapter-fetch';

afterEach(cleanup);
beforeEach(async () => {
  await db.open();
  await db.settings.clear();
  stubChapterFetch();
});

const numbers = (): string[] => [...document.querySelectorAll('[data-passage-number]')].map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
const draw = (chapter: Awaited<ReturnType<typeof loadChapter>>, septuagint?: number): void => {
  const passage = rangeOf(chapter.verses, chapter.verses[0].n, chapter.verses[chapter.verses.length - 1].n, 'Heading')!;
  render(<PassageText passage={passage} view="greek" source="grc" layout="verse" wovenOf={() => null} reading={null} onLook={() => undefined} septuagint={septuagint} />);
};

describe('the passage of the Verse view', () => {
  it('numbers the verses of Psalm 10 (Greek 9:22 and 23) as Lampas does, the Greek address beside', async () => {
    await setSetting(septuagintSetting, 'on');
    const chapter = await loadChapter('psa', 10);
    draw(chapter, chapter.chapter);
    expect(numbers()).toEqual(['1 (9:22)', '2 (9:23)']);
  });
  it('numbers Psalm 23 as the Reader does: 1 (22:1)', async () => {
    await setSetting(septuagintSetting, 'on');
    const chapter = await loadChapter('psa', 23);
    draw(chapter, chapter.chapter);
    expect(numbers()[0]).toBe('1 (22:1)');
  });
  it('keeps the plain number in the New Testament', async () => {
    draw(await loadChapter('jhn', 1));
    expect(numbers().slice(0, 2)).toEqual(['1', '2']);
  });
});
