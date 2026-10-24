// tests/unit/memorize-enter.test.tsx — how a verse enters memorizing (mw-fu7dqf.5, his Q3 C): the 'Memorize this list' switch on a verse list, the Memorize control on each row with the
// languages his Greek dial allows (Q2), and 'Stop memorizing'. Every tap goes through src/memorize/commands.ts (the tutor calls the same functions): a spy proves the screens write nothing themselves.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, setGreekInterest } from '../../src/data/repositories';
import { listMemorized } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { VerseListsScreen } from '../../src/lists/VerseListsScreen';
import * as commands from '../../src/memorize/commands';
import { stubChapterFetch } from '../support/chapter-fetch';

vi.mock('../../src/memorize/commands', async (original) => {
  const real = await original<typeof import('../../src/memorize/commands')>();
  return {
    ...real,
    memorizeVerse: vi.fn(real.memorizeVerse),
    unmemorizeVerse: vi.fn(real.unmemorizeVerse),
    memorizeList: vi.fn(real.memorizeList),
    unmemorizeList: vi.fn(real.unmemorizeList),
  };
});

const REFUGE = ['Rom.8.28', 'Ps.62.1-2', '2Thess.3.3'];
const OT_LINE = 'No Old Testament text in Lampas yet: Ps 62:1-2';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.verseLists.clear(), db.reviews.clear(), db.recalls.clear(), db.settings.clear()]);
  vi.mocked(commands.memorizeVerse).mockClear();
  vi.mocked(commands.unmemorizeVerse).mockClear();
  vi.mocked(commands.memorizeList).mockClear();
  vi.mocked(commands.unmemorizeList).mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function openRefuge(dial: 0 | 1 | 2 | 3 | 4 | 5): Promise<void> {
  await setGreekInterest(dial);
  const row = await createVerseList('Refuge', REFUGE, 1);
  window.history.replaceState(null, '', `/#/lists/${row.id}`);
  render(<VerseListsScreen />);
  await screen.findByRole('switch', { name: 'Memorize this list' });
}

const memorized = async (): Promise<string[]> => (await listMemorized()).map((r) => `${r.lang}:${r.ref}`).sort();
const rowOf = (name: string): HTMLElement => screen.getByRole('link', { name }).closest('li') as HTMLElement;

