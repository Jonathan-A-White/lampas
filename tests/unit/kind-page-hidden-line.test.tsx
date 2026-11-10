// tests/unit/kind-page-hidden-line.test.tsx — a kind's page of the Library lists every book of the kind, but the chooser behind "In another book…" and the word sheet hide a Greek book at
// Greek 0 and a Hebrew one at Hebrew 0 (resourcesForLevel); when the page lists a book the dials hide it says so, naming Settings > Which languages? (mw-fnvjof.17.9).
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { shelfOf } from '../../src/data/repositories';
import { hiddenLine } from '../../src/library/kinds';
import { KindPage } from '../../src/library/KindPage';
import { CATALOGUE, entriesOf, KINDS } from '../../src/resources/catalogue';
import { resourcesForLevel } from '../../src/resources/resourcesForLevel';
import type { InterestLevels } from '../../src/settings/definitions/interest';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const DIALS: readonly InterestLevels[] = [
  { grc: 0, he: 0 },
  { grc: 5, he: 0 },
  { grc: 0, he: 5 },
  { grc: 5, he: 5 },
];

async function setDials(levels: InterestLevels): Promise<void> {
  await db.settings.bulkPut([
    { key: 'greekInterest', value: String(levels.grc) },
    { key: 'hebrewInterest', value: String(levels.he) },
  ]);
}

describe('a kind page says why it lists a book the dials hide', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all([db.library.clear(), db.settings.clear(), db.exportRows.clear(), db.meta.clear()]);
    await db.settings.bulkPut([
      { key: 'resourceOption.logos', value: '[]' },
      { key: 'grammarBooks', value: '[]' },
      { key: 'works', value: '[]' },
      { key: 'devotionalDraw', value: 'none' },
    ]);
    await shelfOf();
  }, ASYNC_WAIT_MS);
  afterEach(cleanup);

  it('every kind with a book the chooser would hide has the line, and a kind with none has not', async () => {
    let checked = 0;
    for (const levels of DIALS) {
      for (const kind of KINDS) {
        const entries = entriesOf(kind);
        if (entries.length === 0) continue;
        await setDials(levels);
        const hidden = entries.length - resourcesForLevel(entries, levels.grc, undefined, levels).length;
        const { unmount } = render(<KindPage kind={kind} />);
        // the list and the line are drawn together, once the shelf and both dials are read
        await screen.findByTestId('searchable-list-box');
        const line = screen.queryByTestId('dial-hides');
        if (hidden > 0) {
          expect(line, `${kind} at Greek ${levels.grc}, Hebrew ${levels.he} lists ${hidden} hidden book(s) with no line`).not.toBeNull();
          expect(line!.textContent).toContain('Which languages?');
          checked += 1;
        } else {
          expect(line, `${kind} at Greek ${levels.grc}, Hebrew ${levels.he} hides nothing`).toBeNull();
        }
        unmount();
      }
    }
    expect(checked).toBeGreaterThan(0);
    expect(CATALOGUE.some((e) => e.kind === 'hebrew-text' && e.lang === 'he')).toBe(true);
  }, 6 * ASYNC_WAIT_MS);

  it('the Hebrew texts page at Hebrew 0 names Hebrew', async () => {
    await setDials({ grc: 5, he: 0 });
    render(<KindPage kind="hebrew-text" />);
    const line = await screen.findByTestId('dial-hides');
    expect(line.textContent).toMatch(/Hebrew/);
    expect(line.textContent).toContain('Which languages?');
  }, ASYNC_WAIT_MS);

  it('a mixed kind names only the language that is off', async () => {
    await setDials({ grc: 5, he: 0 });
    render(<KindPage kind="lexicon" />);
    const line = await screen.findByTestId('dial-hides');
    expect(line.textContent).toMatch(/Hebrew/);
    expect(line.textContent).not.toMatch(/Greek/);
  }, ASYNC_WAIT_MS);

  it('the Hebrew texts line holds a button for Which languages? that opens Settings at that setting', async () => {
    await setDials({ grc: 5, he: 0 });
    window.location.hash = '#/library?kind=hebrew-text';
    render(<KindPage kind="hebrew-text" />);
    const line = await screen.findByTestId('dial-hides');
    const button = within(line).getByRole('button', { name: 'Which languages?' });
    fireEvent.click(button);
    expect(window.location.hash).toBe('#/settings?setting=languages');
  }, ASYNC_WAIT_MS);

  it('spells the kind with its own capitals: These Hebrew texts, These Greek texts, The Greek Bibles', () => {
    expect(hiddenLine('hebrew-text', { grc: 5, he: 0 })).toContain('These Hebrew texts');
    expect(hiddenLine('greek-text', { grc: 0, he: 5 })).toContain('These Greek texts');
    expect(hiddenLine('bible', { grc: 0, he: 5 })).toContain('Greek Bibles');
  });

  it('no line of any kind at any pair of dials holds a lowercase hebrew or greek', () => {
    let seen = 0;
    for (const levels of DIALS) {
      for (const kind of KINDS) {
        const line = hiddenLine(kind, levels);
        if (line === undefined) continue;
        seen += 1;
        expect(line, `${kind} at Greek ${levels.grc}, Hebrew ${levels.he}`).not.toMatch(/\b(hebrew|greek)\b/);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
