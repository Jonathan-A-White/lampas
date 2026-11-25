// The Martyn Lloyd-Jones row (mw-qtu3zvz.280.17, docs/sermons.md 'The MLJ Trust row'): every chapter's Sermons list ends its own sermons with one row that opens the MLJ Trust's own sermon search for the chapter,
// a live link (nothing of the Trust's is read, copied or stored). The address form was read once from https://www.mljtrust.org/sermons/: its search box goes to /search/?q=<text>, and the search looks in the
// sermon's title, description and scripture reference text, so 'Romans 8' finds the sermons on that chapter. The tutor is told the same row.
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { MLJ_ID, MLJ_SOURCE, MLJ_TITLE, mljRow, mljSearchUrl } from '../../src/sermons/mljLink';
import { MAX_TUTOR_SERMONS, talkSermonsFor } from '../../src/sermons/forTutor';
import { sermonChip } from '../../src/resources/tutorLinks';
import { SermonsDoor } from '../../src/sermons/SermonsDoor';
import { SermonsHost } from '../../src/sermons/SermonsSheet';
import { closeSermons } from '../../src/sermons/openSermons';
import { forgetTestSermons, registerTestSermons } from '../support/test-sermons';

describe('the Trust\'s search address', () => {
  it('searches the Trust\'s own site for the book and chapter, John 3, Romans 8 and Psalm 23', () => {
    expect(mljSearchUrl({ book: 'jhn', chapter: 3 })).toBe('https://www.mljtrust.org/search/?q=John%203');
    expect(mljSearchUrl({ book: 'rom', chapter: 8 })).toBe('https://www.mljtrust.org/search/?q=Romans%208');
    expect(mljSearchUrl({ book: 'psa', chapter: 23 })).toBe('https://www.mljtrust.org/search/?q=Psalm%2023');
  });

  it('is the chapter\'s, whatever verses are held', () => {
    expect(mljSearchUrl({ book: 'rom', chapter: 8, from: 28, to: 30 })).toBe(mljSearchUrl({ book: 'rom', chapter: 8 }));
  });

  it('writes a numbered book whole', () => {
    expect(mljSearchUrl({ book: '1jn', chapter: 1 })).toBe('https://www.mljtrust.org/search/?q=1%20John%201');
  });
});

describe('the row', () => {
  it('names the Trust, is a web link to that search and carries no sermon text', () => {
    const row = mljRow({ book: 'rom', chapter: 8, from: 1 });
    expect(row.title).toBe('Martyn Lloyd-Jones (MLJ Trust)');
    expect(row.source).toBe(MLJ_SOURCE);
    expect(row.opensIn).toBe('web');
    expect(row.open.url).toBe('https://www.mljtrust.org/search/?q=Romans%208');
  });
});

describe('the tutor', () => {
  beforeEach(() => registerTestSermons());
  afterEach(() => forgetTestSermons());

  it('is told the row on a chapter with sermons, and on one with none, so a link to it is one of the listed', async () => {
    for (const place of [{ book: 'rom', chapter: 5, from: 8 }, { book: 'gen', chapter: 1 }]) {
      const held = await talkSermonsFor(place);
      const told = held?.told.rows.find((r) => r.source === MLJ_SOURCE);
      expect(told).toEqual({ id: MLJ_ID, source: MLJ_SOURCE, title: MLJ_TITLE, preacher: 'Martyn Lloyd-Jones', ref: place.book === 'rom' ? 'Romans 5' : 'Genesis 1' });
      const chip = sermonChip(`${MLJ_SOURCE}:${MLJ_ID}`, held?.rows ?? []);
      expect(chip?.row.open.url).toBe(mljSearchUrl(place));
    }
  });

  it(`still lists at most ${MAX_TUTOR_SERMONS} rows with it among them`, async () => {
    const held = await talkSermonsFor({ book: 'rom', chapter: 5, from: 8 });
    expect(held?.told.rows.length).toBeLessThanOrEqual(MAX_TUTOR_SERMONS);
    expect(held?.rows.map((r) => r.source)).toContain(MLJ_SOURCE);
  });
});

describe('the sheet', () => {
  beforeEach(() => registerTestSermons());
  afterEach(() => {
    cleanup();
    closeSermons();
  });

  it('has one row naming the Trust, a link out to its search for the chapter, after the chapter\'s own sermons', async () => {
    render(
      <>
        <SermonsDoor place={{ book: 'rom', chapter: 5, from: 8, to: 8 }} />
        <SermonsHost />
      </>,
    );
    await userEvent.setup().click(await screen.findByRole('button', { name: /^Sermons · / }));
    const sheet = await screen.findByRole('dialog', { name: /^Sermons for / });
    const rows = sheet.querySelectorAll<HTMLAnchorElement>('a[data-mlj-row]');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Martyn Lloyd-Jones (MLJ Trust)');
    expect(rows[0]).toHaveAttribute('href', 'https://www.mljtrust.org/search/?q=Romans%205');
    expect(rows[0]).toHaveAttribute('target', '_blank');
    expect(rows[0]).toHaveTextContent('Opens on the web');
    expect(rows[0].className).toContain('min-h-11');
    // not a row of the index: the sheet's counts and the rows of a source stay what they were
    expect(sheet.querySelectorAll('a[data-sermon-row]').length).toBeGreaterThan(0);
    expect(rows[0]).not.toHaveAttribute('data-sermon-row');
  });
});
