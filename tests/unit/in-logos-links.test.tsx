// The rows of the chooser behind "In another book…" (mw-rfjjzd.9, docs/design/library-at-scale.md 3.6): every row's href is a Logos link that src/resources/logosRes.ts builds for the place,
// in the real catalogue as the shelf holds it, for a verse, a whole chapter and an Old Testament verse.
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setKind, setResourceOn, setState } from '../../src/data/repositories';
import { InLogosChooser } from '../../src/library/InLogosChooser';
import { inLogosGroups, inLogosRows } from '../../src/library/inLogos';
import { CATALOGUE, entriesOf } from '../../src/resources/catalogue';
import { bibleRef, verseLink } from '../../src/resources/logosBible';
import { resourceLink } from '../../src/resources/logosRes';
import type { StudyPlace } from '../../src/resources/types';

afterAll(() => db.close());

const PLACES: StudyPlace[] = [
  { book: 'rom', chapter: 8, verse: 31 },
  { book: 'jhn', chapter: 3 },
  { book: 'act', chapter: 2, verse: 4 },
  { book: 'psa', chapter: 23, verse: 1 },
];

/** The link logosRes.ts makes for a book at a place: a Bible by the name the scheme gives it, any other book by its Resource ID. */
function expected(resource: string, kind: string, place: StudyPlace): { url: string; fallback: string } {
  if (kind === 'bible') return verseLink(place.book, place.chapter, place.verse, resource)!;
  return resourceLink(resource, `ref=${bibleRef(place.book, place.chapter, place.verse)}`);
}

beforeEach(async () => {
  cleanup();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await setResourceOn('logos', true);
  for (const kind of ['greek-text', 'interlinear', 'commentary'] as const) await setKind(kind, 'on');
  await setState(entriesOf('bible')[0].resource, 'on');
  await setState(entriesOf('greek-text')[2].resource, 'pinned');
});

describe('the rows of the chooser', () => {
  it('are links logosRes.ts builds for the place (pure)', () => {
    const states = new Map(CATALOGUE.map((e) => [e.resource, 'on' as const]));
    for (const place of PLACES) {
      const rows = inLogosRows(CATALOGUE, states, place);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        const want = expected(row.entry.resource, row.entry.kind, place);
        expect(row.link).toEqual(want);
        expect(row.link.url).toMatch(/^logosres:/);
        expect(row.link.fallback).toMatch(/^https:\/\/ref\.ly\/logosres\//);
      }
    }
  });

  it('are the hrefs of the sheet, each with its fallback, for every place', async () => {
    for (const place of PLACES) {
      cleanup();
      render(<InLogosChooser place={place} name="a place" onClose={() => undefined} />);
      const dialog = await screen.findByRole('dialog');
      await within(dialog).findAllByRole('group');
      for (const more of within(dialog).queryAllByRole('button', { name: /\bmore$/ })) await userEvent.click(more);
      const links = within(dialog).getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      const wanted = new Map(
        inLogosGroups(inLogosRows(CATALOGUE, new Map((await db.library.toArray()).map((r) => [r.id, r.state])), place), place).flatMap((g) =>
          g.rows.map((r) => [r.entry.resource, expected(r.entry.resource, r.entry.kind, place)] as const),
        ),
      );
      for (const link of links) {
        const row = [...wanted.values()].find((w) => w.url === link.getAttribute('href'));
        expect(row, `${link.getAttribute('href')} is a link logosRes.ts builds for the place`).toBeDefined();
        expect(link.getAttribute('data-fallback')).toBe(row!.fallback);
      }
      expect(links).toHaveLength(wanted.size);
    }
  });

  it('name no book that does not cover the place, and the Old Testament no Greek text but the commentaries that cover it (mw-eup64h)', () => {
    const states = new Map(CATALOGUE.map((e) => [e.resource, 'on' as const]));
    const john = inLogosRows(CATALOGUE, states, { book: 'jhn', chapter: 3, verse: 16 }).filter((r) => r.entry.kind === 'commentary');
    expect(john.map((r) => r.entry.resource)).toEqual(expect.arrayContaining(['LLS:CALCOM64JN', 'LLS:LENSKI04']));
    for (const r of john) expect(r.entry.covers, r.entry.resource).toContain('jhn');
    // Romans 8 (mw-vb8krt): every commentary of his export that is on the New Testament alone and covers Romans joins Calvin's and Lenski's (Guzik, Barnes, the Bible Speaks Today ...)
    const romans = inLogosRows(CATALOGUE, states, { book: 'rom', chapter: 8, verse: 31 }).filter((r) => r.entry.kind === 'commentary');
    expect(romans.length).toBeGreaterThan(50);
    expect(romans.map((r) => r.entry.resource)).toEqual(expect.arrayContaining(['LLS:CALCOM66RO', 'LLS:LENSKI06']));
    for (const series of ['David Guzik’s Commentaries on the Bible', 'Barnes’ Notes on the Old and New Testaments', 'The Bible Speaks Today']) expect(romans.some((r) => r.entry.series === series), series).toBe(true);
    for (const r of romans) expect(r.entry.covers, r.entry.resource).toContain('rom');
    const psalm = inLogosRows(CATALOGUE, states, { book: 'psa', chapter: 23, verse: 1 });
    expect(new Set(psalm.map((r) => r.entry.kind))).toEqual(new Set(['bible', 'commentary']));
    for (const r of psalm.filter((x) => x.entry.kind === 'commentary')) expect(r.entry.covers, r.entry.resource).toContain('psa');
    const jonah = inLogosRows(CATALOGUE, states, { book: 'jon', chapter: 1, verse: 10 }).filter((r) => r.entry.kind === 'commentary');
    expect(jonah.map((r) => r.entry.resource)).toContain('LLS:GUZIKCOMM32JON');
    for (const r of jonah) expect(r.link.url, r.entry.resource).toMatch(/;ref=Bible\.Jon1\.10$/);
  });
});
