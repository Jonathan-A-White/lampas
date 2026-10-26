// tests/unit/verse-lists-screen.test.tsx — the Verse lists screen (#/lists, mw-9q8wp1.1): every list with its count, one list's references in the order saved (a tap opens the
// same pop-up the Share sheet's references open), rename, and delete with Undo.
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList, listVerseLists } from '../../src/data/repositories';
import { memorize } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { LibraryScreen } from '../../src/library/LibraryScreen';
import { VerseListsScreen } from '../../src/lists/VerseListsScreen';
import { UNDO_MS } from '../../src/lists/deleted';
import { routeOf } from '../../src/nav/route';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  window.history.replaceState(null, '', '/#/lists');
  await db.open();
  await db.verseLists.clear();
  await db.reviews.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const REFUGE = ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3', 'Heb.7.24-25', 'Isa.30.21'];

async function openList(name: string): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
}

describe('the lists', () => {
  it('shows every list by name with how many references it holds', async () => {
    await createVerseList('Refuge', REFUGE, 1);
    await createVerseList('Peace', ['John.14.27'], 2);
    render(<VerseListsScreen />);
    const peace = await screen.findByRole('button', { name: /^Peace/ });
    expect(within(peace).getByText('1 reference')).toBeInTheDocument();
    expect(within(screen.getByRole('button', { name: /^Refuge/ })).getByText('5 references')).toBeInTheDocument();
    // newest first
    expect(screen.getAllByRole('button', { name: /reference/ }).map((b) => b.textContent)).toEqual(['Peace 1 reference ›', 'Refuge 5 references ›']);
  });

  it('says how to make a list, from the Share sheet, when there is none', async () => {
    render(<VerseListsScreen />);
    expect(await screen.findByText(/Share sheet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reference/ })).toBeNull();
  });

  it('opens a list at its own address, and Back to the lists lands on the lists', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    render(<VerseListsScreen />);
    await openList('Refuge');
    expect(window.location.hash).toBe(`#/lists/${row.id}`);
    expect(routeOf(window.location.hash)).toBe('lists');
    expect(await screen.findByRole('heading', { level: 1, name: 'Refuge' })).toBeInTheDocument();
  });
});

describe('one list', () => {
  it('shows its references in the order saved, in words', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    const links = await screen.findAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['2 Samuel 22:3-4', 'Psalm 62:1-2', '2 Thessalonians 3:3', 'Hebrews 7:24-25', 'Isaiah 30:21']);
  });

  it('opens the reference card on a tap: the passage for the New Testament, and its English for the Old', async () => {
    const row = await createVerseList('Refuge', ['Heb.7.24-25', 'Isa.30.21'], 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    await userEvent.click(await screen.findByRole('link', { name: 'Hebrews 7:24-25' }));
    const card = await screen.findByRole('dialog', { name: 'Hebrews 7:24-25' });
    await waitFor(() => expect(card.querySelector('[data-reference-text]')).not.toBeNull());
    expect(within(card).getByRole('button', { name: 'Open' })).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await userEvent.click(screen.getByRole('link', { name: 'Isaiah 30:21' }));
    const old = await screen.findByRole('dialog', { name: 'Isaiah 30:21' });
    await waitFor(() => expect(old.querySelector('[data-reference-text]')?.textContent).toContain('This is the way'));
    expect(within(old).getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('says so, with a way back, when the list is not there', async () => {
    window.history.replaceState(null, '', '/#/lists/404');
    render(<VerseListsScreen />);
    expect(await screen.findByText(/not here/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'See your lists' })).toBeInTheDocument();
  });

  it('says a list holds nothing yet', async () => {
    const row = await createVerseList('Empty', [], 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    expect(await screen.findByText(/no references/i)).toBeInTheDocument();
  });
});

describe('rename', () => {
  it('changes the name and keeps it', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    const field = screen.getByRole('textbox', { name: 'List name' });
    expect(field).toHaveValue('Refuge');
    await userEvent.clear(field);
    await userEvent.type(field, 'Safe places');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Safe places' })).toBeInTheDocument();
    expect((await getVerseList(row.id))?.name).toBe('Safe places');
    expect((await getVerseList(row.id))?.refs).toEqual(REFUGE);
    // kept: a fresh screen reads the same name
    cleanup();
    render(<VerseListsScreen />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Safe places' })).toBeInTheDocument();
  });

  it('Cancel leaves the name as it was, and a blank name cannot be saved', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Rename' }));
    await userEvent.clear(screen.getByRole('textbox', { name: 'List name' }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'List name' })).toBeNull();
    expect((await getVerseList(row.id))?.name).toBe('Refuge');
  });
});

