// tests/unit/apocrypha-references.test.tsx — a reference to a book of the Apocrypha ('Sir 1:1', 'Wis 1:1') is read, so the tutor can take him to his Apocrypha Bible in Logos
// (mw-5r3p30.1034, his words of 2026-11-03: "the tutor could link to it"). Lampas holds no text of these books: the link is Logos's and never the Reader's.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APOCRYPHA } from '../../src/data/apocrypha';
import { db } from '../../src/data/db';
import { setResourceOn } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { Markdown } from '../../src/markdown/Markdown';
import { referencesIn } from '../../src/markdown/verseLinks';
import { inWords, osisOf, parseCanonReference, parseHeldReference, parseTypedReference, resolveReference } from '../../src/nav/links';
import { readPlace } from '../../src/nav/parseReference';
import { findReferences } from '../../src/nav/refsInText';
import { bibleFor, DEFAULT_APOCRYPHA_BIBLE, DEFAULT_LOGOS_BIBLE, verseLink } from '../../src/resources/logosBible';
import { placeOf, verseChips } from '../../src/resources/tutorLinks';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await Promise.all(db.tables.map((table) => table.clear()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('reading an Apocrypha reference', () => {
  it('parseCanonReference and parseTypedReference read Sir 1:1 and Wis 1:1, however they are written', () => {
    for (const text of ['Sir 1:1', 'Sir.1.1', 'Sirach 1:1', 'sirach 1 1', 'Ecclesiasticus 1:1']) {
      expect(parseCanonReference(text), text).toEqual({ testament: 'ap', book: 'sir', chapter: 1, verse: 1 });
      expect(parseTypedReference(text), text).toEqual({ testament: 'ap', book: 'sir', chapter: 1, verse: 1 });
    }
    for (const text of ['Wis 1:1', 'Wis.1.1', 'Wisdom 1:1', 'Wisdom of Solomon 1:1']) {
      expect(parseCanonReference(text), text).toEqual({ testament: 'ap', book: 'wis', chapter: 1, verse: 1 });
    }
  });

  it('readPlace gives their place, and says how many chapters when the book lacks the chapter', () => {
    expect(readPlace('Sir 1:1')).toEqual({ kind: 'place', testament: 'ap', book: 'sir', chapter: 1, verse: 1 });
    expect(readPlace('Wis 1:1')).toEqual({ kind: 'place', testament: 'ap', book: 'wis', chapter: 1, verse: 1 });
    expect(readPlace('Sirach 52:1')).toEqual({ kind: 'bad', message: 'Sirach has 51 chapters' });
    expect(readPlace('Sirach')).toEqual({ kind: 'none' });
  });

  it('reads every book of the Apocrypha by its name, its Logos abbreviation and the way Lampas writes it, and no code of the 66', () => {
    for (const { code, name, logos } of APOCRYPHA) {
      for (const written of [name, logos, osisOf(code)]) {
        expect(parseCanonReference(`${written} 1:2`), written).toEqual({ testament: 'ap', book: code, chapter: 1, verse: 2 });
      }
      expect(parseHeldReference(`${name} 1:2`), name).toBeNull();
    }
    expect(parseCanonReference('1 Macc. 2:3')).toMatchObject({ testament: 'ap', book: '1ma', chapter: 2, verse: 3 });
    expect(parseCanonReference('2 Esdras 4:5')).toMatchObject({ testament: 'ap', book: '2es', chapter: 4, verse: 5 });
    expect(parseCanonReference('Prayer of Manasseh 1:3')).toMatchObject({ testament: 'ap', book: 'man', chapter: 1, verse: 3 });
  });

  it('leaves the New and Old Testament names theirs', () => {
    expect(parseCanonReference('Jud 1:3')).toMatchObject({ testament: 'nt', book: 'jud' });
    expect(parseCanonReference('Esth 2:3')).toMatchObject({ testament: 'ot', book: 'est' });
    expect(parseCanonReference('Ecc 1:2')).toMatchObject({ testament: 'ot', book: 'ecc' });
    expect(parseTypedReference('Jo 3:16')).toMatchObject({ testament: 'nt', book: 'jhn' });
  });

  it('names the book in words, and a link to one opens the chapter he had open with a notice, never a blank or another book', () => {
    expect(inWords('Sir.1.1')).toBe('Sirach 1:1');
    const index = { books: [{ code: 'rom', chapters: 16, verses: [] }] } as unknown as Parameters<typeof resolveReference>[1];
    const fallback = { book: 'rom', chapter: 8, title: 'Romans 8' } as Parameters<typeof resolveReference>[2];
    for (const held of [index, null]) {
      expect(resolveReference('Sir.1.1', held, fallback)).toEqual({ book: 'rom', chapter: 8, verse: null, notice: '“Sirach 1:1” is not in Lampas; showing Romans 8.' });
    }
  });
});

describe('words that only look like a reference stay plain text', () => {
  const plain = [
    'Yes Sir 5 times.',
    'Sir 3 knights rode out.',
    'The Bar 2 of the chart.',
    'Wisdom 3 teaches patience.',
    'Wis the thing.',
    'Man 5 is the number.',
    'Man 1:2 is a ratio.',
    'Bar 7 is a bar of soap.',
    'Wisdom 2 matters.',
    'Tob 50 pages.',
    'Ma 1:1',
    'Σιρ 1:1 and Σοφία 3:1',
  ];

  it('are not found by the tutor-answer scanner, the Share scanner or the card finder', () => {
    for (const text of plain) {
      expect(referencesIn(text), text).toEqual([]);
      expect(findReferences(text), text).toEqual([]);
      expect(parseCanonReference(text), text).toBeNull();
    }
  });

  it('a name that is also an English word (Sir, Bar, Wisdom) is a book only with a verse', () => {
    for (const text of ['Sir 1', 'Bar 1', 'Wisdom 1', 'Bar.1']) expect(parseCanonReference(text), text).toBeNull();
    expect(referencesIn('See Sirach 1 for it.')).toHaveLength(1);
    expect(referencesIn('See Baruch 3.')).toHaveLength(1);
  });

  it('a chapter past the book is no reference (Sirach has 51)', () => {
    expect(referencesIn('Sirach 52:1')).toEqual([]);
    expect(placeOf('Sirach 52:1')).toBeNull();
    expect(placeOf('Prayer of Manasseh 2:1')).toBeNull();
  });
});

describe('a tutor answer naming Sirach 1:1', () => {
  it('is a link whose card is headed by the book, with no passage and no Open', () => {
    const [found] = referencesIn('Sirach 1:1 opens on wisdom.');
    expect(found).toMatchObject({ start: 0, end: 10, written: 'Sirach 1:1', card: { heading: 'Sirach 1:1', held: null } });
    expect(referencesIn('and Wis 1:1 too')[0]).toMatchObject({ written: 'Wis 1:1', card: { heading: 'Wisdom of Solomon 1:1', held: null } });
  });

  it('draws a chip that opens logosres:1.0.50;ref=Bible.Sir1.1 with Logos on, and none with it off', () => {
    const place = placeOf('Sirach 1:1')!;
    expect(place).toMatchObject({ book: 'sir', chapter: 1, verse: 1, name: 'Sirach 1:1', reader: false });
    const bible = bibleFor(place.book, { nt: DEFAULT_LOGOS_BIBLE, ot: DEFAULT_LOGOS_BIBLE, apocrypha: DEFAULT_APOCRYPHA_BIBLE });
    expect(bible).toBe('LLS:1.0.50');
    const [chip, ...rest] = verseChips(place, place.name, { on: ['logos'], options: {} }, bible);
    expect(rest).toEqual([]);
    expect(chip.url).toBe('logosres:1.0.50;ref=Bible.Sir1.1');
    expect(verseLink('sir', 1, 1, 'LLS:1.0.50')?.url).toBe('logosres:1.0.50;ref=Bible.Sir1.1');
    expect(verseChips(place, place.name, { on: [], options: {} }, bible)).toEqual([]);
  });

  it('opens in Logos from the card with Logos on; the card says Not in Lampas yet and has no Open', async () => {
    await setResourceOn('logos', true);
    render(<Markdown text="Look at Sirach 1:1 for it." />);
    await userEvent.click(screen.getByRole('link', { name: 'Sirach 1:1' }));
    const card = await screen.findByRole('dialog', { name: 'Sirach 1:1' });
    expect(within(card).getByText('Not in Lampas yet')).toBeInTheDocument();
    expect(await within(card).findByRole('link', { name: 'Open in Logos' })).toHaveAttribute('href', 'logosres:1.0.50;ref=Bible.Sir1.1');
    expect(within(card).queryByRole('button', { name: 'Open' })).toBeNull();
  });

  it('with Logos off says Not in Lampas yet and where to link Logos, and opens nothing', async () => {
    render(<Markdown text="Look at Sirach 1:1 for it." />);
    await userEvent.click(screen.getByRole('link', { name: 'Sirach 1:1' }));
    const card = await screen.findByRole('dialog', { name: 'Sirach 1:1' });
    await within(card).findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Not in Lampas yet. Link Logos in Settings to open it there.');
    expect(within(card).queryByRole('link', { name: 'Open in Logos' })).toBeNull();
    expect(within(card).queryByRole('button', { name: 'Open' })).toBeNull();
  });
});
