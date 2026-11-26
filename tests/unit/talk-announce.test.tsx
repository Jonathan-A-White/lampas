// The new-answer screen-reader announcement says the answer as shown (mw-fnvjof.17.337). The stored answer keeps a sentence that points at a link below; when the links draw no chip
// (a setting link over a run), that sentence is not shown, copied or spoken, so it is not announced either: the announcement waits for the turn to say what it drew (src/talk/drawnLinks.ts).
import '@testing-library/jest-dom/vitest';
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NO_CHAPTER } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, listTurns } from '../../src/data/repositories/talks';
import { OverRun } from '../../src/overRun';
import type { TalkScope } from '../../src/services/talk';
import { TalkSheet } from '../../src/Talk';
import { afterTurns } from '../support/turns';

const said = vi.hoisted((): string[] => []);
vi.mock('../../src/ui/live', async (original) => ({ ...(await original<typeof import('../../src/ui/live')>()), announce: (text: string) => void said.push(text) }));

const REF = 'screen.drill-it.neuter';
const scope: TalkScope = { title: 'Drill it', chapter: NO_CHAPTER, verse: null, screen: { name: 'Drill it', facts: [{ label: 'Idea', value: 'The neuter gender' }] }, kept: REF };
const SAYS = 'Open the setting to change it. Tap the link below to go there.';
const links = [{ kind: 'setting', key: 'textSize' }] as const;

beforeEach(async () => {
  said.length = 0;
  localStorage.clear();
  await db.open();
  await Promise.all([db.talks.clear(), db.talkSummaries.clear(), db.talkPictures.clear()]);
  window.location.hash = '#/drill-it?i=neuter';
});
afterEach(() => cleanup());
afterAll(() => db.close());

const open = (overRun: boolean) =>
  render(
    <OverRun.Provider value={overRun}>
      <TalkSheet scope={scope} talkRef={REF} state={undefined} onSay={() => undefined} onHelp={() => undefined} onAskTerm={() => undefined} onClose={() => undefined} />
    </OverRun.Provider>,
  );

const arrives = async (overRun: boolean, answer = SAYS): Promise<void> => {
  open(overRun);
  await act(async () => {
    await afterTurns();
  });
  await act(async () => {
    await addTurn(REF, 'How do I make the text bigger?', answer, [], 1, { changes: [], refused: [], links: [...links] });
  });
};

describe('the announcement of a new answer', () => {
  it('leaves out the sentence that points at a link that is not drawn', async () => {
    await arrives(true);
    await waitFor(() => expect(said).toHaveLength(1));
    expect(said[0]).toBe('The tutor says: Open the setting to change it.');
    expect(said[0]).not.toMatch(/link below/i);
    // the turn is kept as undrawn, its stored words as the tutor wrote them
    await waitFor(async () => expect((await listTurns(REF)).at(-1)).toMatchObject({ linksUndrawn: true, a: SAYS }));
  });

  it('says the words as written where the chip is drawn', async () => {
    await arrives(false);
    await waitFor(() => expect(said).toHaveLength(1));
    expect(said[0]).toBe(`The tutor says: ${SAYS}`);
  });

  it('says an answer that points at no link at once', async () => {
    await arrives(true, 'Because it is the dative.');
    await waitFor(() => expect(said).toEqual(['The tutor says: Because it is the dative.']));
  });
});
