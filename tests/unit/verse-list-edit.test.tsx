// tests/unit/verse-list-edit.test.tsx — editing one verse list's references (mw-9q8wp1.3): Edit shows each reference with Remove and Move up/Move down, 'Add a reference' takes typed
// text and adds each reference found (a text with none says so), 'Sort into Bible order' reorders by canon, and every change is written at once and survives a reload.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { VerseListsScreen } from '../../src/lists/VerseListsScreen';
import { stubChapterFetch } from '../support/chapter-fetch';

beforeEach(async () => {
  clearBus();
  stubChapterFetch();
  await db.open();
  await db.verseLists.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const REFUGE = ['2Sam.22.3-4', 'Ps.62.1-2', '2Thess.3.3', 'Heb.7.24-25', 'Isa.30.21'];

async function openEditing(refs: string[]): Promise<number> {
  const row = await createVerseList('Refuge', refs, 1);
  window.history.replaceState(null, '', `/#/lists/${row.id}`);
  render(<VerseListsScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  return row.id;
}
const savedRefs = async (id: number): Promise<string[] | undefined> => (await getVerseList(id))?.refs;

describe('editing a list', () => {
  it('shows each reference with Remove, Move up and Move down', async () => {
    await openEditing(REFUGE);
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(within(row).getByRole('button', { name: /^Remove / })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /^Move .* up$/ })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /^Move .* down$/ })).toBeInTheDocument();
    }
    // the first cannot go up and the last cannot go down
    expect(within(rows[0]).getByRole('button', { name: /up$/ })).toBeDisabled();
    expect(within(rows[4]).getByRole('button', { name: /down$/ })).toBeDisabled();
  });

  it('removes a reference and keeps it', async () => {
    const id = await openEditing(REFUGE);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Psalm 62:1-2' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual(['2Sam.22.3-4', '2Thess.3.3', 'Heb.7.24-25', 'Isa.30.21']));
    // the screen follows the saved list by a live query, a moment after Dexie holds it
    await waitFor(() => expect(screen.queryByText('Psalm 62:1-2')).toBeNull());
  });

  it('moves a reference up and down and keeps the order', async () => {
    const id = await openEditing(REFUGE);
    await userEvent.click(screen.getByRole('button', { name: 'Move Hebrews 7:24-25 up' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual(['2Sam.22.3-4', 'Ps.62.1-2', 'Heb.7.24-25', '2Thess.3.3', 'Isa.30.21']));
    // wait for the screen to show the new order before acting on it
    await waitFor(() => expect(within(screen.getAllByRole('listitem')[2]).getByRole('button', { name: 'Remove Hebrews 7:24-25' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Move 2 Samuel 22:3-4 down' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual(['Ps.62.1-2', '2Sam.22.3-4', 'Heb.7.24-25', '2Thess.3.3', 'Isa.30.21']));
  });

  it('adds each reference found in what he types, and keeps them', async () => {
    const id = await openEditing(['John.14.27']);
    const field = screen.getByRole('textbox', { name: 'Add a reference' });
    await userEvent.type(field, 'Rom 8:28-30, Phil 4:6');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual(['John.14.27', 'Rom.8.28-30', 'Phil.4.6']));
    expect(field).toHaveValue('');
    // kept: a fresh screen shows them
    cleanup();
    render(<VerseListsScreen />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(await screen.findByRole('button', { name: 'Remove Romans 8:28-30' })).toBeInTheDocument();
  });

  it('says why when the text holds no reference, and changes nothing', async () => {
    const id = await openEditing(['John.14.27']);
    await userEvent.type(screen.getByRole('textbox', { name: 'Add a reference' }), 'Hezekiah 99:1');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No reference found in Hezekiah 99:1');
    expect(await savedRefs(id)).toEqual(['John.14.27']);
  });

  it('sorts into Bible order, the Old Testament first', async () => {
    const id = await openEditing(REFUGE);
    await userEvent.click(screen.getByRole('button', { name: 'Sort into Bible order' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual(['2Sam.22.3-4', 'Ps.62.1-2', 'Isa.30.21', '2Thess.3.3', 'Heb.7.24-25']));
  });

  it('leaves an empty list, not a deleted one, when the last reference goes', async () => {
    const id = await openEditing(['John.14.27']);
    await userEvent.click(screen.getByRole('button', { name: 'Remove John 14:27' }));
    await waitFor(async () => expect(await savedRefs(id)).toEqual([]));
    expect(await getVerseList(id)).toBeDefined();
    expect(await screen.findByText(/no references/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Refuge' })).toBeInTheDocument();
  });
});
