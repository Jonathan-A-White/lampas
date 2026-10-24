// tests/unit/verse-list-move.test.tsx — moving or copying one reference to another verse list, from a list's Edit (mw-9q8wp1.8): each reference has 'Move to…' and 'Copy to…', which offer
// every other list by name and 'New list…' (named on the spot). A moved or copied reference goes to the end of the target; one the target already holds changes nothing and says
// 'already in <name>'. Every change is written at once and survives a reload.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { createVerseList, getVerseList, listVerseLists } from '../../src/data/repositories';
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

async function twoLists(): Promise<{ a: number; b: number }> {
  const b = await createVerseList('Psalms', ['Ps.23.1'], 1);
  const a = await createVerseList('Comfort', ['John.3.16', 'Rom.8.28'], 2);
  return { a: a.id, b: b.id };
}
async function openEditing(id: number): Promise<void> {
  window.history.replaceState(null, '', `/#/lists/${id}`);
  render(<VerseListsScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
}
const saved = async (id: number): Promise<string[] | undefined> => (await getVerseList(id))?.refs;

describe('moving and copying a reference to another list', () => {
  it('offers Move to… and Copy to… on each reference', async () => {
    const { a } = await twoLists();
    await openEditing(a);
    for (const row of screen.getAllByRole('listitem')) {
      expect(within(row).getByRole('button', { name: /^Move to… / })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: /^Copy to… / })).toBeInTheDocument();
    }
  });

  it('offers every other list by name and New list…, not the list itself', async () => {
    const { a } = await twoLists();
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Move to… Romans 8:28' }));
    const choices = await screen.findByRole('group', { name: 'Move Romans 8:28 to' });
    expect(within(choices).getAllByRole('button').map((b) => b.textContent)).toEqual(['Psalms', 'New list…']);
  });

  it('moves a reference to the end of another list and keeps both', async () => {
    const { a, b } = await twoLists();
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Move to… Romans 8:28' }));
    await userEvent.click(within(await screen.findByRole('group', { name: 'Move Romans 8:28 to' })).getByRole('button', { name: 'Psalms' }));
    await waitFor(async () => expect(await saved(a)).toEqual(['John.3.16']));
    expect(await saved(b)).toEqual(['Ps.23.1', 'Rom.8.28']);
    expect(await screen.findByRole('status')).toHaveTextContent('Moved Romans 8:28 to Psalms');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Romans 8:28' })).toBeNull());
    // kept: a fresh screen shows the same
    cleanup();
    render(<VerseListsScreen />);
    await screen.findByRole('button', { name: 'Edit' });
    expect(await saved(a)).toEqual(['John.3.16']);
    expect(await saved(b)).toEqual(['Ps.23.1', 'Rom.8.28']);
  });

  it('copies a reference to the end of another list and leaves the first as it was', async () => {
    const { a, b } = await twoLists();
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to… John 3:16' }));
    await userEvent.click(within(await screen.findByRole('group', { name: 'Copy John 3:16 to' })).getByRole('button', { name: 'Psalms' }));
    await waitFor(async () => expect(await saved(b)).toEqual(['Ps.23.1', 'John.3.16']));
    expect(await saved(a)).toEqual(['John.3.16', 'Rom.8.28']);
    expect(await screen.findByRole('status')).toHaveTextContent('Copied John 3:16 to Psalms');
  });

  it('makes a named list holding just that reference from New list…', async () => {
    const { a } = await twoLists();
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Move to… Romans 8:28' }));
    await userEvent.click(await screen.findByRole('button', { name: 'New list…' }));
    const field = await screen.findByRole('textbox', { name: 'New list name' });
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
    await userEvent.type(field, 'Assurance');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(async () => expect(await saved(a)).toEqual(['John.3.16']));
    const made = (await listVerseLists()).find((l) => l.name === 'Assurance');
    expect(made?.refs).toEqual(['Rom.8.28']);
    expect(await screen.findByRole('status')).toHaveTextContent('Moved Romans 8:28 to Assurance');
  });

  it('copies to a new list and keeps the reference where it was', async () => {
    const { a } = await twoLists();
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to… John 3:16' }));
    await userEvent.click(await screen.findByRole('button', { name: 'New list…' }));
    await userEvent.type(await screen.findByRole('textbox', { name: 'New list name' }), 'Love');
    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(async () => expect((await listVerseLists()).find((l) => l.name === 'Love')?.refs).toEqual(['John.3.16']));
    expect(await saved(a)).toEqual(['John.3.16', 'Rom.8.28']);
  });

  it('changes nothing and says already in <name> when the target holds it', async () => {
    const { a, b } = await twoLists();
    await db.verseLists.update(b, { refs: ['Ps.23.1', 'Rom.8.28'] });
    await openEditing(a);
    await userEvent.click(screen.getByRole('button', { name: 'Move to… Romans 8:28' }));
    await userEvent.click(within(await screen.findByRole('group', { name: 'Move Romans 8:28 to' })).getByRole('button', { name: 'Psalms' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Romans 8:28 is already in Psalms');
    expect(await saved(a)).toEqual(['John.3.16', 'Rom.8.28']);
    expect(await saved(b)).toEqual(['Ps.23.1', 'Rom.8.28']);

    await userEvent.click(screen.getByRole('button', { name: 'Copy to… Romans 8:28' }));
    await userEvent.click(within(await screen.findByRole('group', { name: 'Copy Romans 8:28 to' })).getByRole('button', { name: 'Psalms' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Romans 8:28 is already in Psalms');
    expect(await saved(b)).toEqual(['Ps.23.1', 'Rom.8.28']);
  });

  it('offers only New list… when there is no other list', async () => {
    const only = await createVerseList('Only', ['John.3.16'], 1);
    await openEditing(only.id);
    await userEvent.click(screen.getByRole('button', { name: 'Move to… John 3:16' }));
    const choices = await screen.findByRole('group', { name: 'Move John 3:16 to' });
    expect(within(choices).getAllByRole('button').map((b) => b.textContent)).toEqual(['New list…']);
  });
});