describe('Memorize this list', () => {
  it('is Off to start, and On memorizes the New Testament references in English and names the Old Testament one as skipped', async () => {
    await openRefuge(3);
    const toggle = screen.getByRole('switch', { name: 'Memorize this list' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(await memorized()).toEqual(['en:2Thess.3.3', 'en:Rom.8.28']);
    expect(screen.getByText(OT_LINE)).toBeInTheDocument();
    expect(commands.memorizeList).toHaveBeenCalledWith({ listId: expect.any(Number) });
  });

  it('Off unmemorizes them', async () => {
    await openRefuge(3);
    const toggle = screen.getByRole('switch', { name: 'Memorize this list' });
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(await memorized()).toEqual([]);
    expect(commands.unmemorizeList).toHaveBeenCalledTimes(1);
  });

  it('is On only when every New Testament reference is memorized in English', async () => {
    await openRefuge(3);
    await userEvent.click(within(rowOf('Romans 8:28')).getByRole('button', { name: 'Memorize' }));
    const toggle = screen.getByRole('switch', { name: 'Memorize this list' });
    await waitFor(() => expect(within(rowOf('Romans 8:28')).getByRole('button', { name: /^Memorizing/ })).toBeInTheDocument());
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(await within(rowOf('2 Thessalonians 3:3')).findByRole('button', { name: 'Memorize' }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  });
});

describe('the progress mark on a row', () => {
  it('shows under a memorized reference, and not under one that is not memorized or an Old Testament one', async () => {
    await openRefuge(3);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    await userEvent.click(screen.getByRole('switch', { name: 'Memorize this list' }));
    const mark = await within(rowOf('Romans 8:28')).findByRole('img', { name: 'Step 1 of 7 · due today' });
    expect(mark.querySelectorAll('[data-cell="filled"]')).toHaveLength(1);
    expect(mark.querySelectorAll('[data-cell]')).toHaveLength(7);
    expect(within(rowOf('2 Thessalonians 3:3')).getByRole('img', { name: 'Step 1 of 7 · due today' })).toBeInTheDocument();
    expect(within(rowOf('Psalm 62:1-2')).queryByRole('img')).toBeNull();
  });

  it('names the language when the verse is memorized in more than one', async () => {
    await openRefuge(3);
    await userEvent.click(within(rowOf('Romans 8:28')).getByRole('button', { name: 'Memorize' }));
    await userEvent.click(await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English' }));
    const sheet = await screen.findByRole('dialog', { name: 'Memorize Rom 8:28' });
    await userEvent.click(within(sheet).getByRole('switch', { name: 'Greek' }));
    await waitFor(() => expect(within(rowOf('Romans 8:28')).getAllByRole('img').map((m) => m.getAttribute('aria-label'))).toEqual(['English · Step 1 of 7 · due today', 'Greek · Step 1 of 7 · due today']));
  });

  it('goes when the verse stops being memorized', async () => {
    await openRefuge(3);
    await userEvent.click(screen.getByRole('switch', { name: 'Memorize this list' }));
    await within(rowOf('Romans 8:28')).findByRole('img');
    await userEvent.click(screen.getByRole('switch', { name: 'Memorize this list' }));
    await waitFor(() => expect(within(rowOf('Romans 8:28')).queryByRole('img')).toBeNull());
  });
});

describe('the control on a row', () => {
  it('reads Memorizing · English once the list is on, and is not drawn on an Old Testament row', async () => {
    await openRefuge(3);
    expect(within(rowOf('Psalm 62:1-2')).queryByRole('button')).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Memorize this list' }));
    expect(await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English' })).toBeInTheDocument();
  });

  it('a tap on Memorize memorizes the verse in English, through the command', async () => {
    await openRefuge(3);
    await userEvent.click(within(rowOf('Romans 8:28')).getByRole('button', { name: 'Memorize' }));
    await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English' });
    expect(commands.memorizeVerse).toHaveBeenCalledWith({ ref: 'Rom.8.28', langs: ['en'] });
    expect(await memorized()).toEqual(['en:Rom.8.28']);
  });

  it('at Dipping a toe or beyond its sheet offers English, Greek and Weave, and turning Greek On adds the Greek row', async () => {
    await openRefuge(3);
    await userEvent.click(within(rowOf('Romans 8:28')).getByRole('button', { name: 'Memorize' }));
    await userEvent.click(await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English' }));
    const sheet = await screen.findByRole('dialog', { name: 'Memorize Rom 8:28' });
    expect(within(sheet).getAllByRole('switch').map((s) => s.getAttribute('aria-label'))).toEqual(['English', 'Greek', 'Weave']);
    expect(within(sheet).getByRole('switch', { name: 'English' })).toHaveAttribute('aria-checked', 'true');
    expect(within(sheet).getByRole('switch', { name: 'Greek' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(within(sheet).getByRole('switch', { name: 'Greek' }));
    await waitFor(() => expect(within(sheet).getByRole('switch', { name: 'Greek' })).toHaveAttribute('aria-checked', 'true'));
    expect(await memorized()).toEqual(['el:Rom.8.28', 'en:Rom.8.28']);
    expect(rowOf('Romans 8:28').querySelector('[data-memorize]')?.textContent).toBe('Memorizing · English, Greek');
  });

  it('at Curious the sheet offers English and Greek, not the Weave', async () => {
    await openRefuge(1);
    await userEvent.click(within(rowOf('Romans 8:28')).getByRole('button', { name: 'Memorize' }));
    await userEvent.click(await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English' }));
    const sheet = await screen.findByRole('dialog');
    expect(within(sheet).getAllByRole('switch').map((s) => s.getAttribute('aria-label'))).toEqual(['English', 'Greek']);
  });

  it('at Just English there is no sheet: the tap toggles English, and Greek is never written', async () => {
    await openRefuge(0);
    const row = rowOf('Romans 8:28');
    await userEvent.click(within(row).getByRole('button', { name: 'Memorize' }));
    const on = await within(row).findByRole('button', { name: 'Memorizing · English' });
    await userEvent.click(on);
    expect(screen.queryByRole('dialog')).toBeNull();
    await within(row).findByRole('button', { name: 'Memorize' });
    expect(await memorized()).toEqual([]);
    // the tutor asking for Greek at this setting gets English
    const done = await commands.memorizeVerse({ ref: 'Rom.8.28', langs: ['el', 'weave'] });
    expect(done.said).toBe('Memorizing in English');
    expect(await memorized()).toEqual(['en:Rom.8.28']);
  });

  it('Stop memorizing removes every row of the verse', async () => {
    await openRefuge(3);
    await commands.memorizeVerse({ ref: 'Rom.8.28', langs: ['en', 'el', 'weave'] });
    await userEvent.click(await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorizing · English, Greek, Weave' }));
    const sheet = await screen.findByRole('dialog');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Stop memorizing' }));
    await within(rowOf('Romans 8:28')).findByRole('button', { name: 'Memorize' });
    expect(await memorized()).toEqual([]);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(commands.unmemorizeVerse).toHaveBeenCalledWith({ ref: 'Rom.8.28' });
  });
});

describe('the commands', () => {
  it('skip an Old Testament reference and say so', async () => {
    expect(await commands.memorizeVerse({ ref: 'Ps.62.1-2', langs: ['en'] })).toEqual({ said: OT_LINE, skipped: ['Ps 62:1-2'] });
    expect(await memorized()).toEqual([]);
  });

  it('memorizeList acts on the references the list holds now: one added later is not memorized by itself', async () => {
    await setGreekInterest(3);
    const row = await createVerseList('Refuge', REFUGE, 1);
    const done = await commands.memorizeList({ listId: row.id });
    expect(done).toEqual({ said: `Memorizing 2 references in English. ${OT_LINE}`, skipped: ['Ps 62:1-2'] });
    await db.verseLists.update(row.id, { refs: [...REFUGE, 'John.14.27'] });
    expect(await memorized()).toEqual(['en:2Thess.3.3', 'en:Rom.8.28']);
  });
});

describe('the screens write nothing themselves', () => {
  it('neither the control nor the list screen names a repository writer', () => {
    for (const file of ['src/memorize/MemorizeControl.tsx', 'src/lists/VerseListScreen.tsx', 'src/VerseView.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\b(memorize|unmemorize|recordRecall)\b\s*[,}(]/);
      expect(source, file).not.toMatch(/db\.(reviews|recalls)/);
    }
  });
});
