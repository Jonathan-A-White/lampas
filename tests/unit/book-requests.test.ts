// The requests for a book (Ask for a book) that wait on the phone (src/data/repositories/bookRequests.ts, src/services/bookRequests.ts):
// the list survives in the settings store, and a send forgets a request when its grist is out, not when the receipt comes. A book already asked
// is found again by its Resource ID or its title, and the one library request has its flood control (docs/design/library-at-scale.md 6.2).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { askedBefore, dropWaitingBook, keepLibraryAsked, libraryAsked, listAskedBooks, listWaitingBooks, queueBook } from '../../src/data/repositories/bookRequests';
import { keepRequest } from '../../src/data/repositories/requests';

vi.mock('../../src/services/feedback', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/services/feedback')>()), submitFeedback: vi.fn() }));

const { submitFeedback } = await import('../../src/services/feedback');
const { askForBook, bookSending, sendWaitingBooks } = await import('../../src/services/bookRequests');
const { TutorError } = await import('../../src/services/tutor');
const submit = vi.mocked(submitFeedback);

beforeEach(async () => {
  await db.open();
  await Promise.all([db.settings.clear(), db.requests.clear()]);
  submit.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('the waiting list', () => {
  it('keeps requests oldest first, trimmed, and forgets one by its id', async () => {
    const first = await queueBook({ title: '  Mounce  ' }, 1000);
    const second = await queueBook({ title: 'Black', resource: 'LLS:BLACK', kindWanted: 'grammar', why: ' to learn ' }, 2000);
    expect((await listWaitingBooks()).map((w) => w.title)).toEqual(['Mounce', 'Black']);
    expect(second).toMatchObject({ title: 'Black', resource: 'LLS:BLACK', kindWanted: 'grammar', why: 'to learn' });
    await dropWaitingBook(first.id);
    expect(await listWaitingBooks()).toEqual([second]);
  });

  it('still reads a request kept by the old Ask for another book, which held its title as text', async () => {
    await db.settings.put({ key: 'bookRequestsWaiting', value: JSON.stringify([{ id: 'w0', text: 'Black', queuedAt: 1 }]) });
    expect(await listWaitingBooks()).toEqual([{ id: 'w0', title: 'Black', queuedAt: 1 }]);
  });

  it('reads a damaged list as empty', async () => {
    await db.settings.put({ key: 'bookRequestsWaiting', value: '{not json' });
    expect(await listWaitingBooks()).toEqual([]);
  });

  it('lists only the books the mill took, newest first', async () => {
    const row = { app_version: 'v', sentAt: 1 };
    await keepRequest({ txid: 'a', kind: 'book', text: 'Mounce', ...row });
    await keepRequest({ txid: 'b', kind: 'tutor-ask', summary: 'Olive Tree', ...row });
    await keepRequest({ txid: 'c', kind: 'book', text: 'Black', ...row, sentAt: 2 });
    expect((await listAskedBooks()).map((r) => r.text)).toEqual(['Black', 'Mounce']);
  });
});

describe('sending', () => {
  it('leaves a request waiting when the mill cannot be reached, with the reason', async () => {
    submit.mockRejectedValue(new TutorError('unreachable', 'down'));
    await askForBook({ title: 'Mounce' });
    expect((await listWaitingBooks()).map((w) => w.title)).toEqual(['Mounce']);
    expect(bookSending()).toEqual({ sending: false, problem: { failure: 'unreachable', detail: 'down' } });
  });

  it('forgets a request once its grist is out, even if the receipt then fails, so it is never sent twice', async () => {
    submit.mockImplementation(async (_, options) => {
      options?.onSent?.();
      throw new TutorError('no-answer', 'no receipt');
    });
    await askForBook({ title: 'Mounce' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(await listWaitingBooks()).toEqual([]);
    await sendWaitingBooks();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(bookSending().problem).toBeNull();
  });

  it('sends nothing while the phone is offline and everything once it is not', async () => {
    submit.mockImplementation(async (_, options) => options?.onSent?.());
    const onLine = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    await askForBook({ title: 'Mounce' });
    await askForBook({ title: 'Black' });
    expect(submit).not.toHaveBeenCalled();
    expect(await listWaitingBooks()).toHaveLength(2);
    onLine.mockReturnValue(true);
    await sendWaitingBooks();
    expect(submit.mock.calls.map(([request]) => request)).toEqual([
      { kind: 'book', title: 'Mounce', app_version: __APP_VERSION__ },
      { kind: 'book', title: 'Black', app_version: __APP_VERSION__ },
    ]);
    expect(await listWaitingBooks()).toEqual([]);
  });

  it('stops at the first that fails, so the order of his asks is kept', async () => {
    submit.mockRejectedValue(new TutorError('unreachable', 'down'));
    await queueBook({ title: 'Mounce' });
    await queueBook({ title: 'Black' });
    await sendWaitingBooks();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(await listWaitingBooks()).toHaveLength(2);
  });
});

describe('a book already asked', () => {
  const sent = { app_version: 'v', sentAt: Date.UTC(2026, 9, 21, 9) };

  it('is found by its Resource ID, whatever the title says now', async () => {
    await keepRequest({ txid: 'a', kind: 'book', text: 'Romans', resource: 'LLS:LENSKIROM', ...sent });
    expect(await askedBefore({ title: 'Lenski on Romans', resource: 'LLS:LENSKIROM' })).toEqual({ at: sent.sentAt });
    expect(await askedBefore({ title: 'Romans', resource: 'LLS:OTHER' })).toBeUndefined();
  });

  it('is found by its title when there is no Resource ID, ignoring case, spaces and marks, also among the old kinds', async () => {
    await keepRequest({ txid: 'a', kind: 'grammar-book', text: 'Mounce, Basics of Biblical Greek', ...sent });
    await keepRequest({ txid: 'b', kind: 'devotional', text: 'Spurgeon, Faith\u2019s Checkbook', ...sent, sentAt: 5 });
    expect(await askedBefore({ title: '  mounce basics of  biblical greek. ' })).toEqual({ at: sent.sentAt });
    expect(await askedBefore({ title: "spurgeon, faith's checkbook" })).toEqual({ at: 5 });
    expect(await askedBefore({ title: 'Black' })).toBeUndefined();
  });

  it('is found while it still waits to go', async () => {
    await queueBook({ title: 'Black, Learn to Read New Testament Greek' }, 7);
    expect(await askedBefore({ title: 'black learn to read new testament greek' })).toEqual({ at: 7 });
  });

  it('is not found among asks that were not books', async () => {
    await keepRequest({ txid: 'a', kind: 'tutor-ask', summary: 'Mounce', ...sent });
    await keepRequest({ txid: 'b', kind: 'text', text: 'Mounce', ...sent });
    expect(await askedBefore({ title: 'Mounce' })).toBeUndefined();
  });
});

describe('the one library request', () => {
  it('is remembered with the day, the catalogue version and how many books it named', async () => {
    expect(await libraryAsked()).toBeUndefined();
    await keepLibraryAsked({ at: 5, version: '2026-10-22', books: 412 });
    expect(await libraryAsked()).toEqual({ at: 5, version: '2026-10-22', books: 412 });
  });

  it('reads a damaged note as none', async () => {
    await db.meta.put({ key: 'libraryAsked', value: '{no' });
    expect(await libraryAsked()).toBeUndefined();
  });
});