describe('delete and Undo', () => {
  it('removes the list, goes to the lists and offers Undo, which brings it back', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    await createVerseList('Peace', ['John.14.27'], 2);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(window.location.hash).toBe('#/lists'));
    expect(await getVerseList(row.id)).toBeUndefined();
    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Refuge deleted');
    expect(screen.queryByRole('button', { name: /^Refuge/ })).toBeNull();
    await userEvent.click(within(status).getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: /^Refuge/ })).toBeInTheDocument();
    expect(await getVerseList(row.id)).toMatchObject({ name: 'Refuge', refs: REFUGE, created: 1 });
    expect(screen.queryByRole('status')).toBeNull();
    expect((await listVerseLists()).map((l) => l.name)).toEqual(['Peace', 'Refuge']);
  });

  it('lets Undo go after a few seconds and the list stays deleted', async () => {
    const row = await createVerseList('Refuge', REFUGE, 1);
    window.history.replaceState(null, '', `/#/lists/${row.id}`);
    render(<VerseListsScreen />);
    const timeouts = vi.spyOn(window, 'setTimeout');
    await userEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
    // the store's clock for Undo is the one timer of UNDO_MS: let it run out
    const expire = timeouts.mock.calls.find(([, ms]) => ms === UNDO_MS)?.[0] as (() => void) | undefined;
    expect(expire).toBeDefined();
    act(() => expire!());
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(await getVerseList(row.id)).toBeUndefined();
    timeouts.mockRestore();
  });
});

describe('the Library', () => {
  it('has a Verse lists row with the number of lists, which opens #/lists', async () => {
    window.history.replaceState(null, '', '/#/library');
    await createVerseList('Refuge', REFUGE, 1);
    await createVerseList('Peace', ['John.14.27'], 2);
    render(<LibraryScreen />);
    const row = await screen.findByRole('button', { name: /^Verse lists/ });
    await waitFor(() => expect(row).toHaveTextContent('2 lists'));
    expect(row.closest('[data-testid="kind-row"]')).toBeNull();
    await userEvent.click(row);
    expect(window.location.hash).toBe('#/lists');
  });

  it('has a Memorize row with the verses due, which opens #/memorize', async () => {
    window.history.replaceState(null, '', '/#/library');
    await memorize('Rom.8.28', ['en']);
    await memorize('John.3.16', ['en']);
    render(<LibraryScreen />);
    const row = await screen.findByRole('button', { name: /^Memorize/ });
    await waitFor(() => expect(row).toHaveTextContent('Memorize 2 due'));
    await userEvent.click(row);
    expect(window.location.hash).toBe('#/memorize');
  });

  it('the Memorize row says nothing due when no verse is', async () => {
    window.history.replaceState(null, '', '/#/library');
    render(<LibraryScreen />);
    const row = await screen.findByRole('button', { name: /^Memorize/ });
    await waitFor(() => expect(row).toHaveTextContent('nothing due'));
  });

  it('says none when there is no list', async () => {
    window.history.replaceState(null, '', '/#/library');
    render(<LibraryScreen />);
    const row = await screen.findByRole('button', { name: /^Verse lists/ });
    await waitFor(() => expect(row).toHaveTextContent('none'));
  });
});
