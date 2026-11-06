// tests/unit/kind-page-groups.test.tsx — a kind page with Hebrew and Greek books shows a 'Hebrew' group then a 'Greek' group, each in the order pinned, on, off, then by short name
// (mw-5r3p30.1117, src/library/KindPage.tsx); a kind of one language (or Bibles, English and one Hebrew) shows no heading.
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { setState, shelfOf } from '../../src/data/repositories';
import { KindPage } from '../../src/library/KindPage';
import { shelfStates } from '../../src/library/kinds';
import { entriesOf, KINDS, type Kind } from '../../src/resources/catalogue';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const rankOf = (state: string | undefined): number => (state === 'pinned' ? 0 : state === 'on' ? 1 : 2);

/** The short names of a kind's rows in the order of the page, with the headings among them. */
function pageOrder(): string[] {
  const box = screen.getByTestId('searchable-list-box');
  return Array.from(box.querySelectorAll('h2, [role="radiogroup"]')).map((el) => (el.tagName === 'H2' ? `# ${el.textContent}` : el.getAttribute('aria-label')!));
}

describe('a kind page grouped by language', () => {
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

  it('puts Hebrew lexicons under "Hebrew", then Greek ones under "Greek", each pinned, on, off, then A to Z', async () => {
    const lexicons = entriesOf('lexicon');
    const hebrew = lexicons.filter((e) => e.lang === 'he');
    const greek = lexicons.filter((e) => e.lang === 'grc');
    await setState(greek[2].resource, 'pinned');
    await setState(hebrew[1].resource, 'pinned');
    await setState(greek[0].resource, 'off');
    await setState(hebrew[0].resource, 'off');
    const states = shelfStates(await shelfOf());
    const inOrder = (list: typeof lexicons) => [...list].sort((a, b) => rankOf(states.get(a.resource)) - rankOf(states.get(b.resource)) || a.short.localeCompare(b.short)).map((e) => e.short);

    render(<KindPage kind="lexicon" />);
    await screen.findByRole('heading', { name: 'Hebrew', level: 2 });
    expect(pageOrder()).toEqual(['# Hebrew', ...inOrder(hebrew), '# Greek', ...inOrder(greek)]);
    expect(within(screen.getByTestId('searchable-list-box')).getAllByRole('heading')).toHaveLength(2);
  }, ASYNC_WAIT_MS);

  it('a search narrows within the groups and hides the heading of a group with no match', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    render(<KindPage kind="lexicon" />);
    await screen.findByRole('heading', { name: 'Greek', level: 2 });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search Lexicons' }), 'BDAG');
    expect(pageOrder()).toEqual(['# Greek', 'BDAG']);
    expect(screen.queryByRole('heading', { name: 'Hebrew' })).toBeNull();
  }, ASYNC_WAIT_MS);

  it('has headings only for a kind whose books are in Hebrew and in Greek', async () => {
    const grouped = KINDS.filter((k: Kind) => {
      const langs = new Set(entriesOf(k).map((e) => e.lang));
      return langs.has('he') && langs.has('grc');
    });
    expect(grouped).toEqual(['lexicon', 'grammar']);
    for (const kind of ['commentary', 'bible'] as const) {
      render(<KindPage kind={kind} />);
      await screen.findByTestId('searchable-list-box');
      expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
      cleanup();
    }
  }, ASYNC_WAIT_MS);
});
