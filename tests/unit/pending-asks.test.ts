// What each question to the tutor is doing is kept in localStorage (src/pending/pendingAsks.ts, mw-5r3p30.602): a line survives a reload (a new read of the storage), a line that does not read is
// ignored, localStorage itself is the truth, and a line in sending or waiting that no screen waits on is an orphan, to be waited for again.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isOrphan, pendingAll, pendingOf, setPending, startRunning, talkKey, type AskState } from '../../src/pending/pendingAsks';

const WAITING: AskState = { phase: 'waiting', question: 'What is this verse about?', startedAt: 1000, sent: { txid: 'direct:abc', seq: 7 } };
const FAILED: AskState = { phase: 'failed', question: 'Why?', failure: 'unreachable', detail: 'You are offline. Check your connection and try again.', sent: { txid: 'direct:def', seq: 9 } };

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('the kept questions', () => {
  it('keeps a waiting question and a failed one under their keys, and drops a line when it is set to nothing', () => {
    setPending('ask:rom.8.28', WAITING);
    setPending(talkKey('rom.8'), FAILED);
    expect(pendingOf('ask:rom.8.28')).toEqual(WAITING);
    expect(pendingOf('talk:rom.8')).toEqual(FAILED);
    setPending('ask:rom.8.28', undefined);
    expect(pendingOf('ask:rom.8.28')).toBeUndefined();
    expect(pendingOf('talk:rom.8')).toEqual(FAILED);
  });

  it('reads what a page before it wrote (the storage, not memory) and the same object until something changes', () => {
    localStorage.setItem('lampas.pendingAsks', JSON.stringify({ 'ask:rom.8.28': WAITING }));
    const first = pendingAll();
    expect(first['ask:rom.8.28']).toEqual(WAITING);
    expect(pendingAll()).toBe(first);
    localStorage.clear();
    expect(pendingAll()).toEqual({});
  });

  it('keeps that a question was sent as spoken, for its Retry and for a page that is back (mw-5r3p30.333)', () => {
    const spoken: AskState = { ...FAILED, spoken: true };
    setPending('ask:rom.8.28', spoken);
    setPending('talk:rom.8', { ...WAITING, spoken: true });
    expect(pendingOf('ask:rom.8.28')).toEqual(spoken);
    expect(pendingOf('talk:rom.8')).toMatchObject({ spoken: true });
    localStorage.setItem('lampas.pendingAsks', JSON.stringify({ a: { ...WAITING, spoken: 'yes' } }));
    expect('spoken' in pendingAll().a).toBe(false);
  });

  it('leaves out a line it cannot read, and reads nothing from storage that is not JSON', () => {
    localStorage.setItem('lampas.pendingAsks', JSON.stringify({ good: WAITING, noPhase: { question: 'x' }, noStart: { phase: 'waiting', question: 'x' }, badSent: { ...WAITING, sent: { txid: 1 } }, failedNoDetail: { phase: 'failed', question: 'x', failure: 'unreachable' } }));
    expect(Object.keys(pendingAll()).sort()).toEqual(['badSent', 'good']);
    expect(pendingOf('badSent')).toEqual({ phase: 'waiting', question: WAITING.question, startedAt: 1000 });
    localStorage.setItem('lampas.pendingAsks', 'not json');
    expect(pendingAll()).toEqual({});
  });
});

describe('a question left waiting', () => {
  it('is an orphan while no screen of this page waits on it, and not once one does', () => {
    setPending('ask:rom.8.28', WAITING);
    expect(isOrphan('ask:rom.8.28')).toBe(true);
    const stop = startRunning('ask:rom.8.28');
    expect(isOrphan('ask:rom.8.28')).toBe(false);
    stop();
    expect(isOrphan('ask:rom.8.28')).toBe(true);
  });

  it('is never an orphan when it failed or has no line', () => {
    setPending('talk:rom.8', FAILED);
    expect(isOrphan('talk:rom.8')).toBe(false);
    expect(isOrphan('talk:none')).toBe(false);
  });
});
