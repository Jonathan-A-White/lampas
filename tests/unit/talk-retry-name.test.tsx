// A Retry of a first turn whose ask failed keeps the talk's name (mw-5r3p30.724): the first turn is waited for under `<ref>@<when it was first asked>`, and a Retry (the
// grist went, the link failed after) must store the turn with that very time, or the next turn names another talk and the mill starts the tutor's thread afresh.
import { act, renderHook, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { listTurns } from '../../src/data/repositories/talks';
import { pendingOf, setPending, talkKey } from '../../src/pending/pendingAsks';
import type { AskOptions } from '../../src/services/tutor';
import { TutorError } from '../../src/services/tutor';
import type { TalkRequest } from '../../src/services/talk';
import { useTalk } from '../../src/useTalk';

const asked = vi.hoisted(() => vi.fn());
vi.mock('../../src/services/talk', async (original) => ({ ...(await original<typeof import('../../src/services/talk')>()), askTalk: asked }));

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const scope = { title: 'Romans 8', chapter, verse: null };
const REF = 'rom.8';
const SENT = { txid: 'direct:lost', seq: 4 };

beforeEach(async () => {
  asked.mockReset();
  localStorage.clear();
  await db.open();
  await Promise.all([db.talks.clear(), db.talkSummaries.clear(), db.talkPictures.clear()]);
});
afterAll(() => db.close());

/** The grist goes (the backend has it) and the link fails before its answer comes. */
const linkLost = async (_request: TalkRequest, options: AskOptions): Promise<never> => {
  options.onSent?.(SENT.txid, SENT.seq);
  throw new TutorError('unreachable', 'You are offline.', undefined, SENT);
};
const answers = async (): Promise<{ answer: string; words: never[] }> => ({ answer: 'Because.', words: [] });

describe('a Retry of a first turn whose ask failed', () => {
  it('stores the turn with the time it was first asked, and the next turn names the same talk', async () => {
    const { result } = renderHook(() => useTalk('rom', 8, () => undefined));
    asked.mockImplementationOnce(linkLost);
    act(() => result.current.say(scope, 'Why?'));
    await waitFor(() => expect(pendingOf(talkKey(REF))?.phase).toBe('failed'));
    const first = asked.mock.calls[0][1] as AskOptions;
    expect(first.talk).toBe(`${REF}@${first.tapAt}`);

    // the Retry comes later: a time of its own would be a different name
    await new Promise((done) => setTimeout(done, 20));
    asked.mockImplementationOnce(answers);
    act(() => result.current.say(scope, 'Why?'));
    await waitFor(async () => expect(await listTurns(REF)).toHaveLength(1));
    expect((asked.mock.calls[1][1] as AskOptions).talk).toBe(first.talk);
    expect((await listTurns(REF))[0].when).toBe(first.tapAt);

    asked.mockImplementationOnce(answers);
    act(() => result.current.say(scope, 'And then?'));
    await waitFor(async () => expect(await listTurns(REF)).toHaveLength(2));
    expect((asked.mock.calls[2][1] as AskOptions).talk).toBe(first.talk);
  });

  it('keeps startedAt in the failed state, and a reload reads it back', async () => {
    const { result } = renderHook(() => useTalk('rom', 8, () => undefined));
    asked.mockImplementationOnce(linkLost);
    act(() => result.current.say(scope, 'Why?'));
    await waitFor(() => expect(pendingOf(talkKey(REF))?.phase).toBe('failed'));
    const first = asked.mock.calls[0][1] as AskOptions;
    // a reload: only localStorage is left, and the state is parsed from it again
    const kept = JSON.parse(localStorage.getItem('lampas.pendingAsks') ?? '{}') as Record<string, { startedAt?: number }>;
    expect(kept[talkKey(REF)].startedAt).toBe(first.tapAt);
    setPending(talkKey(REF), undefined);
    localStorage.setItem('lampas.pendingAsks', JSON.stringify(kept));
    expect(pendingOf(talkKey(REF))).toMatchObject({ phase: 'failed', startedAt: first.tapAt, sent: SENT });
  });
});
