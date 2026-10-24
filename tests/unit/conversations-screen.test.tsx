// The Conversations screen draws voice-kit's TalkList over the kept talks (mw-o480n1.9): rows are TalkRow buttons, a key the app does not make is not drawn, the search
// field sticks, a search shows the newest matching pair's line, and the two notes keep their words and [data-conversations-empty]. The layout itself is proven by
// tests/e2e/conversations.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Conversations } from '../../src/Conversations';
import { db } from '../../src/data/db';
import { addTurn } from '../../src/data/repositories';

beforeEach(async () => {
  window.location.hash = '#/conversations';
  await db.talks.clear();
});
afterEach(cleanup);
afterAll(() => db.close());

async function seed(): Promise<void> {
  await addTurn('rom.8.28', 'Why do things work together?', 'It is a matter of God’s Grace.', [], 1000);
  await addTurn('rom.5.1', 'What is peace with God?', 'It comes through faith, not through works.', [], 2000);
  await addTurn('rom.8.28', 'Is grace the same as favour?', 'Yes: grace is favour that is not earned.\nSecond line.', [], 3000);
  await addTurn('xyz.1', 'A key this app does not make', 'grace', [], 4000);
}

const rowsOf = () => Array.from(document.querySelectorAll('[data-recent-talk]')).map((row) => row.getAttribute('data-recent-talk'));

describe('the Conversations screen', () => {
  it('draws one TalkRow button per conversation, the newest last turn first, and leaves out a key the app does not make', async () => {
    await seed();
    render(<Conversations />);
    await waitFor(() => expect(rowsOf()).toEqual(['rom.8.28', 'rom.5.1']));
    const list = screen.getByRole('list', { name: 'Conversations' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((button) => button.tagName)).toEqual(['BUTTON', 'BUTTON']);
    expect(buttons[0]?.textContent).toContain('Romans 8:28');
    expect(buttons[0]?.textContent).toContain('Is grace the same as favour?');
    expect(buttons[1]?.textContent).toContain('Romans 5:1');
    expect(document.querySelector('[data-recent-talk="xyz.1"]')).toBeNull();
  });

  it('keeps the search field in a sticky wrapper', async () => {
    await seed();
    render(<Conversations />);
    const field = await screen.findByRole('searchbox', { name: 'Search conversations' });
    expect(field.getAttribute('placeholder')).toBe('Search your conversations');
    expect(field.closest('.sticky')).not.toBeNull();
  });

  it('narrows the rows to the talks with the words, each with the line of its newest matching pair', async () => {
    await seed();
    render(<Conversations />);
    await waitFor(() => expect(rowsOf()).toHaveLength(2));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search conversations' }), { target: { value: 'GRACE' } });
    await waitFor(() => expect(rowsOf()).toEqual(['rom.8.28']));
    const row = document.querySelector('[data-recent-talk="rom.8.28"]');
    expect(row?.textContent).toContain('Is grace the same as favour?');
    expect(row?.textContent).not.toContain('a matter of God');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search conversations' }), { target: { value: 'earned' } });
    await waitFor(() => expect(document.querySelector('[data-recent-talk="rom.8.28"]')?.textContent).toContain('Yes: grace is favour that is not earned.'));
    expect(document.querySelector('[data-conversations-empty]')).toBeNull();
  });

  it('says so, in the words it always has, when no conversation has the words typed', async () => {
    await seed();
    render(<Conversations />);
    await waitFor(() => expect(rowsOf()).toHaveLength(2));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search conversations' }), { target: { value: 'qqqzzz' } });
    const note = await waitFor(() => {
      const found = document.querySelector('[data-conversations-empty]');
      expect(found).not.toBeNull();
      return found as Element;
    });
    expect(note.textContent).toBe('No conversation has those words in a question or an answer.');
    expect(rowsOf()).toEqual([]);
  });

  it('says so when no talk has been had', async () => {
    render(<Conversations />);
    const note = await waitFor(() => {
      const found = document.querySelector('[data-conversations-empty]');
      expect(found).not.toBeNull();
      return found as Element;
    });
    expect(note.textContent).toBe('No conversations yet. Each talk you have with the tutor is kept here.');
  });

  it('is the kit\'s TalkList and not a hand copy of its field and list', () => {
    const source = readFileSync('src/Conversations.tsx', 'utf8');
    expect(source).toMatch(/import \{[^}]*\bTalkList\b[^}]*\} from 'voice-kit\/talks\/react'/);
    expect(source).not.toMatch(/<input|<ul|searchConversations|listConversations/);
    expect(source).not.toMatch(/useLiveQuery\(\s*async/);
    expect(source).toContain('refreshKey');
  });
});
