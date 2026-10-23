// tests/unit/share-save-list.test.tsx — Save as a list on the Share sheet (mw-9q8wp1.2): the Bible references listed under 'Bible references (N)' are saved, in the order showing (Page order
// or Bible order), as a new verse list or added to one he has (only the references it does not hold), the Old Testament's too; then 'Saved N references to <name>' with Open.
import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/data/db';
import { appendToVerseList, createVerseList, getVerseList, listVerseLists } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ShareReferences } from '../../src/share/ShareReferences';
import { suggestedListName } from '../../src/share/listName';

const TEXT = 'Refuge\nSee Romans 8:28, then Genesis 1:1 and John 3:16-17.';

beforeEach(async () => {
  clearBus();
  localStorage.clear();
  window.history.replaceState(null, '', '/#/share');
  await db.open();
  await db.verseLists.clear();
});
afterEach(() => {
  cleanup();
});

const saveAsList = () => screen.findByRole('button', { name: 'Save as a list' });

describe('Save as a list', () => {
  it('offers a name taken from the shared title, and New list', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    expect(screen.getByRole('textbox', { name: 'List name' })).toHaveValue('Refuge');
    const target = screen.getByRole('combobox', { name: 'Save to' });
    expect(target).toHaveValue('new');
    expect(within(target).getByRole('option', { name: 'New list' })).toBeInTheDocument();
  });

  it('saves a new list in page order, the Old Testament too, and says what it saved', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved 3 references to Refuge')).toBeInTheDocument();
    const [list] = await listVerseLists();
    expect(list.name).toBe('Refuge');
    expect(list.refs).toEqual(['Rom.8.28', 'Gen.1.1', 'John.3.16-17']);
  });

  it('keeps Bible order when that is what is showing, and the name he typed', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Bible order' }));
    await userEvent.click(await saveAsList());
    const name = screen.getByRole('textbox', { name: 'List name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Safe places');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved 3 references to Safe places')).toBeInTheDocument();
    const [list] = await listVerseLists();
    expect(list.name).toBe('Safe places');
    expect(list.refs).toEqual(['Gen.1.1', 'John.3.16-17', 'Rom.8.28']);
  });

  it('adds to a list he has, only the references it does not hold, after the ones it holds', async () => {
    const peace = await createVerseList('Peace', ['John.3.16-17', 'Ps.23'], 1);
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    const target = await screen.findByRole('combobox', { name: 'Save to' });
    await userEvent.selectOptions(target, await screen.findByRole('option', { name: 'Peace' }));
    // a list he picks keeps its own name
    expect(screen.queryByRole('textbox', { name: 'List name' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Saved 2 references to Peace')).toBeInTheDocument();
    expect((await getVerseList(peace.id))?.refs).toEqual(['John.3.16-17', 'Ps.23', 'Rom.8.28', 'Gen.1.1']);
    expect(await listVerseLists()).toHaveLength(1);
  });

  it('says so when the list already held every one, and changes nothing', async () => {
    const all = await createVerseList('All', ['Gen.1.1', 'Rom.8.28', 'John.3.16-17'], 1);
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Save to' }), await screen.findByRole('option', { name: 'All' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('All 3 references were already in All')).toBeInTheDocument();
    expect((await getVerseList(all.id))?.refs).toEqual(['Gen.1.1', 'Rom.8.28', 'John.3.16-17']);
  });

  it('Open goes to the list', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Open' }));
    const [list] = await listVerseLists();
    await waitFor(() => expect(window.location.hash).toBe(`#/lists/${list.id}`));
  });

  it('Cancel closes the form and saves nothing', async () => {
    render(<ShareReferences text={TEXT} />);
    await userEvent.click(await saveAsList());
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('textbox', { name: 'List name' })).toBeNull();
    expect(await listVerseLists()).toHaveLength(0);
  });

  it('offers nothing when no references were found', async () => {
    render(<ShareReferences text="No verses here" />);
    expect(await screen.findByText('No Bible references found')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save as a list' })).toBeNull();
  });
});

describe('the repository adds without repeating', () => {
  it('appends what is new in the order given and reports how many', async () => {
    const row = await createVerseList('A', ['Rom.8.28'], 1);
    const result = await appendToVerseList(row.id, ['Gen.1.1', 'Rom.8.28', 'Gen.1.1', 'Ps.23'], 9);
    expect(result?.added).toBe(2);
    expect(result?.row).toMatchObject({ refs: ['Rom.8.28', 'Gen.1.1', 'Ps.23'], updated: 9 });
    expect(await appendToVerseList(row.id + 50, ['Gen.1.1'])).toBeUndefined();
  });
});

describe('the name offered', () => {
  const NOW = Date.UTC(2026, 9, 23, 12);
  it('is the first line of the shared words', () => {
    expect(suggestedListName('Refuge\nRom 8:28', NOW)).toBe('Refuge');
  });
  it('is the date for a share with no words, or whose first line is a link', () => {
    expect(suggestedListName(undefined, NOW)).toBe('October 23, 2026');
    expect(suggestedListName('https://example.com/a\nRom 8:28', NOW)).toBe('October 23, 2026');
  });
  it('is cut short when the title is long', () => {
    expect(suggestedListName('x'.repeat(100), NOW).length).toBeLessThanOrEqual(60);
  });
});
